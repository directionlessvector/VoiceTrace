import { pgTable, uuid, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { voiceSessions } from "./voice";
import { ledgerEntries } from "./ledger";

export const stock_items = pgTable("stock_items", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  userId:              uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  name:                text("name").notNull(),
  sku:                 text("sku"),
  unit:                text("unit").notNull(),                                    // kg, litre, piece, box …
  currentQuantity:     numeric("current_quantity", { precision: 12, scale: 3 }).default("0").notNull(),
  lowStockThreshold:   numeric("low_stock_threshold", { precision: 12, scale: 3 }),  // triggers alert
  pricePerUnit:        numeric("price_per_unit", { precision: 12, scale: 2 }),

  createdAt:           timestamp("created_at").defaultNow().notNull(),
  updatedAt:           timestamp("updated_at").defaultNow().notNull(),
});

export const movementTypeEnum = pgEnum("movement_type", [
  "in",
  "out",
  "adjustment",
]);

export const stockMovements = pgTable("stock_movements", {
  id:              uuid("id").primaryKey().defaultRandom(),
  stockItemId:     uuid("stock_item_id").notNull().references(() => stock_items.id, { onDelete: "cascade" }),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  voiceSessionId:  uuid("voice_session_id").references(() => voiceSessions.id, { onDelete: "set null" }),
  ledgerEntryId:   uuid("ledger_entry_id").references(() => ledgerEntries.id, { onDelete: "set null" }),

  movementType:    movementTypeEnum("movement_type").notNull(),
  quantity:        numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  notes:           text("notes"),

  createdAt:       timestamp("created_at").defaultNow().notNull(),
});
