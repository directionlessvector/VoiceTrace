import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { StatCard } from "@/components/shared/StatCard";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalModal } from "@/components/shared/BrutalModal";
import { VoiceRecorderModal } from "@/components/shared/VoiceRecorderModal";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { startVoiceAssistantCall, type VoiceProcessResponse } from "@/lib/voiceApi";
import { createVoiceLedgerEntry, listCurrentUserLedgerEntries, type LedgerEntry } from "@/lib/ledgerApi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, TrendingDown, TrendingUp, Mic, Lightbulb, PhoneCall } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ earnings: 0, expenses: 0, profit: 0 });
  const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callNumber, setCallNumber] = useState(user?.phone ?? "");
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const entries = await listCurrentUserLedgerEntries();
        const earnings = entries
          .filter((e) => e.entryType === "sale" || e.entryType === "income")
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const expenses = entries
          .filter((e) => e.entryType === "expense" || e.entryType === "purchase")
          .reduce((sum, e) => sum + Number(e.amount), 0);
        setStats({ earnings, expenses, profit: earnings - expenses });
        const recent = [...entries]
          .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
          .slice(0, 5);
        setRecentEntries(recent);
      } finally {
        setLoading(false);
      }
    })();
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

  const handleStartCall = async () => {
    if (!callNumber.trim()) {
      toast({
        title: "Number required",
        description: "Enter a phone number in format like +919876543210",
        variant: "destructive",
      });
      return;
    }

    setIsCalling(true);
    try {
      const response = await startVoiceAssistantCall(callNumber.trim());
      toast({
        title: "Calling now",
        description: `Call started (${response.callSid}). Pick up to talk to the assistant.`,
      });
      setCallOpen(false);
    } catch (error) {
      toast({
        title: "Call failed",
        description: error instanceof Error ? error.message : "Could not start outbound call",
        variant: "destructive",
      });
    } finally {
      setIsCalling(false);
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
            <h1 className="text-2xl md:text-3xl font-bold">Good morning, {user?.name?.split(" ")[0] ?? "there"}! 👋</h1>
            <p className="text-muted-foreground font-medium">Here's your business overview for today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BrutalButton variant="outline" size="lg" onClick={() => setCallOpen(true)}>
              <PhoneCall size={20} /> Call Assistant
            </BrutalButton>
            <BrutalButton variant="primary" size="lg" onClick={() => setVoiceOpen(true)}>
              <Mic size={22} /> Record Entry
            </BrutalButton>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard title="Earnings" value={stats.earnings} icon={DollarSign} variant="earnings" trend="up" trendValue="12% vs last week" />
          <StatCard title="Expenses" value={stats.expenses} icon={TrendingDown} variant="expenses" trend="down" trendValue="5% vs last week" />
          <StatCard title="Profit" value={stats.profit} icon={TrendingUp} variant="profit" trend="up" trendValue="18% vs last week" />
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
          {recentEntries.length === 0 ? (
            <BrutalCard className="text-center py-8">
              <p className="text-muted-foreground font-medium">No entries yet. Record your first voice entry!</p>
            </BrutalCard>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => {
                const isSale = entry.entryType === "sale" || entry.entryType === "income";
                const amount = Number(entry.amount);
                return (
                  <BrutalCard key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{entry.itemName ?? (isSale ? "Voice sale" : "Voice expense")}</p>
                      <p className="text-sm text-muted-foreground font-medium">{entry.entryDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isSale && <BrutalBadge variant="confirmed">+₹{amount}</BrutalBadge>}
                      {!isSale && <BrutalBadge variant="danger">-₹{amount}</BrutalBadge>}
                    </div>
                  </BrutalCard>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <VoiceRecorderModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onSave={handleSave} />

      <BrutalModal open={callOpen} onClose={() => setCallOpen(false)} title="Call Voice Assistant">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium">
            Enter the phone number to receive the call. Use E.164 format like +919876543210.
          </p>
          <input
            value={callNumber}
            onChange={(e) => setCallNumber(e.target.value)}
            placeholder="+919876543210"
            className="w-full px-4 py-2.5 brutal-input"
          />
          <div className="flex justify-end">
            <BrutalButton variant="primary" onClick={handleStartCall} loading={isCalling}>
              <PhoneCall size={16} /> Start Call
            </BrutalButton>
          </div>
        </div>
      </BrutalModal>
    </AppLayout>
  );
}
