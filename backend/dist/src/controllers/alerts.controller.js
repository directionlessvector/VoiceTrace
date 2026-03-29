"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlert = createAlert;
exports.getAlert = getAlert;
exports.listUserAlerts = listUserAlerts;
exports.markAlertRead = markAlertRead;
exports.markAllAlertsRead = markAllAlertsRead;
exports.createNotification = createNotification;
exports.updateNotificationStatus = updateNotificationStatus;
exports.listNotifications = listNotifications;
exports.listPendingNotifications = listPendingNotifications;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
// ─── Alerts ───────────────────────────────────────────────────────────────────
async function createAlert(data) {
    const [alert] = await client_1.db.insert(schema_1.alerts).values(data).returning();
    return alert;
}
async function getAlert(id) {
    const [alert] = await client_1.db.select().from(schema_1.alerts).where((0, drizzle_orm_1.eq)(schema_1.alerts.id, id));
    return alert ?? null;
}
async function listUserAlerts(userId, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.alerts.userId, userId)];
    if (filters?.isRead !== undefined)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.alerts.isRead, filters.isRead));
    if (filters?.alertType)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.alerts.alertType, filters.alertType));
    if (filters?.severity)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.alerts.severity, filters.severity));
    return client_1.db
        .select()
        .from(schema_1.alerts)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.alerts.createdAt));
}
async function markAlertRead(id) {
    const [updated] = await client_1.db
        .update(schema_1.alerts)
        .set({ isRead: true, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.alerts.id, id))
        .returning();
    return updated ?? null;
}
async function markAllAlertsRead(userId) {
    return client_1.db
        .update(schema_1.alerts)
        .set({ isRead: true, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.alerts.userId, userId), (0, drizzle_orm_1.eq)(schema_1.alerts.isRead, false)));
}
// ─── Notifications ────────────────────────────────────────────────────────────
async function createNotification(data) {
    const [notification] = await client_1.db.insert(schema_1.notifications).values(data).returning();
    return notification;
}
async function updateNotificationStatus(id, status, providerMessageId) {
    const [updated] = await client_1.db
        .update(schema_1.notifications)
        .set({
        status,
        providerMessageId,
        sentAt: status === "sent" ? new Date() : undefined,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.notifications.id, id))
        .returning();
    return updated ?? null;
}
async function listNotifications(userId, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.notifications.userId, userId)];
    if (filters?.channel)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.notifications.channel, filters.channel));
    if (filters?.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.notifications.status, filters.status));
    return client_1.db
        .select()
        .from(schema_1.notifications)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt));
}
async function listPendingNotifications() {
    return client_1.db
        .select()
        .from(schema_1.notifications)
        .where((0, drizzle_orm_1.eq)(schema_1.notifications.status, "pending"))
        .orderBy(schema_1.notifications.createdAt);
}
