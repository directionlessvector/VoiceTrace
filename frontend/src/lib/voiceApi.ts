export type ConfidenceFlag = "high" | "medium" | "low";

export type StructuredLine = {
  label: string;
  amount: number;
  quantity?: number;
  unit?: string;
  currency: string;
  isApproximate: boolean;
  confidence: ConfidenceFlag;
  sourceText?: string;
};

export type VoiceProcessResponse = {
  ok: boolean;
  transcript: string;
  languageDetected: string;
  structured: {
    items: StructuredLine[];
    expenses: StructuredLine[];
    earnings: StructuredLine[];
    totals: {
      expenseTotal: number;
      earningsTotal: number;
      net: number;
    };
    notes: string[];
  };
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function processVoiceAudio(blob: Blob, filename = "voice.webm"): Promise<VoiceProcessResponse> {
  const form = new FormData();
  form.append("audio", blob, filename);

  const response = await fetch(`${API_BASE_URL}/voice/process`, {
    method: "POST",
    body: form,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || "Failed to process voice audio");
  }

  return payload as VoiceProcessResponse;
}
