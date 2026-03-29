"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerEntries = exports.entrySourceEnum = exports.entryCategoryEnum = exports.entryTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const voice_1 = require("./voice");
exports.entryTypeEnum = (0, pg_core_1.pgEnum)("entry_type", [
    "sale",
    "purchase",
    "expense",
    "income",
]);
exports.entryCategoryEnum = (0, pg_core_1.pgEnum)("entry_category", [
    "goods",
    "services",
    "salary",
    "rent",
    "utilities",
    "other",
]);
exports.entrySourceEnum = (0, pg_core_1.pgEnum)("entry_source", [
    "voice",
    "ocr",
    "manual",
]);
exports.ledgerEntries = (0, pg_core_1.pgTable)("ledger_entries", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    voiceSessionId: (0, pg_core_1.uuid)("voice_session_id").references(() => voice_1.voiceSessions.id, { onDelete: "set null" }),
    entryType: (0, exports.entryTypeEnum)("entry_type").notNull(),
    amount: (0, pg_core_1.numeric)("amount", { precision: 12, scale: 2 }).notNull(),
    quantity: (0, pg_core_1.numeric)("quantity", { precision: 12, scale: 3 }),
    unit: (0, pg_core_1.text)("unit"),
    itemName: (0, pg_core_1.text)("item_name"),
    partyName: (0, pg_core_1.text)("party_name"), // buyer / seller name
    category: (0, exports.entryCategoryEnum)("entry_category"),
    notes: (0, pg_core_1.text)("notes"),
    entryDate: (0, pg_core_1.date)("entry_date").notNull(), // actual business date
    source: (0, exports.entrySourceEnum)("entry_source").default("manual").notNull(),
    ocrRawText: (0, pg_core_1.text)("ocr_raw_text"), // raw OCR output when source='ocr'
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    userIdIdx: (0, pg_core_1.index)("ledger_user_id_idx").on(table.userId),
    userDateIdx: (0, pg_core_1.index)("ledger_user_date_idx").on(table.userId, table.entryDate),
}));
