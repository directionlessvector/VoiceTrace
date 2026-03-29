"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVoiceSession = createVoiceSession;
exports.getVoiceSession = getVoiceSession;
exports.listUserVoiceSessions = listUserVoiceSessions;
exports.updateTranscription = updateTranscription;
exports.updateProcessingStatus = updateProcessingStatus;
exports.deleteVoiceSession = deleteVoiceSession;
exports.createFlaggedAnomaly = createFlaggedAnomaly;
exports.getFlaggedAnomaliesBySession = getFlaggedAnomaliesBySession;
exports.getPendingFlagsByUser = getPendingFlagsByUser;
exports.resolveFlag = resolveFlag;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
// ─── Voice Sessions ───────────────────────────────────────────────────────────
async function createVoiceSession(data) {
    const [session] = await client_1.db.insert(schema_1.voiceSessions).values(data).returning();
    return session;
}
async function getVoiceSession(id) {
    const [session] = await client_1.db
        .select()
        .from(schema_1.voiceSessions)
        .where((0, drizzle_orm_1.eq)(schema_1.voiceSessions.id, id));
    return session ?? null;
}
// All voice sessions for a user — the "voice chat history" tab
async function listUserVoiceSessions(userId) {
    return client_1.db
        .select({
        id: schema_1.voiceSessions.id,
        cloudinaryUrl: schema_1.voiceSessions.cloudinaryUrl,
        cloudinaryFormat: schema_1.voiceSessions.cloudinaryFormat,
        mimeType: schema_1.voiceSessions.mimeType,
        fileSizeBytes: schema_1.voiceSessions.fileSizeBytes,
        durationSeconds: schema_1.voiceSessions.durationSeconds,
        recordedAt: schema_1.voiceSessions.recordedAt,
        transcriptionClean: schema_1.voiceSessions.transcriptionClean,
        languageDetected: schema_1.voiceSessions.languageDetected,
        sessionType: schema_1.voiceSessions.sessionType,
        processingStatus: schema_1.voiceSessions.processingStatus,
        highlights: schema_1.voiceSessions.highlights,
        createdAt: schema_1.voiceSessions.createdAt,
    })
        .from(schema_1.voiceSessions)
        .where((0, drizzle_orm_1.eq)(schema_1.voiceSessions.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.voiceSessions.createdAt));
}
// Called after Groq transcription completes
async function updateTranscription(id, data) {
    const [updated] = await client_1.db
        .update(schema_1.voiceSessions)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.voiceSessions.id, id))
        .returning();
    return updated ?? null;
}
async function updateProcessingStatus(id, status) {
    const [updated] = await client_1.db
        .update(schema_1.voiceSessions)
        .set({ processingStatus: status, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.voiceSessions.id, id))
        .returning();
    return updated ?? null;
}
async function deleteVoiceSession(id) {
    const [deleted] = await client_1.db
        .delete(schema_1.voiceSessions)
        .where((0, drizzle_orm_1.eq)(schema_1.voiceSessions.id, id))
        .returning();
    return deleted ?? null;
}
// ─── Voice Flagged Anomalies ──────────────────────────────────────────────────
async function createFlaggedAnomaly(data) {
    const [flag] = await client_1.db
        .insert(schema_1.voiceFlaggedAnomalies)
        .values(data)
        .returning();
    return flag;
}
async function getFlaggedAnomaliesBySession(voiceSessionId) {
    return client_1.db
        .select()
        .from(schema_1.voiceFlaggedAnomalies)
        .where((0, drizzle_orm_1.eq)(schema_1.voiceFlaggedAnomalies.voiceSessionId, voiceSessionId))
        .orderBy(schema_1.voiceFlaggedAnomalies.startSec);
}
async function getPendingFlagsByUser(userId) {
    return client_1.db
        .select()
        .from(schema_1.voiceFlaggedAnomalies)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.voiceFlaggedAnomalies.userId, userId), (0, drizzle_orm_1.eq)(schema_1.voiceFlaggedAnomalies.correctionStatus, "pending")))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.voiceFlaggedAnomalies.createdAt));
}
async function resolveFlag(id, data) {
    const [updated] = await client_1.db
        .update(schema_1.voiceFlaggedAnomalies)
        .set({ ...data, resolvedAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.voiceFlaggedAnomalies.id, id))
        .returning();
    return updated ?? null;
}
