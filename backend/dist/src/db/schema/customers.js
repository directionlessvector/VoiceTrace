"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerLedger = exports.customerTxnTypeEnum = exports.customers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const voice_1 = require("./voice");
exports.customers = (0, pg_core_1.pgTable)("customers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    address: (0, pg_core_1.text)("address"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.customerTxnTypeEnum = (0, pg_core_1.pgEnum)("customer_txn_type", [
    "credit", // customer owes vendor (gave goods, payment pending)
    "debit", // vendor owes customer (return / advance)
]);
exports.customerLedger = (0, pg_core_1.pgTable)("customer_ledger", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    customerId: (0, pg_core_1.uuid)("customer_id").notNull().references(() => exports.customers.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    voiceSessionId: (0, pg_core_1.uuid)("voice_session_id").references(() => voice_1.voiceSessions.id, { onDelete: "set null" }),
    txnType: (0, exports.customerTxnTypeEnum)("txn_type").notNull(),
    amount: (0, pg_core_1.numeric)("amount", { precision: 12, scale: 2 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    txnDate: (0, pg_core_1.date)("txn_date").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
