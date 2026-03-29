"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockMovements = exports.movementTypeEnum = exports.stock_items = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const voice_1 = require("./voice");
const ledger_1 = require("./ledger");
exports.stock_items = (0, pg_core_1.pgTable)("stock_items", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    sku: (0, pg_core_1.text)("sku"),
    unit: (0, pg_core_1.text)("unit").notNull(), // kg, litre, piece, box …
    currentQuantity: (0, pg_core_1.numeric)("current_quantity", { precision: 12, scale: 3 }).default("0").notNull(),
    lowStockThreshold: (0, pg_core_1.numeric)("low_stock_threshold", { precision: 12, scale: 3 }), // triggers alert
    pricePerUnit: (0, pg_core_1.numeric)("price_per_unit", { precision: 12, scale: 2 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.movementTypeEnum = (0, pg_core_1.pgEnum)("movement_type", [
    "in",
    "out",
    "adjustment",
]);
exports.stockMovements = (0, pg_core_1.pgTable)("stock_movements", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    stockItemId: (0, pg_core_1.uuid)("stock_item_id").notNull().references(() => exports.stock_items.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    voiceSessionId: (0, pg_core_1.uuid)("voice_session_id").references(() => voice_1.voiceSessions.id, { onDelete: "set null" }),
    ledgerEntryId: (0, pg_core_1.uuid)("ledger_entry_id").references(() => ledger_1.ledgerEntries.id, { onDelete: "set null" }),
    movementType: (0, exports.movementTypeEnum)("movement_type").notNull(),
    quantity: (0, pg_core_1.numeric)("quantity", { precision: 12, scale: 3 }).notNull(),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
