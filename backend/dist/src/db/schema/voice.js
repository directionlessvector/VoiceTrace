"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceFlaggedAnomalies = exports.correctionStatusEnum = exports.flagTypeEnum = exports.voiceSessions = exports.processingStatusEnum = exports.sessionTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.sessionTypeEnum = (0, pg_core_1.pgEnum)("session_type", [
    "ledger_entry",
    "ledger_upload",
    "stock_update",
    "customer_update",
    "query",
    "general",
]);
exports.processingStatusEnum = (0, pg_core_1.pgEnum)("processing_status", [
    "pending",
    "transcribed",
    "parsed",
    "failed",
]);
exports.voiceSessions = (0, pg_core_1.pgTable)("voice_sessions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    // Cloudinary — full asset record
    cloudinaryUrl: (0, pg_core_1.text)("cloudinary_url").notNull(),
    cloudinaryPublicId: (0, pg_core_1.text)("cloudinary_public_id").notNull(),
    cloudinaryFormat: (0, pg_core_1.text)("cloudinary_format"), // webm, mp3, mp4…
    cloudinaryVersion: (0, pg_core_1.text)("cloudinary_version"), // asset version string
    mimeType: (0, pg_core_1.text)("mime_type"), // audio/webm, audio/mp4
    fileSizeBytes: (0, pg_core_1.integer)("file_size_bytes"), // for display in history tab
    durationSeconds: (0, pg_core_1.integer)("duration_seconds"),
    recordedAt: (0, pg_core_1.timestamp)("recorded_at"), // when user actually recorded
    // Transcription
    transcriptionRaw: (0, pg_core_1.text)("transcription_raw"),
    transcriptionClean: (0, pg_core_1.text)("transcription_clean"),
    languageDetected: (0, pg_core_1.text)("language_detected"),
    sessionType: (0, exports.sessionTypeEnum)("session_type").default("general").notNull(),
    processingStatus: (0, exports.processingStatusEnum)("processing_status").default("pending").notNull(),
    // [{start_sec, end_sec, label, entity}] — drives Voice Playback with Highlights
    highlights: (0, pg_core_1.jsonb)("highlights"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ─── Voice Flagged Anomalies ──────────────────────────────────────────────────
exports.flagTypeEnum = (0, pg_core_1.pgEnum)("flag_type", [
    "wrong_amount",
    "wrong_item",
    "wrong_party",
    "duplicate_detected",
    "unclear_speech",
    "unit_mismatch",
    "date_mismatch",
]);
exports.correctionStatusEnum = (0, pg_core_1.pgEnum)("correction_status", [
    "pending",
    "accepted",
    "rejected",
    "manually_corrected",
]);
exports.voiceFlaggedAnomalies = (0, pg_core_1.pgTable)("voice_flagged_anomalies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    voiceSessionId: (0, pg_core_1.uuid)("voice_session_id").notNull().references(() => exports.voiceSessions.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    flagType: (0, exports.flagTypeEnum)("flag_type").notNull(),
    originalText: (0, pg_core_1.text)("original_text").notNull(), // exact snippet from transcription
    startSec: (0, pg_core_1.numeric)("start_sec", { precision: 8, scale: 3 }), // timestamp in audio
    endSec: (0, pg_core_1.numeric)("end_sec", { precision: 8, scale: 3 }),
    suggestedCorrection: (0, pg_core_1.text)("suggested_correction"), // system's suggested fix
    correctedValue: (0, pg_core_1.text)("corrected_value"), // user's confirmed correction
    correctionStatus: (0, exports.correctionStatusEnum)("correction_status").default("pending").notNull(),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
