import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { adminUsers } from "./users";

export const activityLogs = pgTable("activity_logs", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  adminUserId:  uuid("admin_user_id").references(() => adminUsers.id, { onDelete: "set null" }),

  // e.g. "voice_session_created", "ledger_entry_added", "alert_sent"
  action:       text("action").notNull(),
  metadata:     jsonb("metadata"),

  createdAt:    timestamp("created_at").defaultNow().notNull(),
});
