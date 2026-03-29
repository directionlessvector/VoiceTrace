"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityLogs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const users_2 = require("./users");
exports.activityLogs = (0, pg_core_1.pgTable)("activity_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => users_1.users.id, { onDelete: "set null" }),
    adminUserId: (0, pg_core_1.uuid)("admin_user_id").references(() => users_2.adminUsers.id, { onDelete: "set null" }),
    // e.g. "voice_session_created", "ledger_entry_added", "alert_sent"
    action: (0, pg_core_1.text)("action").notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
