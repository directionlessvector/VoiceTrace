import { fetchJson, resolveActiveUserId } from "@/lib/backendApi";

export type LedgerEntry = {
  id: string;
  voiceSessionId: string | null;
  entryType: "sale" | "purchase" | "expense" | "income";
  amount: string;
  quantity: string | null;
  unit: string | null;
  itemName: string | null;
  notes: string | null;
  entryDate: string;
  source: "voice" | "ocr" | "manual";
};

export type VoiceSession = {
  id: string;
  cloudinaryUrl: string;
  transcriptionClean: string | null;
  languageDetected: string | null;
};

export async function listCurrentUserLedgerEntries(): Promise<LedgerEntry[]> {
  const userId = await resolveActiveUserId();
  return fetchJson<LedgerEntry[]>(`/ledger/user/${userId}`);
}

export async function getVoiceSessionById(sessionId: string): Promise<VoiceSession> {
  return fetchJson<VoiceSession>(`/voice/${sessionId}`);
}

export async function createVoiceLedgerEntry(data: {
  voiceSessionId: string;
  entryType: "sale" | "expense";
  amount: number;
  quantity?: number;
  unit?: string;
  itemName?: string;
  notes?: string;
  confidence?: "high" | "medium" | "low";
}) {
  const userId = await resolveActiveUserId();
  const today = new Date().toISOString().slice(0, 10);

  const confidenceNote = data.confidence ? `confidence:${data.confidence}` : undefined;
  const mergedNotes = [data.notes, confidenceNote].filter(Boolean).join(" | ") || undefined;

  return fetchJson("/ledger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      voiceSessionId: data.voiceSessionId,
      entryType: data.entryType,
      amount: data.amount.toFixed(2),
      quantity: data.quantity !== undefined ? data.quantity.toString() : undefined,
      unit: data.unit,
      itemName: data.itemName,
      notes: mergedNotes,
      entryDate: today,
      source: "voice",
      category: "other",
    }),
  });
}

export async function updateLedgerEntryById(
  id: string,
  data: Partial<{
    amount: string;
    itemName: string;
    notes: string;
  }>
) {
  return fetchJson<LedgerEntry>(`/ledger/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateVoiceSessionTranscript(sessionId: string, transcript: string) {
  return fetchJson(`/voice/${sessionId}/transcription`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcriptionRaw: transcript,
      transcriptionClean: transcript,
      processingStatus: "parsed",
    }),
  });
}
