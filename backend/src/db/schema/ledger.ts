import { pgTable, uuid, text, numeric, timestamp, pgEnum, date, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { voiceSessions } from "./voice";

export const entryTypeEnum = pgEnum("entry_type", [
  "sale",
  "purchase",
  "expense",
  "income",
]);

export const entryCategoryEnum = pgEnum("entry_category", [
  "goods",
  "services",
  "salary",
  "rent",
  "utilities",
  "other",
]);

export const entrySourceEnum = pgEnum("entry_source", [
  "voice",
  "ocr",
  "manual",
]);

export const ledgerEntries = pgTable("ledger_entries", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  voiceSessionId:  uuid("voice_session_id").references(() => voiceSessions.id, { onDelete: "set null" }),

  entryType:       entryTypeEnum("entry_type").notNull(),
  amount:          numeric("amount", { precision: 12, scale: 2 }).notNull(),
  quantity:        numeric("quantity", { precision: 12, scale: 3 }),
  unit:            text("unit"),
  itemName:        text("item_name"),
  partyName:       text("party_name"),                 // buyer / seller name
  category:        entryCategoryEnum("entry_category"),
  notes:           text("notes"),

  entryDate:       date("entry_date").notNull(),        // actual business date
  source:          entrySourceEnum("entry_source").default("manual").notNull(),
  ocrRawText:      text("ocr_raw_text"),               // raw OCR output when source='ocr'

  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx:   index("ledger_user_id_idx").on(table.userId),
  userDateIdx: index("ledger_user_date_idx").on(table.userId, table.entryDate),
}));
