"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = exports.notificationStatusEnum = exports.notificationChannelEnum = exports.alerts = exports.alertSeverityEnum = exports.alertTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.alertTypeEnum = (0, pg_core_1.pgEnum)("alert_type", [
    "low_stock",
    "anomaly_detected",
    "payment_due",
    "weather_advisory",
    "pattern_break",
    "vendor_score_change",
]);
exports.alertSeverityEnum = (0, pg_core_1.pgEnum)("alert_severity", [
    "info",
    "warning",
    "critical",
]);
exports.alerts = (0, pg_core_1.pgTable)("alerts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    alertType: (0, exports.alertTypeEnum)("alert_type").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    body: (0, pg_core_1.text)("body").notNull(),
    // Polymorphic reference — e.g. referenceType="stock_item", referenceId=<uuid>
    referenceId: (0, pg_core_1.uuid)("reference_id"),
    referenceType: (0, pg_core_1.text)("reference_type"),
    severity: (0, exports.alertSeverityEnum)("alert_severity").default("info").notNull(),
    isRead: (0, pg_core_1.boolean)("is_read").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.notificationChannelEnum = (0, pg_core_1.pgEnum)("notification_channel", [
    "sms",
    "whatsapp",
    "dashboard",
    "push_pwa",
]);
exports.notificationStatusEnum = (0, pg_core_1.pgEnum)("notification_status", [
    "pending",
    "sent",
    "delivered",
    "failed",
]);
exports.notifications = (0, pg_core_1.pgTable)("notifications", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().references(() => users_1.users.id, { onDelete: "cascade" }),
    alertId: (0, pg_core_1.uuid)("alert_id").references(() => exports.alerts.id, { onDelete: "set null" }),
    channel: (0, exports.notificationChannelEnum)("channel").notNull(),
    messageBody: (0, pg_core_1.text)("message_body").notNull(),
    status: (0, exports.notificationStatusEnum)("status").default("pending").notNull(),
    providerMessageId: (0, pg_core_1.text)("provider_message_id"), // ID returned by Twilio / WhatsApp API
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
