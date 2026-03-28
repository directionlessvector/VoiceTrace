import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { suggestions } from "@/data/mockData";
import { Package, ArrowUp, Minus } from "lucide-react";

export default function SuggestionsPage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1000); return () => clearTimeout(t); }, []);

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Stock Suggestions</h1>
        <p className="text-muted-foreground font-medium">AI-powered recommendations based on your sales patterns.</p>

        <div className="space-y-4">
          {suggestions.map((s) => {
            const needsMore = s.suggestedQty > s.currentQty;
            return (
              <BrutalCard key={s.id} highlight={needsMore ? "warning" : "success"}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-sm brutal-border flex items-center justify-center shrink-0 bg-muted">
                      <Package size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">{s.item}</h3>
                      <p className="text-sm text-muted-foreground font-medium mt-1">{s.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center brutal-border p-2 bg-muted">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Current</p>
                      <p className="font-mono font-bold">{s.currentQty}</p>
                    </div>
                    {needsMore ? <ArrowUp size={20} className="text-warning" /> : <Minus size={20} className="text-success" />}
                    <div className="text-center brutal-border p-2 bg-muted">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Suggested</p>
                      <p className="font-mono font-bold">{s.suggestedQty}</p>
                    </div>
                    {needsMore && <BrutalBadge variant="warning">Increase</BrutalBadge>}
                    {!needsMore && <BrutalBadge variant="confirmed">OK</BrutalBadge>}
                  </div>
                </div>
              </BrutalCard>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
