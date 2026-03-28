type ConfidenceFlag = "high" | "medium" | "low";

type ConfidenceSignals = {
  item_detected: number;
  quantity_detected: number;
  price_detected: number;
  numeric_presence: number;
  monetary_presence: number;
  transaction_detected: number;
  ambiguity_penalty: number;
  llm_confidence: number;
};

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
const FILLER_TERMS = /\b(around|approx(?:imately)?|some|thoda|lagbhag|karib|about|roughly)\b/gi;
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

function confidenceToScore(value: ConfidenceFlag): number {
  if (value === "high") return 0.9;
  if (value === "medium") return 0.65;
  return 0.4;
}

function scoreToConfidence(score: number): ConfidenceFlag {
  if (score >= 0.78) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

const SIGNAL_WEIGHTS = {
  item_detected: 0.19,
  quantity_detected: 0.15,
  price_detected: 0.18,
  numeric_presence: 0.12,
  monetary_presence: 0.12,
  transaction_detected: 0.1,
  llm_confidence: 0.14,
  ambiguity_penalty: 0.2,
} as const;

function computeConfidenceScore(signals: ConfidenceSignals): number {
  const positive =
    signals.item_detected * SIGNAL_WEIGHTS.item_detected +
    signals.quantity_detected * SIGNAL_WEIGHTS.quantity_detected +
    signals.price_detected * SIGNAL_WEIGHTS.price_detected +
    signals.numeric_presence * SIGNAL_WEIGHTS.numeric_presence +
    signals.monetary_presence * SIGNAL_WEIGHTS.monetary_presence +
    signals.transaction_detected * SIGNAL_WEIGHTS.transaction_detected +
    signals.llm_confidence * SIGNAL_WEIGHTS.llm_confidence;

  const penalty = signals.ambiguity_penalty * SIGNAL_WEIGHTS.ambiguity_penalty;
  return Math.max(0.1, Math.min(0.98, positive - penalty));
}

function calculateTranscriptionClarity(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0.2;

  const brokenMarkers = (cleaned.match(/[?]{2,}|\uFFFD|\[inaudible\]|\[noise\]/gi) || []).length;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const shortBrokenTokens = tokens.filter((t) => t.length <= 2 && !/\d/.test(t)).length;
  const alphaChars = (cleaned.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
  const validChars = (cleaned.match(/[a-zA-Z\u0900-\u097F\d\s.,₹-]/g) || []).length;
  const charQuality = alphaChars > 0 ? validChars / cleaned.length : 0.5;

  let score = 0.85;
  score -= Math.min(0.35, brokenMarkers * 0.12);
  score -= Math.min(0.25, (shortBrokenTokens / Math.max(tokens.length, 1)) * 0.9);
  score -= Math.min(0.2, Math.max(0, 0.9 - charQuality));

  return Math.max(0.15, Math.min(0.95, score));
}

function fillerPenalty(text: string): number {
  const matches = text.match(FILLER_TERMS) || [];
  if (matches.length >= 4) return 0.22;
  if (matches.length >= 2) return 0.12;
  if (matches.length === 1) return 0.05;
  return 0;
}

function hasTransactionMarkers(text: string): boolean {
  return /(sold|sale|income|earned|expense|spent|purchase|bought|becha|kamaya|kharcha|udhaar|rent|utilities|transport)/i.test(text);
}

function monetarySignal(text: string, amount: number): number {
  if (amount > 0) return 1;
  if (/(₹|\binr\b|\brs\.?\b|rupees?)/i.test(text)) return 0.85;
  return 0.3;
}

function numericSignal(text: string): number {
  const numericTokens = text.match(/\d+(?:\.\d+)?/g) || [];
  if (numericTokens.length >= 2) return 1;
  if (numericTokens.length === 1) return 0.65;
  return 0.2;
}

function ambiguityPenalty(text: string, clarityScore: number): number {
  const filler = fillerPenalty(text);
  const brokenMarkers = (text.match(/[?]{2,}|\[inaudible\]|\[noise\]/gi) || []).length;
  const brokenPenalty = Math.min(0.4, brokenMarkers * 0.1);
  const clarityPenalty = Math.max(0, 1 - clarityScore);
  return Math.max(0, Math.min(1, filler + brokenPenalty + clarityPenalty * 0.45));
}

function applyVoiceConfidenceRules(
  lines: ParsedLineItem[],
  transcript: string,
  transcriptionClarityScore: number
): ParsedLineItem[] {
  return lines.map((line) => {
    const contextText = `${transcript} ${line.sourceText ?? ""}`;

    const hasName = Boolean(line.label.trim());
    const hasQty = typeof line.quantity === "number" && line.quantity > 0;
    const hasPrice = line.amount > 0;
    const qtyPriceConsistency = hasQty && hasPrice
      ? (() => {
          const perUnit = line.amount / Math.max(0.0001, line.quantity!);
          if (!Number.isFinite(perUnit) || perUnit <= 0) return 0.2;
          if (perUnit > 100000) return 0.35;
          return 1;
        })()
      : hasQty || hasPrice
        ? 0.55
        : 0.15;

    const baseSignals: ConfidenceSignals = {
      item_detected: hasName ? 1 : 0,
      quantity_detected: hasQty ? 1 : 0,
      price_detected: hasPrice ? 1 : 0,
      numeric_presence: numericSignal(contextText),
      monetary_presence: monetarySignal(contextText, line.amount),
      transaction_detected: hasTransactionMarkers(contextText) ? 1 : 0.35,
      ambiguity_penalty: ambiguityPenalty(contextText, transcriptionClarityScore) + (line.isApproximate ? 0.12 : 0),
      llm_confidence: confidenceToScore(line.confidence),
    };

    // Blend numeric consistency into numeric presence so qty x price coherence matters.
    baseSignals.numeric_presence = Math.max(0, Math.min(1, (baseSignals.numeric_presence * 0.55) + (qtyPriceConsistency * 0.45)));

    const finalScore = computeConfidenceScore(baseSignals);

    return {
      ...line,
      confidence: scoreToConfidence(finalScore),
    };
  });
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

async function transcribeWithWhisper(buffer: Buffer, filename: string, mimeType: string): Promise<{ text: string; language: string; clarityScore: number }> {
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
  const text = payload.text?.trim() ?? "";
  return {
    text,
    language: payload.language ?? "unknown",
    clarityScore: calculateTranscriptionClarity(text),
  };
}

async function extractStructuredLedger(transcript: string, transcriptionClarityScore: number): Promise<VoiceStructuredLedger> {
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
    const items = applyVoiceConfidenceRules(sanitizeLines(parsed.items, transcript), transcript, transcriptionClarityScore);
    const expenses = applyVoiceConfidenceRules(sanitizeLines(parsed.expenses, transcript), transcript, transcriptionClarityScore);
    const earnings = applyVoiceConfidenceRules(sanitizeLines(parsed.earnings, transcript), transcript, transcriptionClarityScore);
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

  const structured = await extractStructuredLedger(transcription.text, transcription.clarityScore);
  return {
    transcript: transcription.text,
    languageDetected: transcription.language,
    structured,
  };
}
