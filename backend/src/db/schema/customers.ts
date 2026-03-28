import { pgTable, uuid, text, numeric, timestamp, pgEnum, date } from "drizzle-orm/pg-core";
import { users } from "./users";
import { voiceSessions } from "./voice";

export const customers = pgTable("customers", {
  id:         uuid("id").primaryKey().defaultRandom(),
  userId:     uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),
  phone:      text("phone"),
  address:    text("address"),
  notes:      text("notes"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

export const customerTxnTypeEnum = pgEnum("customer_txn_type", [
  "credit",   // customer owes vendor (gave goods, payment pending)
  "debit",    // vendor owes customer (return / advance)
]);

export const customerLedger = pgTable("customer_ledger", {
  id:              uuid("id").primaryKey().defaultRandom(),
  customerId:      uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  voiceSessionId:  uuid("voice_session_id").references(() => voiceSessions.id, { onDelete: "set null" }),

  txnType:         customerTxnTypeEnum("txn_type").notNull(),
  amount:          numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description:     text("description"),
  txnDate:         date("txn_date").notNull(),

  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
});
