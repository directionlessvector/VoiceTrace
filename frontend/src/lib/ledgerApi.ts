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

export async function listCurrentUserLedgerEntries(filters?: {
  fromDate?: string;
  toDate?: string;
}): Promise<LedgerEntry[]> {
  const userId = await resolveActiveUserId();
  const params = new URLSearchParams();
  if (filters?.fromDate) params.set("fromDate", filters.fromDate);
  if (filters?.toDate) params.set("toDate", filters.toDate);
  const qs = params.toString();
  return fetchJson<LedgerEntry[]>(`/ledger/user/${userId}${qs ? `?${qs}` : ""}`);
}

export async function getUserLedgerSummary(fromDate?: string, toDate?: string) {
  const userId = await resolveActiveUserId();
  const params = new URLSearchParams();
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);
  return fetchJson<Array<{ entryType: string; total: string; count: string }>>(
    `/ledger/user/${userId}/summary?${params}`
  );
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
