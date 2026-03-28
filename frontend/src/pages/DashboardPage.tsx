import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { StatCard } from "@/components/shared/StatCard";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { VoiceRecorderModal } from "@/components/shared/VoiceRecorderModal";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { dashboardStats, recentActivity, currentUser } from "@/data/mockData";
import type { VoiceProcessResponse } from "@/lib/voiceApi";
import { createVoiceLedgerEntry } from "@/lib/ledgerApi";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingDown, TrendingUp, Mic, Lightbulb } from "lucide-react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleSave = async (result: VoiceProcessResponse) => {
    if (!result.voiceSessionId) {
      toast({
        title: "Could not save entries",
        description: "Missing voice session id from API response.",
        variant: "destructive",
      });
      return;
    }

    const tasks = [
      ...result.structured.earnings.map((row) =>
        createVoiceLedgerEntry({
          voiceSessionId: result.voiceSessionId!,
          entryType: "sale",
          amount: row.amount,
          quantity: row.quantity,
          unit: row.unit,
          itemName: row.label,
          notes: row.sourceText,
          confidence: row.confidence,
        })
      ),
      ...result.structured.expenses.map((row) =>
        createVoiceLedgerEntry({
          voiceSessionId: result.voiceSessionId!,
          entryType: "expense",
          amount: row.amount,
          quantity: row.quantity,
          unit: row.unit,
          itemName: row.label,
          notes: row.sourceText,
          confidence: row.confidence,
        })
      ),
    ];

    try {
      await Promise.all(tasks);
      toast({
        title: "Saved",
        description: `Saved ${tasks.length} ledger entries from voice note.`,
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save ledger entries",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <SkeletonLoader type="text" lines={2} />
          <div className="grid sm:grid-cols-3 gap-4">
            <SkeletonLoader type="stat" />
            <SkeletonLoader type="stat" />
            <SkeletonLoader type="stat" />
          </div>
          <SkeletonLoader type="card" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Good morning, {currentUser.name.split(" ")[0]}! 👋</h1>
            <p className="text-muted-foreground font-medium">Here's your business overview for today.</p>
          </div>
          <BrutalButton variant="primary" size="lg" onClick={() => setVoiceOpen(true)}>
            <Mic size={22} /> Record Entry
          </BrutalButton>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard title="Earnings" value={dashboardStats.earnings} icon={DollarSign} variant="earnings" trend="up" trendValue="12% vs last week" />
          <StatCard title="Expenses" value={dashboardStats.expenses} icon={TrendingDown} variant="expenses" trend="down" trendValue="5% vs last week" />
          <StatCard title="Profit" value={dashboardStats.profit} icon={TrendingUp} variant="profit" trend="up" trendValue="18% vs last week" />
        </div>

        {/* Insight */}
        <BrutalCard highlight="accent" className="flex items-start gap-3">
          <div className="w-10 h-10 bg-accent rounded-sm brutal-border flex items-center justify-center shrink-0">
            <Lightbulb size={20} />
          </div>
          <div>
            <h3 className="font-bold">Weekend Boost!</h3>
            <p className="text-sm text-muted-foreground font-medium">You earn 40% more on weekends. Consider stocking extra on Fridays for maximum profit.</p>
          </div>
        </BrutalCard>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-bold mb-3">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((a) => (
              <BrutalCard key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{a.description}</p>
                  <p className="text-sm text-muted-foreground font-medium">{a.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  {a.earnings > 0 && <BrutalBadge variant="confirmed">+₹{a.earnings}</BrutalBadge>}
                  {a.expenses > 0 && <BrutalBadge variant="danger">-₹{a.expenses}</BrutalBadge>}
                </div>
              </BrutalCard>
            ))}
          </div>
        </div>
      </div>

      <VoiceRecorderModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onSave={handleSave} />
    </AppLayout>
  );
}
