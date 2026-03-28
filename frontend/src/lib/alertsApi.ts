import { fetchJson, resolveActiveUserId } from "@/lib/backendApi";

export type Alert = {
  id: string;
  userId: string;
  alertType: "low_stock" | "anomaly_detected" | "payment_due" | "weather_advisory" | "pattern_break" | "vendor_score_change";
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  isRead: boolean;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationChannel = "sms" | "whatsapp";

type NotificationCreateResponse = {
  id: string;
  userId: string;
  channel: "sms" | "whatsapp" | "dashboard" | "push_pwa";
  messageBody: string;
  alertId: string | null;
  status: "pending" | "sent" | "delivered" | "failed";
  createdAt: string;
  destination?: string;
  provider?: string;
  providerMessageId?: string | null;
};

export async function listUserAlerts(filters?: {
  isRead?: boolean;
  severity?: "info" | "warning" | "critical";
}): Promise<Alert[]> {
  const userId = await resolveActiveUserId();
  const params = new URLSearchParams();
  if (filters?.isRead !== undefined) params.set("isRead", String(filters.isRead));
  if (filters?.severity) params.set("severity", filters.severity);
  const qs = params.toString();
  return fetchJson<Alert[]>(`/alerts/user/${userId}${qs ? `?${qs}` : ""}`);
}

export async function markAlertRead(id: string): Promise<Alert> {
  return fetchJson<Alert>(`/alerts/${id}/read`, { method: "PATCH" });
}

export async function markAllAlertsRead(): Promise<void> {
  const userId = await resolveActiveUserId();
  await fetchJson(`/alerts/user/${userId}/read-all`, { method: "PATCH" });
}

export async function createAlertNotification(input: {
  channel: NotificationChannel;
  messageBody: string;
  alertId?: string;
}): Promise<NotificationCreateResponse> {
  const userId = await resolveActiveUserId();

  return fetchJson<NotificationCreateResponse>("/alerts/notifications", {
    method: "POST",
    body: JSON.stringify({
      userId,
      channel: input.channel,
      messageBody: input.messageBody,
      alertId: input.alertId,
    }),
  });
}
