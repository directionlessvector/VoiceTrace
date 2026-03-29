"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anomalies = exports.severityEnum = exports.anomalyTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const voice_1 = require("./voice");
const ledger_1 = require("./ledger");
const stock_1 = require("./stock");
exports.anomalyTypeEnum = (0, pg_core_1.pgEnum)("anomaly_type", [
    "duplicate_entry",
    "unusual_amount",
    "large_variance",
    "stock_mismatch",
    "pattern_break",
]);
exports.severityEnum = (0, pg_core_1.pgEnum)("severity", [
    "low",
    "medium",
    "high",
]);
exports.anomalies = (0, pg_core_1.pgTable)("anomalies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    voiceSessionId: (0, pg_core_1.uuid)("voice_session_id").references(() => voice_1.voiceSessions.id, { onDelete: "set null" }),
    ledgerEntryId: (0, pg_core_1.uuid)("ledger_entry_id").references(() => ledger_1.ledgerEntries.id, { onDelete: "set null" }),
    stockMovementId: (0, pg_core_1.uuid)("stock_movement_id").references(() => stock_1.stockMovements.id, { onDelete: "set null" }),
    anomalyType: (0, exports.anomalyTypeEnum)("anomaly_type").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    severity: (0, exports.severityEnum)("severity").notNull(),
    isResolved: (0, pg_core_1.boolean)("is_resolved").default(false).notNull(),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
