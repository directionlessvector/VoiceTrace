import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const alertTypeEnum = pgEnum("alert_type", [
  "low_stock",
  "anomaly_detected",
  "payment_due",
  "weather_advisory",
  "pattern_break",
  "vendor_score_change",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "info",
  "warning",
  "critical",
]);

export const alerts = pgTable("alerts", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  alertType:      alertTypeEnum("alert_type").notNull(),
  title:          text("title").notNull(),
  body:           text("body").notNull(),

  // Polymorphic reference — e.g. referenceType="stock_item", referenceId=<uuid>
  referenceId:    uuid("reference_id"),
  referenceType:  text("reference_type"),

  severity:       alertSeverityEnum("alert_severity").default("info").notNull(),
  isRead:         boolean("is_read").default(false).notNull(),

  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
});

export const notificationChannelEnum = pgEnum("notification_channel", [
  "sms",
  "whatsapp",
  "dashboard",
  "push_pwa",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
]);

export const notifications = pgTable("notifications", {
  id:                uuid("id").primaryKey().defaultRandom(),
  userId:            uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  alertId:           uuid("alert_id").references(() => alerts.id, { onDelete: "set null" }),

  channel:           notificationChannelEnum("channel").notNull(),
  messageBody:       text("message_body").notNull(),
  status:            notificationStatusEnum("status").default("pending").notNull(),
  providerMessageId: text("provider_message_id"),    // ID returned by Twilio / WhatsApp API

  sentAt:            timestamp("sent_at"),
  createdAt:         timestamp("created_at").defaultNow().notNull(),
});
