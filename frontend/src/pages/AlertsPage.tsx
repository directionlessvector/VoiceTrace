import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import {
  listUserAlerts,
  markAlertRead,
  markAllAlertsRead,
  createAlertNotification,
  type Alert,
  type NotificationChannel,
} from "@/lib/alertsApi";
import { AlertTriangle, AlertCircle, Info, ArrowDownUp, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UIType = "warning" | "danger" | "info";
type SortMode = "latest" | "critical";

function severityToType(severity: Alert["severity"]): UIType {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

const SEVERITY_ORDER: Record<Alert["severity"], number> = { critical: 0, warning: 1, info: 2 };

const ALERT_TYPE_LABELS: Record<Alert["alertType"], string> = {
  low_stock: "Low Stock",
  anomaly_detected: "Anomaly",
  payment_due: "Payment Due",
  weather_advisory: "Weather",
  pattern_break: "Pattern Break",
  vendor_score_change: "Score Change",
};

export default function AlertsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [filterSeverity, setFilterSeverity] = useState<Alert["severity"] | "all">("all");
  const [filterType, setFilterType] = useState<Alert["alertType"] | "all">("all");
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");
  const [sendingChannel, setSendingChannel] = useState<NotificationChannel | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listUserAlerts();
        setAlerts(data);
      } catch {
        // show empty state on error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await markAlertRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      toast({ title: "Failed to mark as read", variant: "destructive" });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch {
      toast({ title: "Failed to mark all as read", variant: "destructive" });
    }
  };

  const alertIcons: Record<UIType, typeof AlertTriangle> = {
    warning: AlertTriangle,
    danger: AlertCircle,
    info: Info,
  };
  const alertHighlights: Record<UIType, "warning" | "destructive" | "secondary"> = {
    warning: "warning",
    danger: "destructive",
    info: "secondary",
  };
  const alertBadges: Record<UIType, "warning" | "danger" | "info"> = {
    warning: "warning",
    danger: "danger",
    info: "info",
  };

  const filtered = alerts
    .filter((a) => filterSeverity === "all" || a.severity === filterSeverity)
    .filter((a) => filterType === "all" || a.alertType === filterType)
    .filter((a) => {
      if (filterRead === "unread") return !a.isRead;
      if (filterRead === "read") return a.isRead;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "critical") {
        const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        if (diff !== 0) return diff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const buildAlertDigest = (): string => {
    const selected = filtered.slice(0, 8);
    const lines = selected.map((alert, index) => {
      return `${index + 1}. [${alert.severity.toUpperCase()}] ${alert.title} | ${ALERT_TYPE_LABELS[alert.alertType]} | ${alert.isRead ? "read" : "unread"}`;
    });

    return [
      "VoiceTrace Alerts Digest",
      `Generated: ${new Date().toLocaleString()}`,
      `Unread: ${unreadCount}`,
      "",
      "Alerts:",
      ...(lines.length ? lines : ["No alerts available"]),
    ].join("\n");
  };

  const handleSendAlerts = async (channel: NotificationChannel) => {
    try {
      setSendingChannel(channel);
      const sent = await createAlertNotification({
        channel,
        messageBody: buildAlertDigest(),
      });

      const destination = sent.destination || "configured destination";
      const provider = sent.provider ? ` via ${sent.provider}` : "";

      toast({
        title: `Alerts ${sent.status} for ${channel.toUpperCase()}`,
        description: `Sent to ${destination}${provider}`,
      });
    } catch (error) {
      toast({
        title: `Failed to send via ${channel.toUpperCase()}`,
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingChannel(null);
    }
  };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Alerts</h1>
            <p className="text-muted-foreground font-medium">Anomalies detected compared to your daily averages.</p>
          </div>
          <div className="flex items-center gap-2">
            <BrutalButton
              variant="outline"
              size="sm"
              onClick={() => handleSendAlerts("whatsapp")}
              disabled={sendingChannel !== null}
            >
              {sendingChannel === "whatsapp" ? "Sending..." : "Send WhatsApp"}
            </BrutalButton>
            <BrutalButton
              variant="outline"
              size="sm"
              onClick={() => handleSendAlerts("sms")}
              disabled={sendingChannel !== null}
            >
              {sendingChannel === "sms" ? "Sending..." : "Send SMS"}
            </BrutalButton>
            {unreadCount > 0 && (
              <BrutalButton variant="outline" size="sm" onClick={handleMarkAllRead}>
                Mark all read ({unreadCount})
              </BrutalButton>
            )}
          </div>
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Sort toggle */}
          <button
            onClick={() => setSortMode((m) => m === "latest" ? "critical" : "latest")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold brutal-border brutal-shadow-sm transition-colors ${
              sortMode === "critical" ? "bg-destructive text-destructive-foreground" : "bg-card"
            }`}
          >
            {sortMode === "critical" ? <AlertCircle size={14} /> : <Clock size={14} />}
            {sortMode === "critical" ? "Critical First" : "Latest First"}
            <ArrowDownUp size={12} />
          </button>

          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
            className="brutal-input px-3 py-2 text-sm font-bold"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="brutal-input px-3 py-2 text-sm font-bold"
          >
            <option value="all">All Types</option>
            <option value="low_stock">Low Stock</option>
            <option value="anomaly_detected">Anomaly Detected</option>
            <option value="payment_due">Payment Due</option>
            <option value="weather_advisory">Weather Advisory</option>
            <option value="pattern_break">Pattern Break</option>
            <option value="vendor_score_change">Score Change</option>
          </select>

          {/* Read status filter */}
          <select
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value as typeof filterRead)}
            className="brutal-input px-3 py-2 text-sm font-bold"
          >
            <option value="all">All Alerts</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>

          {/* Active filter count */}
          {(filterSeverity !== "all" || filterType !== "all" || filterRead !== "all") && (
            <button
              onClick={() => { setFilterSeverity("all"); setFilterType("all"); setFilterRead("all"); }}
              className="px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground brutal-border"
            >
              Clear filters
            </button>
          )}

          <span className="text-sm font-medium text-muted-foreground ml-auto">
            {filtered.length} / {alerts.length} alerts
          </span>
        </div>

        {filtered.length === 0 ? (
          <BrutalCard className="text-center py-12">
            <p className="text-lg font-bold text-muted-foreground">
              {alerts.length === 0 ? "🎉 No alerts! Everything looks normal." : "No alerts match your filters."}
            </p>
          </BrutalCard>
        ) : (
          <div className="space-y-4">
            {filtered.map((alert) => {
              const type = severityToType(alert.severity);
              const Icon = alertIcons[type];
              return (
                <BrutalCard key={alert.id} highlight={alertHighlights[type]} className={alert.isRead ? "opacity-60" : ""}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-sm brutal-border flex items-center justify-center shrink-0 bg-muted">
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{alert.title}</h3>
                          <BrutalBadge variant={alertBadges[type]}>{alert.severity}</BrutalBadge>
                          {!alert.isRead && <BrutalBadge variant="confirmed">new</BrutalBadge>}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{alert.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="brutal-border p-2 bg-muted text-center">
                        <p className="font-mono font-bold text-sm">{ALERT_TYPE_LABELS[alert.alertType]}</p>
                      </div>
                      {!alert.isRead && (
                        <BrutalButton variant="outline" size="sm" onClick={() => handleMarkRead(alert.id)}>
                          Read
                        </BrutalButton>
                      )}
                    </div>
                  </div>
                </BrutalCard>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
