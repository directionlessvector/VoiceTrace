import { pgTable, uuid, text, integer, jsonb, timestamp, pgEnum, numeric } from "drizzle-orm/pg-core";
import { users } from "./users";

export const sessionTypeEnum = pgEnum("session_type", [
  "ledger_entry",
  "ledger_upload",
  "stock_update",
  "customer_update",
  "query",
  "general",
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "transcribed",
  "parsed",
  "failed",
]);

export const voiceSessions = pgTable("voice_sessions", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  userId:              uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Cloudinary — full asset record
  cloudinaryUrl:       text("cloudinary_url").notNull(),
  cloudinaryPublicId:  text("cloudinary_public_id").notNull(),
  cloudinaryFormat:    text("cloudinary_format"),           // webm, mp3, mp4…
  cloudinaryVersion:   text("cloudinary_version"),          // asset version string
  mimeType:            text("mime_type"),                   // audio/webm, audio/mp4
  fileSizeBytes:       integer("file_size_bytes"),          // for display in history tab
  durationSeconds:     integer("duration_seconds"),
  recordedAt:          timestamp("recorded_at"),            // when user actually recorded

  // Transcription
  transcriptionRaw:    text("transcription_raw"),
  transcriptionClean:  text("transcription_clean"),
  languageDetected:    text("language_detected"),

  sessionType:         sessionTypeEnum("session_type").default("general").notNull(),
  processingStatus:    processingStatusEnum("processing_status").default("pending").notNull(),

  // [{start_sec, end_sec, label, entity}] — drives Voice Playback with Highlights
  highlights:          jsonb("highlights"),

  createdAt:           timestamp("created_at").defaultNow().notNull(),
  updatedAt:           timestamp("updated_at").defaultNow().notNull(),
});

// ─── Voice Flagged Anomalies ──────────────────────────────────────────────────

export const flagTypeEnum = pgEnum("flag_type", [
  "wrong_amount",
  "wrong_item",
  "wrong_party",
  "duplicate_detected",
  "unclear_speech",
  "unit_mismatch",
  "date_mismatch",
]);

export const correctionStatusEnum = pgEnum("correction_status", [
  "pending",
  "accepted",
  "rejected",
  "manually_corrected",
]);

export const voiceFlaggedAnomalies = pgTable("voice_flagged_anomalies", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  voiceSessionId:       uuid("voice_session_id").notNull().references(() => voiceSessions.id, { onDelete: "cascade" }),
  userId:               uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  flagType:             flagTypeEnum("flag_type").notNull(),
  originalText:         text("original_text").notNull(),    // exact snippet from transcription
  startSec:             numeric("start_sec", { precision: 8, scale: 3 }), // timestamp in audio
  endSec:               numeric("end_sec", { precision: 8, scale: 3 }),

  suggestedCorrection:  text("suggested_correction"),       // system's suggested fix
  correctedValue:       text("corrected_value"),            // user's confirmed correction
  correctionStatus:     correctionStatusEnum("correction_status").default("pending").notNull(),

  resolvedAt:           timestamp("resolved_at"),
  createdAt:            timestamp("created_at").defaultNow().notNull(),
  updatedAt:            timestamp("updated_at").defaultNow().notNull(),
});
