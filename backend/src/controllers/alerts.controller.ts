import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/client";
import { alerts, notifications } from "../db/schema";

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function createAlert(data: {
  userId: string;
  alertType: "low_stock" | "anomaly_detected" | "payment_due" | "weather_advisory" | "pattern_break" | "vendor_score_change";
  title: string;
  body: string;
  severity?: "info" | "warning" | "critical";
  referenceId?: string;
  referenceType?: string;
}) {
  const [alert] = await db.insert(alerts).values(data).returning();
  return alert;
}

export async function getAlert(id: string) {
  const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
  return alert ?? null;
}

export async function listUserAlerts(
  userId: string,
  filters?: {
    isRead?: boolean;
    alertType?: "low_stock" | "anomaly_detected" | "payment_due" | "weather_advisory" | "pattern_break" | "vendor_score_change";
    severity?: "info" | "warning" | "critical";
  }
) {
  const conditions = [eq(alerts.userId, userId)];

  if (filters?.isRead !== undefined) conditions.push(eq(alerts.isRead, filters.isRead));
  if (filters?.alertType)           conditions.push(eq(alerts.alertType, filters.alertType));
  if (filters?.severity)            conditions.push(eq(alerts.severity, filters.severity));

  return db
    .select()
    .from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.createdAt));
}

export async function markAlertRead(id: string) {
  const [updated] = await db
    .update(alerts)
    .set({ isRead: true, updatedAt: new Date() })
    .where(eq(alerts.id, id))
    .returning();
  return updated ?? null;
}

export async function markAllAlertsRead(userId: string) {
  return db
    .update(alerts)
    .set({ isRead: true, updatedAt: new Date() })
    .where(and(eq(alerts.userId, userId), eq(alerts.isRead, false)));
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId: string;
  channel: "sms" | "whatsapp" | "dashboard" | "push_pwa";
  messageBody: string;
  alertId?: string;
}) {
  const [notification] = await db.insert(notifications).values(data).returning();
  return notification;
}

export async function updateNotificationStatus(
  id: string,
  status: "sent" | "delivered" | "failed",
  providerMessageId?: string
) {
  const [updated] = await db
    .update(notifications)
    .set({
      status,
      providerMessageId,
      sentAt: status === "sent" ? new Date() : undefined,
    })
    .where(eq(notifications.id, id))
    .returning();
  return updated ?? null;
}

export async function listNotifications(
  userId: string,
  filters?: {
    channel?: "sms" | "whatsapp" | "dashboard" | "push_pwa";
    status?: "pending" | "sent" | "delivered" | "failed";
  }
) {
  const conditions = [eq(notifications.userId, userId)];

  if (filters?.channel) conditions.push(eq(notifications.channel, filters.channel));
  if (filters?.status)  conditions.push(eq(notifications.status, filters.status));

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));
}

export async function listPendingNotifications() {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.status, "pending"))
    .orderBy(notifications.createdAt);
}
