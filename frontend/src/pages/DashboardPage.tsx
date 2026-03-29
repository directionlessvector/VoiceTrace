import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { StatCard } from "@/components/shared/StatCard";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalModal } from "@/components/shared/BrutalModal";
import { VoiceRecorderModal } from "@/components/shared/VoiceRecorderModal";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { startVoiceAssistantCall, type VoiceProcessResponse } from "@/lib/voiceApi";
import { createVoiceLedgerEntry, listCurrentUserLedgerEntries, type LedgerEntry, updateLedgerEntryById } from "@/lib/ledgerApi";
import { createVoiceFlag, listPendingVoiceFlags, resolveVoiceFlag, type VoiceFlag } from "@/lib/voiceFlagsApi";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, TrendingDown, TrendingUp, Mic, Lightbulb, PhoneCall } from "lucide-react";

type TrendInfo = {
  trend: "up" | "down" | "neutral";
  value: string;
};

type SuggestedCorrection = {
  label?: string;
  amount?: number;
  quantity?: number;
  unit?: string;
  entryType?: "sale" | "expense";
};

function parseSuggestedCorrection(raw: string | null): SuggestedCorrection | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SuggestedCorrection;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
}

function calculateTrend(current: number, previous: number, invertDirection = false): TrendInfo {
  if (previous === 0 && current === 0) {
    return { trend: "neutral", value: "0% vs last week" };
  }

  if (previous === 0) {
    const rawTrend = current > 0 ? "up" : current < 0 ? "down" : "neutral";
    const trend = invertDirection
      ? rawTrend === "up"
        ? "down"
        : rawTrend === "down"
          ? "up"
          : "neutral"
      : rawTrend;
    return { trend, value: "new vs last week" };
  }

  const changePct = ((current - previous) / previous) * 100;
  const rawTrend = changePct > 0 ? "up" : changePct < 0 ? "down" : "neutral";
  const trend = invertDirection
    ? rawTrend === "up"
      ? "down"
      : rawTrend === "down"
        ? "up"
        : "neutral"
    : rawTrend;

  return {
    trend,
    value: `${formatPercent(Math.abs(changePct))} vs last week`,
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ earnings: 0, expenses: 0, profit: 0 });
  const [trends, setTrends] = useState<{
    earnings: TrendInfo;
    expenses: TrendInfo;
    profit: TrendInfo;
  }>({
    earnings: { trend: "neutral", value: "0% vs last week" },
    expenses: { trend: "neutral", value: "0% vs last week" },
    profit: { trend: "neutral", value: "0% vs last week" },
  });
  const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [flagPromptOpen, setFlagPromptOpen] = useState(false);
  const [pendingFlag, setPendingFlag] = useState<VoiceFlag | null>(null);
  const [clarificationValue, setClarificationValue] = useState("");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [callNumber, setCallNumber] = useState(user?.phone ?? "");
  const { toast } = useToast();

  // Extract fetch logic into a reusable function
  const fetchDashboardData = useCallback(async () => {
    try {
      const entries = await listCurrentUserLedgerEntries();
      
      const earnings = entries
        .filter((e) => e.entryType === "sale" || e.entryType === "income")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const expenses = entries
        .filter((e) => e.entryType === "expense" || e.entryType === "purchase")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      setStats({ 
        earnings, 
        expenses, 
        profit: earnings - expenses 
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(currentWeekStart.getDate() - 6);

      const previousWeekEnd = new Date(currentWeekStart);
      previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);

      const previousWeekStart = new Date(previousWeekEnd);
      previousWeekStart.setDate(previousWeekStart.getDate() - 6);

      const currentWeekEntries = entries.filter((entry) => {
        const dt = new Date(entry.entryDate);
        if (Number.isNaN(dt.getTime())) return false;
        dt.setHours(0, 0, 0, 0);
        return dt >= currentWeekStart && dt <= today;
      });

      const previousWeekEntries = entries.filter((entry) => {
        const dt = new Date(entry.entryDate);
        if (Number.isNaN(dt.getTime())) return false;
        dt.setHours(0, 0, 0, 0);
        return dt >= previousWeekStart && dt <= previousWeekEnd;
      });

      const currentWeekEarnings = currentWeekEntries
        .filter((e) => e.entryType === "sale" || e.entryType === "income")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const previousWeekEarnings = previousWeekEntries
        .filter((e) => e.entryType === "sale" || e.entryType === "income")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const currentWeekExpenses = currentWeekEntries
        .filter((e) => e.entryType === "expense" || e.entryType === "purchase")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const previousWeekExpenses = previousWeekEntries
        .filter((e) => e.entryType === "expense" || e.entryType === "purchase")
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const currentWeekProfit = currentWeekEarnings - currentWeekExpenses;
      const previousWeekProfit = previousWeekEarnings - previousWeekExpenses;

      setTrends({
        earnings: calculateTrend(currentWeekEarnings, previousWeekEarnings),
        // Lower expenses are better, so invert trend direction for this card.
        expenses: calculateTrend(currentWeekExpenses, previousWeekExpenses, true),
        profit: calculateTrend(currentWeekProfit, previousWeekProfit),
      });

      const recent = [...entries]
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
        .slice(0, 5);

      setRecentEntries(recent);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData().finally(() => setLoading(false));
  }, [fetchDashboardData]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const flags = await listPendingVoiceFlags();
        if (!mounted || !flags.length) return;
        setPendingFlag(flags[0]);
        setFlagPromptOpen(true);
      } catch {
        // Ignore prompt fetch issues and keep dashboard usable.
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAcceptFlag = async () => {
    if (!pendingFlag) return;
    setFlagSubmitting(true);
    try {
      await resolveVoiceFlag(pendingFlag.id, { correctionStatus: "accepted" });
      setFlagPromptOpen(false);
      setPendingFlag(null);
      setClarificationValue("");
      toast({
        title: "Clarification saved",
        description: "Marked as approximate and kept in records.",
      });
    } catch (error) {
      toast({
        title: "Could not save clarification",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setFlagSubmitting(false);
    }
  };

  const handleCorrectFlag = async () => {
    if (!pendingFlag) return;
    const corrected = clarificationValue.trim();
    if (!corrected) {
      toast({
        title: "Value required",
        description: "Enter corrected amount/value before submitting.",
        variant: "destructive",
      });
      return;
    }

    setFlagSubmitting(true);
    try {
      const suggestion = parseSuggestedCorrection(pendingFlag.suggestedCorrection);
      const amountNum = Number(corrected);

      const entries = await listCurrentUserLedgerEntries();
      const candidate = entries.find((entry) => {
        if (entry.voiceSessionId !== pendingFlag.voiceSessionId) return false;
        if (!suggestion?.label || !entry.itemName) return true;
        return entry.itemName.trim().toLowerCase() === suggestion.label.trim().toLowerCase();
      });

      if (candidate) {
        await updateLedgerEntryById(candidate.id, {
          amount: Number.isFinite(amountNum) ? amountNum.toFixed(2) : candidate.amount,
          notes: `${candidate.notes ?? ""}${candidate.notes ? " | " : ""}corrected:${corrected}`,
        });
      }

      await resolveVoiceFlag(pendingFlag.id, {
        correctionStatus: "manually_corrected",
        correctedValue: corrected,
      });

      setFlagPromptOpen(false);
      setPendingFlag(null);
      setClarificationValue("");
      await fetchDashboardData();

      toast({
        title: "Correction saved",
        description: "Updated your entry with the clarification.",
      });
    } catch (error) {
      toast({
        title: "Could not save correction",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setFlagSubmitting(false);
    }
  };

  // Refresh dashboard after successful voice recording
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
          isApproximate: row.isApproximate,
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
          isApproximate: row.isApproximate,
        })
      ),
    ];

    const uncertainRows = [
      ...result.structured.earnings.map((row) => ({ ...row, entryType: "sale" as const })),
      ...result.structured.expenses.map((row) => ({ ...row, entryType: "expense" as const })),
    ].filter((row) => row.isApproximate || row.confidence === "low" || row.amount <= 0);

    try {
      await Promise.all(tasks);

      await Promise.all(
        uncertainRows.map((row) =>
          createVoiceFlag(result.voiceSessionId!, {
            flagType: "unclear_speech",
            originalText: row.sourceText || `${row.entryType} ${row.label}`,
            suggestedCorrection: JSON.stringify({
              entryType: row.entryType,
              label: row.label,
              amount: row.amount,
              quantity: row.quantity,
              unit: row.unit,
            }),
          })
        )
      );
      
      toast({
        title: "Saved",
        description: uncertainRows.length
          ? `Saved ${tasks.length} ledger entries. ${uncertainRows.length} marked for clarification.`
          : `Saved ${tasks.length} ledger entries from voice note.`,
      });

      // Refresh dashboard data (minimal extra API call)
      await fetchDashboardData();

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
            <h1 className="text-2xl md:text-3xl font-bold">
              Good morning, {user?.name?.split(" ")[0] ?? "there"}! 👋
            </h1>
            <p className="text-muted-foreground font-medium">
              Here's your business overview for today.
            </p>
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
          <StatCard 
            title="Earnings" 
            value={stats.earnings} 
            icon={DollarSign} 
            variant="earnings" 
            trend={trends.earnings.trend} 
            trendValue={trends.earnings.value} 
          />
          <StatCard 
            title="Expenses" 
            value={stats.expenses} 
            icon={TrendingDown} 
            variant="expenses" 
            trend={trends.expenses.trend} 
            trendValue={trends.expenses.value} 
          />
          <StatCard 
            title="Profit" 
            value={stats.profit} 
            icon={TrendingUp} 
            variant="profit" 
            trend={trends.profit.trend} 
            trendValue={trends.profit.value} 
          />
        </div>

        {/* Insight */}
        <BrutalCard highlight="accent" className="flex items-start gap-3">
          <div className="w-10 h-10 bg-accent rounded-sm brutal-border flex items-center justify-center shrink-0">
            <Lightbulb size={20} />
          </div>
          <div>
            <h3 className="font-bold">Weekend Boost!</h3>
            <p className="text-sm text-muted-foreground font-medium">
              You earn 40% more on weekends. Consider stocking extra on Fridays for maximum profit.
            </p>
          </div>
        </BrutalCard>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-bold mb-3">Recent Activity</h2>
          {recentEntries.length === 0 ? (
            <BrutalCard className="text-center py-8">
              <p className="text-muted-foreground font-medium">
                No entries yet. Record your first voice entry!
              </p>
            </BrutalCard>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => {
                const isSale = entry.entryType === "sale" || entry.entryType === "income";
                const amount = Number(entry.amount);
                return (
                  <BrutalCard 
                    key={entry.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold">
                        {entry.itemName ?? (isSale ? "Voice sale" : "Voice expense")}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">
                        {entry.entryDate}
                      </p>
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

      <VoiceRecorderModal 
        open={voiceOpen} 
        onClose={() => setVoiceOpen(false)} 
        onSave={handleSave} 
      />

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

      <BrutalModal open={flagPromptOpen} onClose={() => setFlagPromptOpen(false)} title="Quick Clarification Needed">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium">
            We detected an approximate voice entry and saved it so nothing is lost.
          </p>
          <div className="brutal-card p-3 bg-muted/30">
            <p className="font-bold text-sm">Uncertain line</p>
            <p className="text-sm text-muted-foreground">{pendingFlag?.originalText ?? "No text available"}</p>
          </div>
          <p className="text-sm font-medium">
            Is this entry okay as approximate? If not, enter corrected amount/value below.
          </p>
          <input
            value={clarificationValue}
            onChange={(e) => setClarificationValue(e.target.value)}
            placeholder="Enter corrected amount/value"
            className="w-full px-4 py-2.5 brutal-input"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <BrutalButton variant="outline" onClick={handleAcceptFlag} loading={flagSubmitting}>
              Yes, keep approximate
            </BrutalButton>
            <BrutalButton variant="primary" onClick={handleCorrectFlag} loading={flagSubmitting}>
              Submit correction
            </BrutalButton>
          </div>
        </div>
      </BrutalModal>
    </AppLayout>
  );
}