import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { alerts } from "@/data/mockData";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

export default function AlertsPage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1000); return () => clearTimeout(t); }, []);

  const alertIcons = { warning: AlertTriangle, danger: AlertCircle, info: Info };
  const alertHighlights = { warning: "warning" as const, danger: "destructive" as const, info: "secondary" as const };
  const alertBadges = { warning: "warning" as const, danger: "danger" as const, info: "info" as const };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Alerts</h1>
        <p className="text-muted-foreground font-medium">Anomalies detected compared to your daily averages.</p>

        {alerts.length === 0 ? (
          <BrutalCard className="text-center py-12">
            <p className="text-lg font-bold text-muted-foreground">🎉 No alerts! Everything looks normal.</p>
          </BrutalCard>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const Icon = alertIcons[alert.type];
              return (
                <BrutalCard key={alert.id} highlight={alertHighlights[alert.type]}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-sm brutal-border flex items-center justify-center shrink-0 bg-muted">
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{alert.title}</h3>
                          <BrutalBadge variant={alertBadges[alert.type]}>{alert.type}</BrutalBadge>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">{alert.message}</p>
                      </div>
                    </div>
                    <div className="brutal-border p-2 bg-muted text-center shrink-0">
                      <p className="font-mono font-bold text-sm">{alert.metric}</p>
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
