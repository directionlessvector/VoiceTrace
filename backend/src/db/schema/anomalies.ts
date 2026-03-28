import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { voiceSessions } from "./voice";
import { ledgerEntries } from "./ledger";
import { stockMovements } from "./stock";

export const anomalyTypeEnum = pgEnum("anomaly_type", [
  "duplicate_entry",
  "unusual_amount",
  "large_variance",
  "stock_mismatch",
  "pattern_break",
]);

export const severityEnum = pgEnum("severity", [
  "low",
  "medium",
  "high",
]);

export const anomalies = pgTable("anomalies", {
  id:                uuid("id").primaryKey().defaultRandom(),
  userId:            uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  voiceSessionId:    uuid("voice_session_id").references(() => voiceSessions.id, { onDelete: "set null" }),
  ledgerEntryId:     uuid("ledger_entry_id").references(() => ledgerEntries.id, { onDelete: "set null" }),
  stockMovementId:   uuid("stock_movement_id").references(() => stockMovements.id, { onDelete: "set null" }),

  anomalyType:       anomalyTypeEnum("anomaly_type").notNull(),
  description:       text("description").notNull(),
  severity:          severityEnum("severity").notNull(),
  isResolved:        boolean("is_resolved").default(false).notNull(),
  resolvedAt:        timestamp("resolved_at"),

  createdAt:         timestamp("created_at").defaultNow().notNull(),
});
