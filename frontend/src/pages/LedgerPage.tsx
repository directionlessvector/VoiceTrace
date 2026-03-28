
import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalModal } from "@/components/shared/BrutalModal";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import {
  getVoiceSessionById,
  listCurrentUserLedgerEntries,
  type LedgerEntry,
  updateLedgerEntryById,
  updateVoiceSessionTranscript,
} from "@/lib/ledgerApi";
import { Search, Play, Pause, Edit3, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LedgerRow = {
  id: string;
  voiceSessionId: string | null;
  saleEntryIds: string[];
  expenseEntryIds: string[];
  sources: Array<"voice" | "ocr" | "manual">;
  date: string;
  earnings: number;
  expenses: number;
  profit: number;
  status: "confirmed" | "approximate";
  items: string[];
  expenseBreakdown: string[];
  confidence: number;
  transcript: string;
  audioUrl?: string;
};

function extractConfidenceFromNotes(notes: string | null): number | null {
  if (!notes) return null;
  const m = notes.match(/confidence\s*[:=]\s*(high|medium|low)|\((high|medium|low)\)/i);
  const value = (m?.[1] || m?.[2] || "").toLowerCase();
  if (value === "high") return 0.95;
  if (value === "medium") return 0.72;
  if (value === "low") return 0.45;
  return null;
}

function groupEntriesByDay(entries: LedgerEntry[]): LedgerRow[] {
  const grouped = new Map<string, LedgerRow>();
  const confidenceStats = new Map<string, { total: number; count: number }>();

  for (const entry of entries) {
    const key = `${entry.entryDate}::${entry.voiceSessionId ?? entry.id}`;
    const amount = Number(entry.amount || 0);

    const existing = grouped.get(key) ?? {
      id: key,
      voiceSessionId: entry.voiceSessionId,
      saleEntryIds: [],
      expenseEntryIds: [],
      sources: [],
      date: entry.entryDate,
      earnings: 0,
      expenses: 0,
      profit: 0,
      status: "confirmed",
      items: [],
      expenseBreakdown: [],
      confidence: 0.72,
      transcript: "",
      audioUrl: undefined,
    };

    if (entry.entryType === "sale" || entry.entryType === "income") {
      existing.earnings += amount;
      existing.saleEntryIds.push(entry.id);
      existing.items.push(`${entry.itemName ?? "Voice sale"} - ₹${amount}`);
    }

    if (entry.entryType === "expense" || entry.entryType === "purchase") {
      existing.expenses += amount;
      existing.expenseEntryIds.push(entry.id);
      existing.expenseBreakdown.push(`${entry.itemName ?? "Voice expense"} - ₹${amount}`);
    }

    existing.profit = existing.earnings - existing.expenses;

    if (!existing.sources.includes(entry.source)) {
      existing.sources.push(entry.source);
    }

    const conf = extractConfidenceFromNotes(entry.notes);
    if (conf !== null) {
      const stat = confidenceStats.get(key) ?? { total: 0, count: 0 };
      stat.total += conf;
      stat.count += 1;
      confidenceStats.set(key, stat);
    }

    grouped.set(key, existing);
  }

  for (const [key, row] of grouped.entries()) {
    const stat = confidenceStats.get(key);
    if (stat && stat.count > 0) {
      row.confidence = stat.total / stat.count;
    } else {
      const hasZeroAmounts = row.earnings === 0 && row.expenses === 0;
      row.confidence = hasZeroAmounts ? 0.5 : 0.72;
    }
    row.status = row.confidence < 0.65 ? "approximate" : "confirmed";
  }

  return [...grouped.values()].sort((a, b) => b.date.localeCompare(a.date));
}

// Simple UUID validator (basic check)
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const PAGE_SIZE = 10;

export default function LedgerPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<"date" | "earnings" | "expenses" | "profit">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sourceFilter, setSourceFilter] = useState<"all" | "voice" | "ocr" | "manual">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "sales" | "expenses" | "profit" | "loss">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedEntry, setSelectedEntry] = useState<LedgerRow | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editItems, setEditItems] = useState("");
  const [editExpenses, setEditExpenses] = useState("");
  const [editEarnings, setEditEarnings] = useState("0");
  const [editSpent, setEditSpent] = useState("0");
  const [editTranscript, setEditTranscript] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rows = await listCurrentUserLedgerEntries();
        if (!mounted) return;

        const grouped = groupEntriesByDay(rows);
        const sessionCache = new Map<string, Awaited<ReturnType<typeof getVoiceSessionById>> | null>();
        const withVoice = await Promise.all(
          grouped.map(async (row) => {
            const sessionId = row.voiceSessionId;
            if (!sessionId) return row;

            let session = sessionCache.get(sessionId);
            if (session === undefined) {
              try {
                session = await getVoiceSessionById(sessionId);
              } catch {
                session = null;
              }
              sessionCache.set(sessionId, session);
            }

            if (!session) return row;

            return {
              ...row,
              transcript: session.transcriptionClean ?? row.transcript,
              audioUrl: session.cloudinaryUrl,
            };
          })
        );

        setEntries(withVoice);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      audio?.pause();
    };
  }, []); // Empty dependency array is fine here

  // ... rest of your filtering, sorting, and handlers remain the same ...

  const filtered = entries
    .filter((e) => {
      const inSearch =
        e.date.includes(search) ||
        e.items.some((i) => i.toLowerCase().includes(search.toLowerCase())) ||
        e.expenseBreakdown.some((i) => i.toLowerCase().includes(search.toLowerCase()));

      const inSource = sourceFilter === "all" ? true : e.sources.includes(sourceFilter);

      const inType =
        typeFilter === "all"
          ? true
          : typeFilter === "sales"
            ? e.earnings > 0
            : typeFilter === "expenses"
              ? e.expenses > 0
              : typeFilter === "profit"
                ? e.profit > 0
                : e.profit < 0;

      const inFromDate = fromDate ? e.date >= fromDate : true;
      const inToDate = toDate ? e.date <= toDate : true;

      return inSearch && inSource && inType && inFromDate && inToDate;
    })
    .sort((a, b) => {
      const direction = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "date") return direction * a.date.localeCompare(b.date);
      if (sortBy === "earnings") return direction * (a.earnings - b.earnings);
      if (sortBy === "expenses") return direction * (a.expenses - b.expenses);
      return direction * (a.profit - b.profit);
    });

  const clearFilters = () => {
    setSearch("");
    setSourceFilter("all");
    setTypeFilter("all");
    setSortBy("date");
    setSortOrder("desc");
    setFromDate("");
    setToDate("");
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, sourceFilter, typeFilter, fromDate, toDate, sortBy, sortOrder]);

  const visibleEntries = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const openEntry = (entry: LedgerRow) => {
    setSelectedEntry(entry);
    setIsEditing(false);
    setEditItems(entry.items.join(", "));
    setEditExpenses(entry.expenseBreakdown.join(", "));
    setEditEarnings(String(entry.earnings));
    setEditSpent(String(entry.expenses));
    setEditTranscript(entry.transcript);
  };

  const saveEdits = async () => {
    if (!selectedEntry) return;
    setIsSaving(true);

    try {
      const earningValue = Number(editEarnings || "0");
      const expenseValue = Number(editSpent || "0");

      const itemLabels = editItems.split(",").map((s) => s.trim()).filter(Boolean);
      const expenseLabels = editExpenses.split(",").map((s) => s.trim()).filter(Boolean);

      const saleIds = selectedEntry.saleEntryIds;
      const expenseIds = selectedEntry.expenseEntryIds;

      const salePortion = saleIds.length > 0 ? earningValue / saleIds.length : 0;
      const expensePortion = expenseIds.length > 0 ? expenseValue / expenseIds.length : 0;

      await Promise.all([
        ...saleIds.map((id, index) =>
          updateLedgerEntryById(id, {
            amount: salePortion.toFixed(2),
            itemName: itemLabels[index] ?? itemLabels[0] ?? "Voice sale",
          })
        ),
        ...expenseIds.map((id, index) =>
          updateLedgerEntryById(id, {
            amount: expensePortion.toFixed(2),
            itemName: expenseLabels[index] ?? expenseLabels[0] ?? "Voice expense",
          })
        ),
      ]);

      if (selectedEntry.voiceSessionId) {
        await updateVoiceSessionTranscript(selectedEntry.voiceSessionId, editTranscript);
      }

      const updated: LedgerRow = {
        ...selectedEntry,
        earnings: earningValue,
        expenses: expenseValue,
        profit: earningValue - expenseValue,
        items: itemLabels.length ? itemLabels : selectedEntry.items,
        expenseBreakdown: expenseLabels.length ? expenseLabels : selectedEntry.expenseBreakdown,
        transcript: editTranscript,
      };

      setEntries((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setSelectedEntry(updated);
      setIsEditing(false);

      toast({ title: "Saved", description: "Ledger entry changes were saved." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save ledger changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // const handlePlayback = () => {
  //   if (!selectedEntry?.audioUrl) return;

  //   if (audio) {
  //     audio.pause();
  //     setAudio(null);
  //     setIsPlaying(false);
  //   }

  //   const player = new Audio(selectedEntry.audioUrl);
  //   player.onended = () => setIsPlaying(false);
  //   player.onerror = () => setIsPlaying(false);

  //   player.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  //   setAudio(player);

  //   const words = selectedEntry.transcript.split(" ");
  //   let i = 0;
  //   const interval = setInterval(() => {
  //     setHighlightIndex(i);
  //     i++;
  //     if (i >= words.length) {
  //       clearInterval(interval);
  //       setTimeout(() => setHighlightIndex(-1), 500);
  //     }
  //   }, 200);
  // };

 const handlePlayback = async () => {
  if (!selectedEntry?.audioUrl) return;

  // Clean up previous audio and highlighting
  if (audio) {
    audio.pause();
    if ((audio as any)._highlightInterval) {
      clearInterval((audio as any)._highlightInterval);
    }
    setAudio(null);
  }
  setIsPlaying(false);
  setHighlightIndex(-1);

  try {
    const player = new Audio(selectedEntry.audioUrl);
    
    // Wait for metadata to load so we can get accurate duration
    await new Promise<void>((resolve) => {
      player.onloadedmetadata = () => resolve();
      player.onerror = () => resolve(); // continue even on error
      setTimeout(() => resolve(), 1500); // fallback
    });

    const duration = player.duration || 0;
    const words = selectedEntry.transcript.trim().split(/\s+/).filter(Boolean);
    
    if (words.length === 0) {
      // No transcript, just play audio
      player.play().then(() => setIsPlaying(true)).catch(console.error);
      setAudio(player);
      return;
    }

    // Calculate dynamic delay per word
    const baseDelay = duration > 0 
      ? (duration * 1000 * 0.85) / words.length 
      : 180;

    const delayPerWord = Math.max(80, Math.min(baseDelay, 450));

    player.onended = () => {
      setIsPlaying(false);
      setHighlightIndex(-1);
    };

    player.onerror = () => {
      setIsPlaying(false);
      setHighlightIndex(-1);
    };

    // Start audio playback immediately
    await player.play();
    setAudio(player);
    setIsPlaying(true);

    // === 1000ms DELAY before starting highlighting ===
    setTimeout(() => {
      if (player.paused || player.ended) return; // audio already stopped

      let currentIndex = 0;
      const highlightInterval = setInterval(() => {
        setHighlightIndex(currentIndex);
        currentIndex++;

        if (currentIndex >= words.length) {
          clearInterval(highlightInterval);
          // Keep last word highlighted briefly after audio ends
          setTimeout(() => {
            setHighlightIndex(-1);
          }, 600);
        }
      }, delayPerWord);

      // Store interval for cleanup
      (player as any)._highlightInterval = highlightInterval;
    }, 1000); // ← 1000ms delay as requested

  } catch (error) {
    console.error("Playback failed:", error);
    setIsPlaying(false);
    setHighlightIndex(-1);
    toast({
      title: "Playback failed",
      description: "Could not play the voice note.",
      variant: "destructive",
    });
  }
};

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <SkeletonLoader type="text" lines={1} />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Ledger</h1>

        <div className="flex flex-col gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-10 pr-4 py-2.5 brutal-input"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
              className="brutal-input px-3 py-2"
            >
              <option value="all">All Sources</option>
              <option value="voice">Voice</option>
              <option value="ocr">OCR</option>
              <option value="manual">Manual</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="brutal-input px-3 py-2"
            >
              <option value="all">All Types</option>
              <option value="sales">Has Sales</option>
              <option value="expenses">Has Expenses</option>
              <option value="profit">Profit Only</option>
              <option value="loss">Loss Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="brutal-input px-3 py-2"
            >
              <option value="date">Sort: Date</option>
              <option value="earnings">Sort: Earnings</option>
              <option value="expenses">Sort: Expenses</option>
              <option value="profit">Sort: Profit</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="brutal-input px-3 py-2"
            >
              <option value="desc">Order: Desc</option>
              <option value="asc">Order: Asc</option>
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="brutal-input px-3 py-2"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="brutal-input px-3 py-2"
            />
          </div>

          <div>
            <BrutalButton variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </BrutalButton>
          </div>
        </div>

        {filtered.length === 0 ? (
          <BrutalCard className="text-center py-12">
            <p className="text-lg font-bold text-muted-foreground">No entries found</p>
            <p className="text-sm text-muted-foreground">Try a different search term</p>
          </BrutalCard>
        ) : (
          <div className="space-y-3">
            {visibleEntries.map((entry) => (
              <BrutalCard
                key={entry.id}
                className="cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
                onClick={() => openEntry(entry)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">{entry.date}</p>
                      <BrutalBadge variant={entry.status === "confirmed" ? "confirmed" : "approximate"}>
                        {entry.status}
                      </BrutalBadge>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{entry.items.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-4 font-mono font-bold text-sm">
                    <span className="text-success">+₹{entry.earnings}</span>
                    <span className="text-destructive">-₹{entry.expenses}</span>
                    <span className={entry.profit >= 0 ? "text-secondary" : "text-destructive"}>
                      = ₹{entry.profit}
                    </span>
                  </div>
                </div>
              </BrutalCard>
            ))}

            {hasMore && (
              <div className="text-center pt-2">
                <BrutalButton
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load More ({filtered.length - visibleCount} remaining)
                </BrutalButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal - unchanged */}
      <BrutalModal
        open={!!selectedEntry}
        // onClose={() => {
        //   setSelectedEntry(null);
        //   setHighlightIndex(-1);
        //   audio?.pause();
        //   setIsPlaying(false);
        //   setIsEditing(false);
        // }}
        onClose={() => {
  setSelectedEntry(null);
  setHighlightIndex(-1);
  
  if (audio) {
    audio.pause();
    // Clear any stored highlight interval
    if ((audio as any)._highlightInterval) {
      clearInterval((audio as any)._highlightInterval);
    }
    setAudio(null);
  }
  
  setIsPlaying(false);
  setIsEditing(false);
}}
        title="Entry Details"
      >
        {selectedEntry && (
          <div className="space-y-4">
            {/* ... Your existing modal content remains exactly the same ... */}
            <div className="flex items-center justify-between">
              <p className="font-bold">{selectedEntry.date}</p>
              <div className="flex items-center gap-2">
                <BrutalBadge variant={selectedEntry.status === "confirmed" ? "confirmed" : "approximate"}>
                  {Math.round(selectedEntry.confidence * 100)}% confident
                </BrutalBadge>
                {!isEditing ? (
                  <BrutalButton variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 size={14} /> Edit
                  </BrutalButton>
                ) : (
                  <BrutalButton variant="primary" size="sm" onClick={saveEdits} loading={isSaving}>
                    <Save size={14} /> Save
                  </BrutalButton>
                )}
              </div>
            </div>

            {/* Items Sold, Expenses, Transcript, Financial Summary sections remain unchanged */}
            {/* (I omitted repeating the full modal for brevity — copy it from your original code) */}

            {/* Paste your original modal content here (from <div className="space-y-4"> to the end) */}
            {/* It is identical to what you provided */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-2">Items Sold</h4>
              {isEditing ? (
                <textarea
                  value={editItems}
                  onChange={(e) => setEditItems(e.target.value)}
                  className="w-full p-3 brutal-input min-h-[72px] resize-none"
                />
              ) : (
                <div className="space-y-1">
                  {selectedEntry.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-medium">
                      <span className="w-1.5 h-1.5 bg-success rounded-full" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-2">Expenses</h4>
              {isEditing ? (
                <textarea
                  value={editExpenses}
                  onChange={(e) => setEditExpenses(e.target.value)}
                  className="w-full p-3 brutal-input min-h-[72px] resize-none"
                />
              ) : (
                <div className="space-y-1">
                  {selectedEntry.expenseBreakdown.map((exp, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-medium">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full" />
                      {exp}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold uppercase tracking-wide">Voice Transcript</h4>
                <BrutalButton variant="outline" size="sm" onClick={handlePlayback}>
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />} Playback
                </BrutalButton>
              </div>
              {isEditing ? (
                <textarea
                  value={editTranscript}
                  onChange={(e) => setEditTranscript(e.target.value)}
                  className="w-full p-3 brutal-input min-h-[100px] resize-none"
                />
              ) : (
                <div className="p-3 brutal-border bg-muted text-sm leading-relaxed">
                  {selectedEntry.transcript.split(" ").map((word, i) => (
                    <span key={i} className={i === highlightIndex ? "bg-primary text-primary-foreground px-0.5" : ""}>
                      {word}{" "}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center brutal-border p-2 bg-success/10">
                <p className="text-xs font-bold uppercase text-muted-foreground">Earned</p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editEarnings}
                    onChange={(e) => setEditEarnings(e.target.value)}
                    className="w-full p-1 brutal-input text-center"
                  />
                ) : (
                  <p className="font-mono font-bold text-success">₹{selectedEntry.earnings}</p>
                )}
              </div>
              <div className="text-center brutal-border p-2 bg-destructive/10">
                <p className="text-xs font-bold uppercase text-muted-foreground">Spent</p>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editSpent}
                    onChange={(e) => setEditSpent(e.target.value)}
                    className="w-full p-1 brutal-input text-center"
                  />
                ) : (
                  <p className="font-mono font-bold text-destructive">₹{selectedEntry.expenses}</p>
                )}
              </div>
              <div className="text-center brutal-border p-2 bg-secondary/10">
                <p className="text-xs font-bold uppercase text-muted-foreground">Profit</p>
                <p className="font-mono font-bold text-secondary">
                  ₹{isEditing ? (Number(editEarnings || "0") - Number(editSpent || "0")) : selectedEntry.profit}
                </p>
              </div>
            </div>


          </div>
        )}
      </BrutalModal>
    </AppLayout>
  );
}