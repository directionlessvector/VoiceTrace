import { fetchJson, resolveActiveUserId } from "@/lib/backendApi";

type ConfidenceFlag = "high" | "medium" | "low";

export type OcrLedgerResult = {
  ok: boolean;
  saved: boolean;
  imageUrl: string;
  ocrText: string;
  extractedData: {
    items: Array<{ name: string; quantity: number; price: number; confidence: ConfidenceFlag }>;
    expenses: Array<{ type: string; amount: number; confidence: ConfidenceFlag }>;
    totalEarnings: number;
    notes: string[];
  };
  voiceSessionId: string | null;
};

export async function processLedgerImage(file: File, confirmSave: boolean): Promise<OcrLedgerResult> {
  const userId = await resolveActiveUserId();
  const form = new FormData();
  form.append("image", file);
  form.append("userId", userId);
  form.append("confirmSave", String(confirmSave));

  return fetchJson<OcrLedgerResult>("/ledger-upload/process", {
    method: "POST",
    body: form,
  });
}
