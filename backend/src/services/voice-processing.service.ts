type ConfidenceFlag = "high" | "medium" | "low";

type ParsedLineItem = {
  label: string;
  amount: number;
  quantity?: number;
  unit?: string;
  currency: string;
  isApproximate: boolean;
  confidence: ConfidenceFlag;
  sourceText?: string;
};

export type VoiceStructuredLedger = {
  items: ParsedLineItem[];
  expenses: ParsedLineItem[];
  earnings: ParsedLineItem[];
  totals: {
    expenseTotal: number;
    earningsTotal: number;
    net: number;
  };
  notes: string[];
};

export type VoiceProcessingResult = {
  transcript: string;
  languageDetected: string;
  structured: VoiceStructuredLedger;
};

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const APPROX_TERMS = /\b(approx|approximately|around|about|roughly|lagbhag|karib|करीब|लगभग|almost|near)\b/i;
const GROQ_LEDGER_MODELS = [
  process.env.GROQ_LEDGER_MODEL,
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
].filter((v): v is string => Boolean(v && v.trim()));

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return key;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeConfidence(value: unknown): ConfidenceFlag {
  const v = String(value ?? "").toLowerCase();
  if (v === "high" || v === "medium" || v === "low") return v;
  return "medium";
}

function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch?.[1] ?? trimmed;
  return JSON.parse(candidate);
}

function sanitizeLines(lines: unknown, transcript: string): ParsedLineItem[] {
  if (!Array.isArray(lines)) return [];
  return lines
    .map((line): ParsedLineItem | null => {
      if (!line || typeof line !== "object") return null;
      const candidate = line as Record<string, unknown>;
      const label = String(candidate.label ?? candidate.description ?? "").trim();
      if (!label) return null;

      const amount = toNumber(candidate.amount);
      const sourceText = String(candidate.sourceText ?? "").trim();
      const approxHint = Boolean(candidate.isApproximate) || APPROX_TERMS.test(sourceText) || APPROX_TERMS.test(transcript);

      return {
        label,
        amount,
        quantity: toNumber(candidate.quantity) || undefined,
        unit: candidate.unit ? String(candidate.unit) : undefined,
        currency: String(candidate.currency ?? "INR").toUpperCase(),
        isApproximate: approxHint,
        confidence: normalizeConfidence(candidate.confidence),
        sourceText: sourceText || undefined,
      };
    })
    .filter((v): v is ParsedLineItem => v !== null);
}

function buildFallbackStructured(transcript: string): VoiceStructuredLedger {
  const amounts = [...transcript.matchAll(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)/gi)].map((m) => Number(m[1]));
  const midpoint = Math.floor(amounts.length / 2);
  const expenseTotal = amounts.slice(0, midpoint).reduce((a, b) => a + b, 0);
  const earningsTotal = amounts.slice(midpoint).reduce((a, b) => a + b, 0);

  return {
    items: [],
    expenses: [],
    earnings: [],
    totals: {
      expenseTotal,
      earningsTotal,
      net: earningsTotal - expenseTotal,
    },
    notes: ["Fallback parse used because model output was not valid JSON."],
  };
}

async function transcribeWithWhisper(buffer: Buffer, filename: string, mimeType: string): Promise<{ text: string; language: string }> {
  const apiKey = getGroqApiKey();
  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || "audio/webm" });

  form.append("model", "whisper-large-v3-turbo");
  form.append("file", blob, filename || "voice.webm");
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");

  const response = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Whisper transcription failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as { text?: string; language?: string };
  return {
    text: payload.text?.trim() ?? "",
    language: payload.language ?? "unknown",
  };
}

async function extractStructuredLedger(transcript: string): Promise<VoiceStructuredLedger> {
  const apiKey = getGroqApiKey();
  const systemPrompt = [
    "You extract accounting data from spoken notes.",
    "The speaker may mix Hindi and English (Hinglish).",
    "Handle uncertain values and approximations.",
    "Return STRICT JSON only with this shape:",
    "{",
    '  "items": [{"label":"", "amount":0, "quantity":0, "unit":"", "currency":"INR", "isApproximate":false, "confidence":"high|medium|low", "sourceText":""}],',
    '  "expenses": [{"label":"", "amount":0, "currency":"INR", "isApproximate":false, "confidence":"high|medium|low", "sourceText":""}],',
    '  "earnings": [{"label":"", "amount":0, "currency":"INR", "isApproximate":false, "confidence":"high|medium|low", "sourceText":""}],',
    '  "notes": ["optional string notes about ambiguity"]',
    "}",
    "Guidelines:",
    "- Infer expenses vs earnings by meaning.",
    "- Keep unknown amount as 0 with low confidence.",
    "- Mark isApproximate true when words imply rough value (e.g. around, lagbhag, karib, approx).",
    "- Never include markdown.",
  ].join("\n");

  const modelErrors: string[] = [];
  let content = "{}";
  let resolvedModel: string | null = null;

  for (const model of GROQ_LEDGER_MODELS) {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      modelErrors.push(`${model}: ${response.status} ${detail}`);
      continue;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    content = payload.choices?.[0]?.message?.content ?? "{}";
    resolvedModel = model;
    break;
  }

  if (!resolvedModel) {
    throw new Error(`Ledger extraction failed for all models. ${modelErrors.join(" | ")}`);
  }

  try {
    const parsed = parseModelJson(content) as Record<string, unknown>;
    const items = sanitizeLines(parsed.items, transcript);
    const expenses = sanitizeLines(parsed.expenses, transcript);
    const earnings = sanitizeLines(parsed.earnings, transcript);
    const notes = Array.isArray(parsed.notes) ? parsed.notes.map((n) => String(n)) : [];

    const expenseTotal = expenses.reduce((sum, row) => sum + row.amount, 0);
    const earningsTotal = earnings.reduce((sum, row) => sum + row.amount, 0);

    return {
      items,
      expenses,
      earnings,
      totals: {
        expenseTotal,
        earningsTotal,
        net: earningsTotal - expenseTotal,
      },
      notes,
    };
  } catch {
    return buildFallbackStructured(transcript);
  }
}

export async function processVoiceAudio(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<VoiceProcessingResult> {
  const transcription = await transcribeWithWhisper(input.buffer, input.filename, input.mimeType);
  if (!transcription.text) {
    throw new Error("No transcript text returned by Whisper");
  }

  const structured = await extractStructuredLedger(transcription.text);
  return {
    transcript: transcription.text,
    languageDetected: transcription.language,
    structured,
  };
}
