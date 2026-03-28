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
  cloudinary_url?: string;
  voiceSessionId?: string;
  transcription?: string;
  extractedData?: {
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

import { fetchJson, getApiBaseUrl, resolveActiveUserId, getStoredToken } from "@/lib/backendApi";

const API_BASE_URL = getApiBaseUrl();

export type StartVoiceCallResponse = {
  ok: boolean;
  callSid: string;
  status?: string;
  to?: string;
  from?: string;
};

export async function processVoiceAudio(blob: Blob, filename = "voice.webm"): Promise<VoiceProcessResponse> {
  const userId = await resolveActiveUserId();
  const form = new FormData();
  form.append("audio", blob, filename);
  form.append("userId", userId);
  form.append("recordedAt", new Date().toISOString());

  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/voice/process`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || "Failed to process voice audio");
  }

  return payload as VoiceProcessResponse;
}

export async function startVoiceAssistantCall(to: string): Promise<StartVoiceCallResponse> {
  const userId = await resolveActiveUserId();
  return fetchJson<StartVoiceCallResponse>("/voice/call/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, userId }),
  });
}
