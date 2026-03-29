import { fetchJson, resolveActiveUserId } from "@/lib/backendApi";

export type VoiceFlag = {
  id: string;
  voiceSessionId: string;
  userId: string;
  flagType: "wrong_amount" | "wrong_item" | "wrong_party" | "duplicate_detected" | "unclear_speech" | "unit_mismatch" | "date_mismatch";
  originalText: string;
  suggestedCorrection: string | null;
  correctedValue: string | null;
  correctionStatus: "pending" | "accepted" | "rejected" | "manually_corrected";
  createdAt: string;
  updatedAt: string;
};

export async function listPendingVoiceFlags(): Promise<VoiceFlag[]> {
  const userId = await resolveActiveUserId();
  return fetchJson<VoiceFlag[]>(`/voice/flags/pending/${userId}`);
}

export async function createVoiceFlag(
  voiceSessionId: string,
  data: {
    flagType: VoiceFlag["flagType"];
    originalText: string;
    suggestedCorrection?: string;
  }
): Promise<VoiceFlag> {
  const userId = await resolveActiveUserId();
  return fetchJson<VoiceFlag>(`/voice/${voiceSessionId}/flags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      flagType: data.flagType,
      originalText: data.originalText,
      suggestedCorrection: data.suggestedCorrection,
    }),
  });
}

export async function resolveVoiceFlag(
  flagId: string,
  data: {
    correctionStatus: "accepted" | "rejected" | "manually_corrected";
    correctedValue?: string;
  }
): Promise<VoiceFlag> {
  return fetchJson<VoiceFlag>(`/voice/flags/${flagId}/resolve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
