import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { voiceSessions, voiceFlaggedAnomalies } from "../db/schema";

// ─── Voice Sessions ───────────────────────────────────────────────────────────

export async function createVoiceSession(data: {
  userId: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  cloudinaryFormat?: string;
  cloudinaryVersion?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  recordedAt?: Date;
  sessionType?: "ledger_entry" | "ledger_upload" | "stock_update" | "customer_update" | "query" | "general";
}) {
  const [session] = await db.insert(voiceSessions).values(data).returning();
  return session;
}

export async function getVoiceSession(id: string) {
  const [session] = await db
    .select()
    .from(voiceSessions)
    .where(eq(voiceSessions.id, id));
  return session ?? null;
}

// All voice sessions for a user — the "voice chat history" tab
export async function listUserVoiceSessions(userId: string) {
  return db
    .select({
      id: voiceSessions.id,
      cloudinaryUrl: voiceSessions.cloudinaryUrl,
      cloudinaryFormat: voiceSessions.cloudinaryFormat,
      mimeType: voiceSessions.mimeType,
      fileSizeBytes: voiceSessions.fileSizeBytes,
      durationSeconds: voiceSessions.durationSeconds,
      recordedAt: voiceSessions.recordedAt,
      transcriptionClean: voiceSessions.transcriptionClean,
      languageDetected: voiceSessions.languageDetected,
      sessionType: voiceSessions.sessionType,
      processingStatus: voiceSessions.processingStatus,
      highlights: voiceSessions.highlights,
      createdAt: voiceSessions.createdAt,
    })
    .from(voiceSessions)
    .where(eq(voiceSessions.userId, userId))
    .orderBy(desc(voiceSessions.createdAt));
}

// Called after Groq transcription completes
export async function updateTranscription(
  id: string,
  data: {
    transcriptionRaw: string;
    transcriptionClean: string;
    languageDetected?: string;
    processingStatus: "transcribed" | "parsed" | "failed";
    highlights?: object;
  }
) {
  const [updated] = await db
    .update(voiceSessions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(voiceSessions.id, id))
    .returning();
  return updated ?? null;
}

export async function updateProcessingStatus(
  id: string,
  status: "pending" | "transcribed" | "parsed" | "failed"
) {
  const [updated] = await db
    .update(voiceSessions)
    .set({ processingStatus: status, updatedAt: new Date() })
    .where(eq(voiceSessions.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteVoiceSession(id: string) {
  const [deleted] = await db
    .delete(voiceSessions)
    .where(eq(voiceSessions.id, id))
    .returning();
  return deleted ?? null;
}

// ─── Voice Flagged Anomalies ──────────────────────────────────────────────────

export async function createFlaggedAnomaly(data: {
  voiceSessionId: string;
  userId: string;
  flagType:
    | "wrong_amount"
    | "wrong_item"
    | "wrong_party"
    | "duplicate_detected"
    | "unclear_speech"
    | "unit_mismatch"
    | "date_mismatch";
  originalText: string;
  startSec?: string;
  endSec?: string;
  suggestedCorrection?: string;
}) {
  const [flag] = await db
    .insert(voiceFlaggedAnomalies)
    .values(data)
    .returning();
  return flag;
}

export async function getFlaggedAnomaliesBySession(voiceSessionId: string) {
  return db
    .select()
    .from(voiceFlaggedAnomalies)
    .where(eq(voiceFlaggedAnomalies.voiceSessionId, voiceSessionId))
    .orderBy(voiceFlaggedAnomalies.startSec);
}

export async function getPendingFlagsByUser(userId: string) {
  return db
    .select()
    .from(voiceFlaggedAnomalies)
    .where(
      and(
        eq(voiceFlaggedAnomalies.userId, userId),
        eq(voiceFlaggedAnomalies.correctionStatus, "pending")
      )
    )
    .orderBy(desc(voiceFlaggedAnomalies.createdAt));
}

export async function resolveFlag(
  id: string,
  data: {
    correctionStatus: "accepted" | "rejected" | "manually_corrected";
    correctedValue?: string;
  }
) {
  const [updated] = await db
    .update(voiceFlaggedAnomalies)
    .set({ ...data, resolvedAt: new Date(), updatedAt: new Date() })
    .where(eq(voiceFlaggedAnomalies.id, id))
    .returning();
  return updated ?? null;
}
