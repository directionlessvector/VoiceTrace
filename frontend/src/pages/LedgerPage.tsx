import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalBadge } from "@/components/shared/BrutalBadge";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { BrutalInput } from "@/components/shared/BrutalInput";
import { BrutalModal } from "@/components/shared/BrutalModal";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { ledgerEntries } from "@/data/mockData";
import { Search, Play, X } from "lucide-react";

export default function LedgerPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<(typeof ledgerEntries)[0] | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const filtered = ledgerEntries.filter(
    (e) => e.date.includes(search) || e.items.some((i) => i.toLowerCase().includes(search.toLowerCase()))
  );

  const handlePlayback = () => {
    if (!selectedEntry) return;
    const words = selectedEntry.transcript.split(" ");
    let i = 0;
    const interval = setInterval(() => {
      setHighlightIndex(i);
      i++;
      if (i >= words.length) { clearInterval(interval); setTimeout(() => setHighlightIndex(-1), 500); }
    }, 200);
  };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /><SkeletonLoader type="card" /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Ledger</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-10 pr-4 py-2.5 brutal-input"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <BrutalCard className="text-center py-12">
            <p className="text-lg font-bold text-muted-foreground">No entries found</p>
            <p className="text-sm text-muted-foreground">Try a different search term</p>
          </BrutalCard>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <BrutalCard key={entry.id} className="cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 transition-transform" onClick={() => setSelectedEntry(entry)}>
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
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <BrutalModal open={!!selectedEntry} onClose={() => { setSelectedEntry(null); setHighlightIndex(-1); }} title="Entry Details">
        {selectedEntry && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">{selectedEntry.date}</p>
              <BrutalBadge variant={selectedEntry.status === "confirmed" ? "confirmed" : "approximate"}>
                {Math.round(selectedEntry.confidence * 100)}% confident
              </BrutalBadge>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-2">Items Sold</h4>
              <div className="space-y-1">
                {selectedEntry.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-medium">
                    <span className="w-1.5 h-1.5 bg-success rounded-full" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-2">Expenses</h4>
              <div className="space-y-1">
                {selectedEntry.expenseBreakdown.map((exp, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-medium">
                    <span className="w-1.5 h-1.5 bg-destructive rounded-full" />
                    {exp}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold uppercase tracking-wide">Voice Transcript</h4>
                <BrutalButton variant="outline" size="sm" onClick={handlePlayback}>
                  <Play size={14} /> Playback
                </BrutalButton>
              </div>
              <div className="p-3 brutal-border bg-muted text-sm leading-relaxed">
                {selectedEntry.transcript.split(" ").map((word, i) => (
                  <span key={i} className={i === highlightIndex ? "bg-primary text-primary-foreground px-0.5" : ""}>
                    {word}{" "}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center brutal-border p-2 bg-success/10">
                <p className="text-xs font-bold uppercase text-muted-foreground">Earned</p>
                <p className="font-mono font-bold text-success">₹{selectedEntry.earnings}</p>
              </div>
              <div className="text-center brutal-border p-2 bg-destructive/10">
                <p className="text-xs font-bold uppercase text-muted-foreground">Spent</p>
                <p className="font-mono font-bold text-destructive">₹{selectedEntry.expenses}</p>
              </div>
              <div className="text-center brutal-border p-2 bg-secondary/10">
                <p className="text-xs font-bold uppercase text-muted-foreground">Profit</p>
                <p className="font-mono font-bold text-secondary">₹{selectedEntry.profit}</p>
              </div>
            </div>
          </div>
        )}
      </BrutalModal>
    </AppLayout>
  );
}
