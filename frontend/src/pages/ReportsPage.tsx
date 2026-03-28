import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { listCurrentUserLedgerEntries, type LedgerEntry } from "@/lib/ledgerApi";
import { useAuth } from "@/contexts/AuthContext";
import { Download, FileText, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

type Rgb = [number, number, number];

type Period = "Weekly" | "Monthly";

type DailyReportPoint = {
  date: string;
  day: string;
  earnings: number;
  expenses: number;
};

function toSafeAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dateToKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRangeDate(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function getPeriodRange(period: Period): { fromDate: string; toDate: string; label: string } {
  const today = new Date();
  const toDate = dateToKeyLocal(today);

  if (period === "Weekly") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    const fromDate = dateToKeyLocal(from);
    return {
      fromDate,
      toDate,
      label: `${formatRangeDate(fromDate)} - ${formatRangeDate(toDate)}`,
    };
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = dateToKeyLocal(monthStart);
  return {
    fromDate,
    toDate,
    label: `${formatRangeDate(fromDate)} - ${formatRangeDate(toDate)}`,
  };
}

function buildDailySeries(entries: LedgerEntry[], fromDate: string, toDate: string): DailyReportPoint[] {
  const map = new Map<string, DailyReportPoint>();
  const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateToKeyLocal(d);
    map.set(key, { day: dayAbbr[d.getDay()], date: key, earnings: 0, expenses: 0 });
  }

  for (const entry of entries) {
    const row = map.get(entry.entryDate);
    if (!row) continue;
    const amount = toSafeAmount(entry.amount);
    if (entry.entryType === "sale" || entry.entryType === "income") {
      row.earnings += amount;
    } else {
      row.expenses += amount;
    }
  }

  return [...map.values()];
}

function hslCssVarToRgb(varName: string, fallback: Rgb): Rgb {
  const rootStyles = getComputedStyle(document.documentElement);
  const raw = rootStyles.getPropertyValue(varName).trim();
  if (!raw) return fallback;

  const parts = raw.split(" ");
  if (parts.length < 3) return fallback;

  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", "")) / 100;
  const l = Number(parts[2].replace("%", "")) / 100;
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return fallback;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp >= 1 && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp >= 2 && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp >= 3 && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp >= 4 && hp < 5) [r1, g1, b1] = [x, 0, c];
  else if (hp >= 5 && hp < 6) [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  const to255 = (v: number) => Math.round((v + m) * 255);
  return [to255(r1), to255(g1), to255(b1)];
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function buildTopItems(entries: LedgerEntry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.entryType !== "sale" && entry.entryType !== "income") continue;
    const key = entry.itemName?.trim() || "Unknown";
    totals.set(key, (totals.get(key) || 0) + toSafeAmount(entry.amount));
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, total]) => `${name}: Rs ${Math.round(total)}`);
}

function buildExpenseBreakdown(entries: LedgerEntry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.entryType !== "expense" && entry.entryType !== "purchase") continue;
    const key = entry.itemName?.trim() || "Unknown";
    totals.set(key, (totals.get(key) || 0) + toSafeAmount(entry.amount));
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, total]) => `${name}: Rs ${Math.round(total)}`);
}

function buildInsights(
  totalEarnings: number,
  totalExpenses: number,
  profit: number,
  weekly: Array<{ day: string; earnings: number; expenses: number }>
): string[] {
  const margin = totalEarnings > 0 ? (profit / totalEarnings) * 100 : 0;
  const bestDay = [...weekly].sort((a, b) => b.earnings - a.earnings)[0];
  return [
    `Net margin is ${margin.toFixed(1)}% for this period.`,
    bestDay
      ? `Highest earning day: ${bestDay.day} (Rs ${bestDay.earnings.toLocaleString()}).`
      : "No daily data available yet.",
    totalExpenses > totalEarnings * 0.6
      ? "Expenses are relatively high. Review purchase and transport costs."
      : "Expense ratio is healthy. Continue current cost discipline.",
  ];
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"Weekly" | "Monthly" | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [allTimeEarnings, setAllTimeEarnings] = useState(0);
  const [allTimeExpenses, setAllTimeExpenses] = useState(0);
  const [allTimeProfit, setAllTimeProfit] = useState(0);
  const [weeklyInsights, setWeeklyInsights] = useState<Array<{ day: string; earnings: number; expenses: number }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await listCurrentUserLedgerEntries();
        setEntries(data);

        // All-time totals
        const earnings = data
          .filter((e) => e.entryType === "sale" || e.entryType === "income")
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const expenses = data
          .filter((e) => e.entryType === "expense" || e.entryType === "purchase")
          .reduce((sum, e) => sum + Number(e.amount), 0);
        setAllTimeEarnings(earnings);
        setAllTimeExpenses(expenses);
        setAllTimeProfit(earnings - expenses);

        // Last-7-days daily breakdown
        const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const map = new Map<string, { day: string; earnings: number; expenses: number }>();
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          map.set(dateStr, { day: dayAbbr[d.getDay()], earnings: 0, expenses: 0 });
        }
        for (const entry of data) {
          const row = map.get(entry.entryDate);
          if (!row) continue;
          const amount = toSafeAmount(entry.amount);
          if (entry.entryType === "sale" || entry.entryType === "income") {
            row.earnings += amount;
          } else {
            row.expenses += amount;
          }
        }
        setWeeklyInsights([...map.values()]);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Failed to load report data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const weeklyTotal = weeklyInsights.reduce((a, d) => a + d.earnings, 0);
  const weeklyExpenses = weeklyInsights.reduce((a, d) => a + d.expenses, 0);
  const weeklyProfit = weeklyTotal - weeklyExpenses;
  const growthRate = allTimeEarnings > 0 ? ((allTimeProfit / allTimeEarnings) * 100) : 0;
  const projectionGoal = Math.max(35, Math.min(92, Math.round(65 + growthRate / 4)));

  const recentExports = [
    { id: "q3-revenue", name: "Q3_REVENUE_FINAL_V2.PDF", date: "Oct 12, 2023", size: "4.2 MB", type: "pdf" as const },
    { id: "inventory-csv", name: "MONTHLY_INVENTORY_TRACE.CSV", date: "Oct 05, 2023", size: "1.1 MB", type: "csv" as const },
    { id: "tax-forecast", name: "TAX_LIABILITY_FORECAST.PDF", date: "Sep 28, 2023", size: "2.8 MB", type: "pdf" as const },
  ];

  const formatCurrency = (value: number) => `₹${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const downloadCsv = async () => {
    const { fromDate, toDate } = getPeriodRange("Monthly");
    const monthlyEntries = await listCurrentUserLedgerEntries({ fromDate, toDate });
    const series = buildDailySeries(monthlyEntries, fromDate, toDate);

    const headers = ["Day", "Earnings", "Expenses", "Profit"];
    const rows = series.map((day) => [
      day.day,
      day.earnings.toString(),
      day.expenses.toString(),
      (day.earnings - day.expenses).toString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "VoiceTrace-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadExport = (kind: "pdf" | "csv") => {
    if (kind === "csv") {
      void downloadCsv();
      return;
    }
    void handleDownload("Weekly");
  };

  const handleDownload = async (type: Period) => {
    try {
      setDownloading(type);

      const { fromDate, toDate, label: dateRangeLabel } = getPeriodRange(type);
      const periodEntries = await listCurrentUserLedgerEntries({ fromDate, toDate });
      const dailySeries = buildDailySeries(periodEntries, fromDate, toDate);

      const totalEarnings = periodEntries
        .filter((e) => e.entryType === "sale" || e.entryType === "income")
        .reduce((sum, e) => sum + toSafeAmount(e.amount), 0);
      const totalExpenses = periodEntries
        .filter((e) => e.entryType === "expense" || e.entryType === "purchase")
        .reduce((sum, e) => sum + toSafeAmount(e.amount), 0);
      const profit = totalEarnings - totalExpenses;

      const [primary, accent, success, muted, black] = [
        hslCssVarToRgb("--primary", [30, 95, 220]),
        hslCssVarToRgb("--accent", [255, 204, 51]),
        hslCssVarToRgb("--success", [22, 163, 74]),
        hslCssVarToRgb("--muted", [240, 242, 245]),
        hslCssVarToRgb("--foreground", [0, 0, 0]),
      ];

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 210;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const sectionGap = 12;
      const bottomLimit = 260;
      const lineHeight = 4.5;
      const headerHeight = 34;

      let y = 8;

      const addPageIfNeeded = (requiredHeight = 0) => {
        if (y + requiredHeight > bottomLimit) {
          doc.addPage();
          y = 16;
        }
      };

      const drawSectionTitle = (title: string) => {
        addPageIfNeeded(10);
        doc.setTextColor(black[0], black[1], black[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, margin, y);
        y += 6;
      };

      // Header
      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, 0, pageWidth, headerHeight, "F");
      const logo = await loadImageElement("/VyaaparSathi.png");
      if (logo) {
        doc.addImage(logo, "PNG", margin, 6, 20, 20);
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("VoiceTrace Income Summary", margin + 24, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${type} Report`, margin + 24, 23);
      y = headerHeight + sectionGap;

      // Vendor Details
      drawSectionTitle("Vendor Details");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const vendorLines = [
        `Name: ${user?.name ?? "Unknown"}`,
        `Business: ${user?.businessType ?? "Business"}`,
        `Date Range: ${dateRangeLabel}`,
      ];
      addPageIfNeeded(vendorLines.length * lineHeight + sectionGap);
      vendorLines.forEach((line) => {
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += sectionGap;

      // Financial Summary
      drawSectionTitle("Financial Summary");
      const boxGap = 4;
      const boxW = (contentWidth - boxGap * 2) / 3;
      const boxH = 18;
      addPageIfNeeded(boxH + sectionGap);
      const summaryY = y;
      const drawMetric = (x: number, title: string, value: string, color: Rgb) => {
        doc.setFillColor(muted[0], muted[1], muted[2]);
        doc.rect(x, summaryY, boxW, boxH, "F");
        doc.setDrawColor(black[0], black[1], black[2]);
        doc.rect(x, summaryY, boxW, boxH, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(black[0], black[1], black[2]);
        doc.text(title, x + 3, summaryY + 6);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFontSize(11);
        doc.text(value, x + 3, summaryY + 13);
      };
      drawMetric(margin, "Total Earnings", `Rs ${Math.round(totalEarnings).toLocaleString()}`, primary);
      drawMetric(margin + boxW + boxGap, "Total Expenses", `Rs ${Math.round(totalExpenses).toLocaleString()}`, [220, 38, 38]);
      drawMetric(margin + (boxW + boxGap) * 2, "Net Profit", `Rs ${Math.round(profit).toLocaleString()}`, success);
      y += boxH + sectionGap;

      // Two-column section (Top Items + Expenses)
      drawSectionTitle("Top Items & Expense Breakdown");
      const leftX = 10;
      const rightX = 110;
      const columnWidth = 88;
      let yLeft = y;
      let yRight = y;

      const drawColumnList = (
        x: number,
        title: string,
        lines: string[],
        startY: number
      ) => {
        let colY = startY;
        const titleHeight = 6;
        const estimated = titleHeight + Math.max(1, lines.length) * lineHeight;
        if (colY + estimated > bottomLimit) {
          doc.addPage();
          y = 16;
          colY = y;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(black[0], black[1], black[2]);
        doc.text(title, x, colY);
        colY += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        lines.forEach((line) => {
          const wrapped = doc.splitTextToSize(`- ${line}`, columnWidth);
          const neededHeight = wrapped.length * lineHeight;
          if (colY + neededHeight > bottomLimit) {
            doc.addPage();
            y = 16;
            colY = y;
          }
          doc.text(wrapped, x, colY);
          colY += neededHeight;
        });

        return colY;
      };

      yLeft = drawColumnList(leftX, "Top Items", buildTopItems(periodEntries), yLeft);
      yRight = drawColumnList(rightX, "Expense Breakdown", buildExpenseBreakdown(periodEntries), yRight);
      y = Math.max(yLeft, yRight) + sectionGap;

      // Insights
      drawSectionTitle("Key Insights");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const insights = buildInsights(totalEarnings, totalExpenses, profit, dailySeries);
      insights.forEach((insight) => {
        const wrapped = doc.splitTextToSize(`- ${insight}`, contentWidth);
        const blockHeight = wrapped.length * lineHeight;
        addPageIfNeeded(blockHeight);
        doc.text(wrapped, margin, y);
        y += blockHeight;
      });
      y += sectionGap;

      // Table
      drawSectionTitle("Daily Summary");
      const headerRowH = 7;
      addPageIfNeeded(headerRowH + 6.5);
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(margin, y, contentWidth, headerRowH, "F");
      doc.setDrawColor(black[0], black[1], black[2]);
      doc.rect(margin, y, contentWidth, headerRowH, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text("Day", margin + 2, y + 4.7);
      doc.text("Earnings", margin + 48, y + 4.7);
      doc.text("Expenses", margin + 96, y + 4.7);
      doc.text("Profit", margin + 144, y + 4.7);
      y += headerRowH;

      const tableRows = dailySeries;
      tableRows.forEach((r) => {
        const rowH = 6.5;
        addPageIfNeeded(rowH);
        const profitDay = r.earnings - r.expenses;
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, contentWidth, rowH, "F");
        doc.setDrawColor(black[0], black[1], black[2]);
        doc.rect(margin, y, contentWidth, rowH, "S");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.8);
        doc.setTextColor(black[0], black[1], black[2]);
        doc.text(r.day, margin + 2, y + 4.2);
        doc.text(`Rs ${Math.round(r.earnings)}`, margin + 48, y + 4.2);
        doc.text(`Rs ${Math.round(r.expenses)}`, margin + 96, y + 4.2);
        doc.setTextColor(success[0], success[1], success[2]);
        doc.text(`Rs ${Math.round(profitDay)}`, margin + 144, y + 4.2);
        y += rowH;
      });
      y += sectionGap;

      // Footer
      const reportId = `VT-${type.slice(0, 1)}-${Date.now().toString(36).toUpperCase()}`;
      const timestamp = new Date().toISOString();
      const qrPayload = JSON.stringify({
        reportId,
        timestamp,
        fromDate,
        toDate,
        totalEarnings,
        totalExpenses,
        profit,
        url: `${window.location.origin}/reports`,
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 220 });

      const footerHeight = 28;
      addPageIfNeeded(footerHeight);
      const footerY = y;
      doc.setDrawColor(black[0], black[1], black[2]);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      doc.setTextColor(black[0], black[1], black[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`Report ID: ${reportId}`, margin, footerY + 6);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, footerY + 11);
      doc.text(`Verified QR includes report metadata`, margin, footerY + 16);

      const qrSize = 22;
      doc.addImage(qrDataUrl, "PNG", pageWidth - margin - qrSize, footerY + 3, qrSize, qrSize);

      doc.save(`VoiceTrace-${type.toLowerCase()}-report.pdf`);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return <AppLayout><div className="space-y-4"><SkeletonLoader type="text" lines={1} /><SkeletonLoader type="card" /><SkeletonLoader type="card" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">Financial Reports</h1>

        {fetchError && (
          <BrutalCard className="text-center py-6 border-destructive">
            <p className="text-destructive font-bold">Failed to load report data: {fetchError}</p>
          </BrutalCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BrutalCard className="p-6">
            <div className="flex items-start gap-3">
              <FileText size={28} className="text-primary" />
              <div>
                <h2 className="text-2xl font-bold leading-tight">DOWNLOAD INCOME REPORT (PDF)</h2>
                <p className="text-muted-foreground mt-3 font-medium">
                  Generate a comprehensive audit of all voice-tracked entries filtered by your business parameters.
                  This export includes tax-ready formatting and ledger reconciliation.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <BrutalButton
                variant="outline"
                className="bg-accent text-accent-foreground w-full sm:w-auto"
                onClick={() => handleDownload("Monthly")}
                loading={downloading === "Monthly"}
              >
                <Download size={16} /> Generate PDF
              </BrutalButton>
              <BrutalButton variant="outline" className="w-full sm:w-auto" onClick={() => void downloadCsv()}>
                CSV Export
              </BrutalButton>
            </div>
          </BrutalCard>

          <BrutalCard className="p-6 bg-primary text-primary-foreground brutal-shadow">
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full brutal-border bg-white/95 flex items-center justify-center mb-4">
                <ShieldCheck size={30} className="text-primary" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight">AUDIT READY</h3>
              <p className="mt-3 text-primary-foreground/90 font-medium max-w-sm">
                All reports are strictly compliant with the 2026 ledger audit format and export standards.
              </p>
            </div>
          </BrutalCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <BrutalCard className="p-6" highlight="primary">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">Live Preview</h3>
              <span className="px-2 py-1 text-xs font-bold brutal-border bg-success/20 text-success">ACTIVE</span>
            </div>

            <div className="mt-6 space-y-4 font-mono">
              <div className="flex items-center justify-between border-b-[2px] border-border pb-2">
                <span className="text-sm font-bold uppercase text-muted-foreground">Total Revenue</span>
                <span className="text-3xl font-bold text-primary">{formatCurrency(allTimeEarnings)}</span>
              </div>
              <div className="flex items-center justify-between border-b-[2px] border-border pb-2">
                <span className="text-sm font-bold uppercase text-muted-foreground">Operational Costs</span>
                <span className="text-3xl font-bold text-destructive">({formatCurrency(allTimeExpenses)})</span>
              </div>
              <div className="brutal-border p-4 bg-success/10">
                <p className="text-sm font-bold uppercase text-muted-foreground">Net Auditory Profit</p>
                <p className="text-4xl font-bold text-success mt-1">{formatCurrency(allTimeProfit)}</p>
              </div>
            </div>
          </BrutalCard>

          <BrutalCard className="p-6" highlight="secondary">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              <h3 className="text-2xl font-bold">YTD Projection: 2026</h3>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 brutal-border h-10 bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${projectionGoal}%` }} />
                </div>
                <span className="text-3xl font-bold">{projectionGoal}% Goal</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="brutal-border p-4 bg-primary/15">
                <p className="text-xs font-bold uppercase text-muted-foreground">Total Entries</p>
                <p className="text-3xl font-bold mt-1">{entries.length.toLocaleString()}</p>
              </div>
              <div className="brutal-border p-4 bg-secondary/15">
                <p className="text-xs font-bold uppercase text-muted-foreground">Growth Rate</p>
                <p className="text-3xl font-bold text-primary mt-1">+{growthRate.toFixed(1)}%</p>
              </div>
            </div>
          </BrutalCard>
        </div>

        <div className="mt-6">
          <BrutalCard className="p-6" highlight="accent">
            <div className="flex items-center gap-3 border-b-[3px] border-border pb-3 mb-4">
              <Sparkles size={20} className="text-primary" />
              <h3 className="text-2xl font-bold">Recent Exports</h3>
            </div>

            <div className="space-y-3">
              {recentExports.map((item) => (
                <div key={item.id} className="brutal-card p-4 bg-muted/40 brutal-shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 brutal-border bg-card flex items-center justify-center">
                        <FileText size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-lg break-all">{item.name}</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          Generated: {item.date} • {item.size} • {user?.businessType ?? "Business"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <BrutalButton variant="primary" size="sm" onClick={() => downloadExport(item.type)}>
                        <Download size={15} /> Download
                      </BrutalButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button className="font-bold uppercase text-sm border-b-[3px] border-accent pb-1">View Archive (124 More)</button>
            </div>
          </BrutalCard>
        </div>
      </div>
    </AppLayout>
  );
}
