import { useState, useEffect } from "react";
import { AppLayout } from "@/layouts/AppLayout";
import { BrutalCard } from "@/components/shared/BrutalCard";
import { BrutalButton } from "@/components/shared/BrutalButton";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { listCurrentUserLedgerEntries, type LedgerEntry } from "@/lib/ledgerApi";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type AppLanguage } from "@/contexts/LanguageContext";
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

type JsPdfWithVfs = jsPDF & {
  addFileToVFS: (filename: string, fileData: string) => void;
  addFont: (postScriptName: string, id: string, fontStyle: string, fontWeight?: string | number) => void;
};

const loadedPdfFonts = new Set<string>();

async function fetchFontBinaryString(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return binary;
}

function getPdfFontMeta(language: AppLanguage): { vfsName: string; fontName: string; url: string } | null {
  if (language === "hi" || language === "mr") {
    return {
      vfsName: "NotoSansDevanagari-Regular.ttf",
      fontName: "NotoSansDevanagari",
      url: "/fonts/NotoSansDevanagari-Regular.ttf",
    };
  }

  if (language === "ta") {
    return {
      vfsName: "NotoSansTamil-Regular.ttf",
      fontName: "NotoSansTamil",
      url: "/fonts/NotoSansTamil-Regular.ttf",
    };
  }

  if (language === "te") {
    return {
      vfsName: "NotoSansTelugu-Regular.ttf",
      fontName: "NotoSansTelugu",
      url: "/fonts/NotoSansTelugu-Regular.ttf",
    };
  }

  return null;
}

async function ensurePdfFont(doc: jsPDF, language: AppLanguage): Promise<string> {
  const meta = getPdfFontMeta(language);
  if (!meta) return "helvetica";

  const bridge = doc as JsPdfWithVfs;
  if (!loadedPdfFonts.has(meta.vfsName)) {
    const binary = await fetchFontBinaryString(meta.url);
    bridge.addFileToVFS(meta.vfsName, binary);
    // Register same font file for normal and bold to preserve existing style calls.
    bridge.addFont(meta.vfsName, meta.fontName, "normal");
    bridge.addFont(meta.vfsName, meta.fontName, "bold");
    loadedPdfFonts.add(meta.vfsName);
  }

  return meta.fontName;
}

type ReportCopy = {
  reportTitle: string;
  weeklyReport: string;
  vendorDetails: string;
  vendorName: string;
  vendorBusiness: string;
  vendorDateRange: string;
  financialSummary: string;
  totalEarnings: string;
  totalExpenses: string;
  netProfit: string;
  topItemsAndExpenses: string;
  topItems: string;
  expenseBreakdown: string;
  keyInsights: string;
  dailySummary: string;
  day: string;
  earnings: string;
  expenses: string;
  profit: string;
  reportId: string;
  generated: string;
  qrVerified: string;
  unknown: string;
  businessFallback: string;
  marginLine: (margin: string) => string;
  bestDayLine: (day: string, amount: string) => string;
  noDailyData: string;
  expensesHigh: string;
  expensesHealthy: string;
  exportFileBase: string;
  pageTitle: string;
  pageLoadErrorPrefix: string;
  downloadIncomeReportPdf: string;
  reportDescription: string;
  generatePdf: string;
  csvExport: string;
  auditReady: string;
  auditReadyDesc: string;
  livePreview: string;
  active: string;
  totalRevenue: string;
  operationalCosts: string;
  netAuditoryProfit: string;
  ytdProjection: string;
  goalSuffix: string;
  totalEntries: string;
  growthRate: string;
  recentExports: string;
  generatedMeta: string;
  download: string;
  archiveButton: string;
};

const REPORT_COPY: Record<AppLanguage, ReportCopy> = {
  en: {
    reportTitle: "VoiceTrace Income Summary",
    weeklyReport: "Weekly Report",
    vendorDetails: "Vendor Details",
    vendorName: "Name",
    vendorBusiness: "Business",
    vendorDateRange: "Date Range",
    financialSummary: "Financial Summary",
    totalEarnings: "Total Earnings",
    totalExpenses: "Total Expenses",
    netProfit: "Net Profit",
    topItemsAndExpenses: "Top Items & Expense Breakdown",
    topItems: "Top Items",
    expenseBreakdown: "Expense Breakdown",
    keyInsights: "Key Insights",
    dailySummary: "Daily Summary",
    day: "Day",
    earnings: "Earnings",
    expenses: "Expenses",
    profit: "Profit",
    reportId: "Report ID",
    generated: "Generated",
    qrVerified: "Verified QR includes report metadata",
    unknown: "Unknown",
    businessFallback: "Business",
    marginLine: (margin) => `Net margin is ${margin}% for this period.`,
    bestDayLine: (day, amount) => `Highest earning day: ${day} (Rs ${amount}).`,
    noDailyData: "No daily data available yet.",
    expensesHigh: "Expenses are relatively high. Review purchase and transport costs.",
    expensesHealthy: "Expense ratio is healthy. Continue current cost discipline.",
    exportFileBase: "VoiceTrace-report",
    pageTitle: "Financial Reports",
    pageLoadErrorPrefix: "Failed to load report data",
    downloadIncomeReportPdf: "DOWNLOAD INCOME REPORT (PDF)",
    reportDescription: "Generate a comprehensive audit of all voice-tracked entries filtered by your business parameters. This export includes tax-ready formatting and ledger reconciliation.",
    generatePdf: "Generate PDF",
    csvExport: "CSV Export",
    auditReady: "AUDIT READY",
    auditReadyDesc: "All reports are strictly compliant with the 2026 ledger audit format and export standards.",
    livePreview: "Live Preview",
    active: "ACTIVE",
    totalRevenue: "Total Revenue",
    operationalCosts: "Operational Costs",
    netAuditoryProfit: "Net Auditory Profit",
    ytdProjection: "YTD Projection: 2026",
    goalSuffix: "Goal",
    totalEntries: "Total Entries",
    growthRate: "Growth Rate",
    recentExports: "Recent Exports",
    generatedMeta: "Generated",
    download: "Download",
    archiveButton: "View Archive (124 More)",
  },
  hi: {
    reportTitle: "वॉइसट्रेस आय सारांश",
    weeklyReport: "साप्ताहिक रिपोर्ट",
    vendorDetails: "विक्रेता विवरण",
    vendorName: "नाम",
    vendorBusiness: "व्यवसाय",
    vendorDateRange: "तिथि सीमा",
    financialSummary: "वित्तीय सारांश",
    totalEarnings: "कुल कमाई",
    totalExpenses: "कुल खर्च",
    netProfit: "शुद्ध लाभ",
    topItemsAndExpenses: "शीर्ष आइटम और खर्च विवरण",
    topItems: "शीर्ष आइटम",
    expenseBreakdown: "खर्च विवरण",
    keyInsights: "मुख्य इनसाइट्स",
    dailySummary: "दैनिक सारांश",
    day: "दिन",
    earnings: "कमाई",
    expenses: "खर्च",
    profit: "लाभ",
    reportId: "रिपोर्ट आईडी",
    generated: "जनरेटेड",
    qrVerified: "सत्यापित QR में रिपोर्ट मेटाडेटा शामिल है",
    unknown: "अज्ञात",
    businessFallback: "व्यवसाय",
    marginLine: (margin) => `इस अवधि के लिए शुद्ध मार्जिन ${margin}% है।`,
    bestDayLine: (day, amount) => `सबसे अधिक कमाई वाला दिन: ${day} (Rs ${amount}).`,
    noDailyData: "अभी दैनिक डेटा उपलब्ध नहीं है।",
    expensesHigh: "खर्च अपेक्षाकृत अधिक हैं। खरीद और परिवहन लागत की समीक्षा करें।",
    expensesHealthy: "खर्च अनुपात स्वस्थ है। इसी अनुशासन को जारी रखें।",
    exportFileBase: "VoiceTrace-report-hi",
    pageTitle: "वित्तीय रिपोर्ट्स",
    pageLoadErrorPrefix: "रिपोर्ट डेटा लोड नहीं हो सका",
    downloadIncomeReportPdf: "आय रिपोर्ट डाउनलोड करें (PDF)",
    reportDescription: "आपके व्यवसाय मानकों के अनुसार सभी वॉयस एंट्री का विस्तृत ऑडिट बनाएं। इस एक्सपोर्ट में टैक्स-रेडी फॉर्मेट और लेजर रिकंसिलिएशन शामिल है।",
    generatePdf: "PDF बनाएं",
    csvExport: "CSV एक्सपोर्ट",
    auditReady: "ऑडिट रेडी",
    auditReadyDesc: "सभी रिपोर्ट्स 2026 लेजर ऑडिट फॉर्मेट और एक्सपोर्ट मानकों के अनुरूप हैं।",
    livePreview: "लाइव प्रीव्यू",
    active: "सक्रिय",
    totalRevenue: "कुल राजस्व",
    operationalCosts: "संचालन लागत",
    netAuditoryProfit: "शुद्ध लाभ",
    ytdProjection: "YTD प्रोजेक्शन: 2026",
    goalSuffix: "लक्ष्य",
    totalEntries: "कुल एंट्री",
    growthRate: "वृद्धि दर",
    recentExports: "हालिया एक्सपोर्ट",
    generatedMeta: "जनरेटेड",
    download: "डाउनलोड",
    archiveButton: "आर्काइव देखें (124 और)",
  },
  mr: {} as ReportCopy,
  ta: {} as ReportCopy,
  te: {} as ReportCopy,
};

REPORT_COPY.mr = REPORT_COPY.en;
REPORT_COPY.ta = REPORT_COPY.en;
REPORT_COPY.te = REPORT_COPY.en;

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

function formatRangeDate(dateKey: string, locale: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

function getPeriodRange(period: Period, locale: string): { fromDate: string; toDate: string; label: string } {
  const today = new Date();
  const toDate = dateToKeyLocal(today);

  if (period === "Weekly") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    const fromDate = dateToKeyLocal(from);
    return {
      fromDate,
      toDate,
      label: `${formatRangeDate(fromDate, locale)} - ${formatRangeDate(toDate, locale)}`,
    };
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = dateToKeyLocal(monthStart);
  return {
    fromDate,
    toDate,
    label: `${formatRangeDate(fromDate, locale)} - ${formatRangeDate(toDate, locale)}`,
  };
}

function buildDailySeries(entries: LedgerEntry[], fromDate: string, toDate: string, locale: string): DailyReportPoint[] {
  const map = new Map<string, DailyReportPoint>();

  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateToKeyLocal(d);
    const day = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    map.set(key, { day, date: key, earnings: 0, expenses: 0 });
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
  copy: ReportCopy,
  totalEarnings: number,
  totalExpenses: number,
  profit: number,
  weekly: Array<{ day: string; earnings: number; expenses: number }>
): string[] {
  const margin = totalEarnings > 0 ? (profit / totalEarnings) * 100 : 0;
  const bestDay = [...weekly].sort((a, b) => b.earnings - a.earnings)[0];
  return [
    copy.marginLine(margin.toFixed(1)),
    bestDay
      ? copy.bestDayLine(bestDay.day, bestDay.earnings.toLocaleString())
      : copy.noDailyData,
    totalExpenses > totalEarnings * 0.6
      ? copy.expensesHigh
      : copy.expensesHealthy,
  ];
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const copy = REPORT_COPY[language] || REPORT_COPY.en;
  const locale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : language === "ta" ? "ta-IN" : language === "te" ? "te-IN" : "en-IN";
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
        const map = new Map<string, { day: string; earnings: number; expenses: number }>();
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const day = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
          map.set(dateStr, { day, earnings: 0, expenses: 0 });
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
  }, [locale]);

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

  const formatNumberForReport = (value: number) => {
    const rounded = Math.round(value);
    if (language === "hi" || language === "mr") {
      return new Intl.NumberFormat("hi-IN-u-nu-deva").format(rounded);
    }
    return new Intl.NumberFormat(locale).format(rounded);
  };

  const formatCurrencyForReport = (value: number) => {
    return `₹${formatNumberForReport(value)}`;
  };

  const formatCurrency = (value: number) => `₹${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const downloadCsv = async () => {
    const { fromDate, toDate } = getPeriodRange("Monthly", locale);
    const monthlyEntries = await listCurrentUserLedgerEntries({ fromDate, toDate });
    const series = buildDailySeries(monthlyEntries, fromDate, toDate, locale);

    const headers = [copy.day, copy.earnings, copy.expenses, copy.profit];
    const rows = series.map((day) => [
      day.day,
      day.earnings.toString(),
      day.expenses.toString(),
      (day.earnings - day.expenses).toString(),
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${copy.exportFileBase}.csv`;
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

      const { fromDate, toDate, label: dateRangeLabel } = getPeriodRange(type, locale);
      const periodEntries = await listCurrentUserLedgerEntries({ fromDate, toDate });
      const dailySeries = buildDailySeries(periodEntries, fromDate, toDate, locale);

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
      const pdfFont = await ensurePdfFont(doc, language);
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
        doc.setFont(pdfFont, "bold");
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
      doc.setFont(pdfFont, "bold");
      doc.setFontSize(18);
      doc.text(copy.reportTitle, margin + 24, 16);
      doc.setFont(pdfFont, "normal");
      doc.setFontSize(10);
      doc.text(type === "Weekly" ? copy.weeklyReport : t("page.reports"), margin + 24, 23);
      y = headerHeight + sectionGap;

      // Vendor Details
      drawSectionTitle(copy.vendorDetails);
      doc.setFont(pdfFont, "normal");
      doc.setFontSize(10);
      const vendorLines = [
        `${copy.vendorName}: ${user?.name ?? copy.unknown}`,
        `${copy.vendorBusiness}: ${user?.businessType ?? copy.businessFallback}`,
        `${copy.vendorDateRange}: ${dateRangeLabel}`,
      ];
      addPageIfNeeded(vendorLines.length * lineHeight + sectionGap);
      vendorLines.forEach((line) => {
        doc.text(line, margin, y);
        y += lineHeight;
      });
      y += sectionGap;

      // Financial Summary
      drawSectionTitle(copy.financialSummary);
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
        doc.setFont(pdfFont, "bold");
        doc.setFontSize(9);
        doc.setTextColor(black[0], black[1], black[2]);
        doc.text(title, x + 3, summaryY + 6);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFontSize(11);
        doc.text(value, x + 3, summaryY + 13);
      };
      drawMetric(margin, copy.totalEarnings, formatCurrencyForReport(totalEarnings), primary);
      drawMetric(margin + boxW + boxGap, copy.totalExpenses, formatCurrencyForReport(totalExpenses), [220, 38, 38]);
      drawMetric(margin + (boxW + boxGap) * 2, copy.netProfit, formatCurrencyForReport(profit), success);
      y += boxH + sectionGap;

      // Two-column section (Top Items + Expenses)
      drawSectionTitle(copy.topItemsAndExpenses);
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

        doc.setFont(pdfFont, "bold");
        doc.setFontSize(11);
        doc.setTextColor(black[0], black[1], black[2]);
        doc.text(title, x, colY);
        colY += 5;

        doc.setFont(pdfFont, "normal");
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

      yLeft = drawColumnList(
        leftX,
        copy.topItems,
        buildTopItems(periodEntries).map((line) => line.replace(/Rs\s*(\d[\d,]*)/g, (_m, n) => `₹${formatNumberForReport(Number(n.replace(/,/g, "")))}`)),
        yLeft
      );
      yRight = drawColumnList(
        rightX,
        copy.expenseBreakdown,
        buildExpenseBreakdown(periodEntries).map((line) => line.replace(/Rs\s*(\d[\d,]*)/g, (_m, n) => `₹${formatNumberForReport(Number(n.replace(/,/g, "")))}`)),
        yRight
      );
      y = Math.max(yLeft, yRight) + sectionGap;

      // Insights
      drawSectionTitle(copy.keyInsights);
      doc.setFont(pdfFont, "normal");
      doc.setFontSize(9);
      const insights = buildInsights(copy, totalEarnings, totalExpenses, profit, dailySeries).map((line) =>
        line.replace(/Rs\s*(\d[\d,]*)/g, (_m, n) => `₹${formatNumberForReport(Number(n.replace(/,/g, "")))}`)
      );
      insights.forEach((insight) => {
        const wrapped = doc.splitTextToSize(`- ${insight}`, contentWidth);
        const blockHeight = wrapped.length * lineHeight;
        addPageIfNeeded(blockHeight);
        doc.text(wrapped, margin, y);
        y += blockHeight;
      });
      y += sectionGap;

      // Table
      drawSectionTitle(copy.dailySummary);
      const headerRowH = 7;
      addPageIfNeeded(headerRowH + 6.5);
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(margin, y, contentWidth, headerRowH, "F");
      doc.setDrawColor(black[0], black[1], black[2]);
      doc.rect(margin, y, contentWidth, headerRowH, "S");
      doc.setFont(pdfFont, "bold");
      doc.setFontSize(9);
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text(copy.day, margin + 2, y + 4.7);
      doc.text(copy.earnings, margin + 48, y + 4.7);
      doc.text(copy.expenses, margin + 96, y + 4.7);
      doc.text(copy.profit, margin + 144, y + 4.7);
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
        doc.setFont(pdfFont, "normal");
        doc.setFontSize(8.8);
        doc.setTextColor(black[0], black[1], black[2]);
        doc.text(r.day, margin + 2, y + 4.2);
        doc.text(formatCurrencyForReport(r.earnings), margin + 48, y + 4.2);
        doc.text(formatCurrencyForReport(r.expenses), margin + 96, y + 4.2);
        doc.setTextColor(success[0], success[1], success[2]);
        doc.text(formatCurrencyForReport(profitDay), margin + 144, y + 4.2);
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
      doc.setFont(pdfFont, "normal");
      doc.setFontSize(8.5);
      doc.text(`${copy.reportId}: ${reportId}`, margin, footerY + 6);
      doc.text(`${copy.generated}: ${new Date().toLocaleString(locale)}`, margin, footerY + 11);
      doc.text(copy.qrVerified, margin, footerY + 16);

      const qrSize = 22;
      doc.addImage(qrDataUrl, "PNG", pageWidth - margin - qrSize, footerY + 3, qrSize, qrSize);

      doc.save(`${copy.exportFileBase}-${type.toLowerCase()}.pdf`);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : copy.pageLoadErrorPrefix);
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
        <h1 className="text-2xl md:text-3xl font-bold">{t("page.reports")}</h1>

        {fetchError && (
          <BrutalCard className="text-center py-6 border-destructive">
            <p className="text-destructive font-bold">{copy.pageLoadErrorPrefix}: {fetchError}</p>
          </BrutalCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BrutalCard className="p-6">
            <div className="flex items-start gap-3">
              <FileText size={28} className="text-primary" />
              <div>
                <h2 className="text-2xl font-bold leading-tight">{copy.downloadIncomeReportPdf}</h2>
                <p className="text-muted-foreground mt-3 font-medium">
                  {copy.reportDescription}
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
                <Download size={16} /> {copy.generatePdf}
              </BrutalButton>
              <BrutalButton variant="outline" className="w-full sm:w-auto" onClick={() => void downloadCsv()}>
                {copy.csvExport}
              </BrutalButton>
            </div>
          </BrutalCard>

          <BrutalCard className="p-6 bg-primary text-primary-foreground brutal-shadow">
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full brutal-border bg-white/95 flex items-center justify-center mb-4">
                <ShieldCheck size={30} className="text-primary" />
              </div>
              <h3 className="text-3xl font-bold tracking-tight">{copy.auditReady}</h3>
              <p className="mt-3 text-primary-foreground/90 font-medium max-w-sm">
                {copy.auditReadyDesc}
              </p>
            </div>
          </BrutalCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <BrutalCard className="p-6" highlight="primary">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{copy.livePreview}</h3>
              <span className="px-2 py-1 text-xs font-bold brutal-border bg-success/20 text-success">{copy.active}</span>
            </div>

            <div className="mt-6 space-y-4 font-mono">
              <div className="flex items-center justify-between border-b-[2px] border-border pb-2">
                <span className="text-sm font-bold uppercase text-muted-foreground">{copy.totalRevenue}</span>
                <span className="text-3xl font-bold text-primary">{formatCurrencyForReport(allTimeEarnings)}</span>
              </div>
              <div className="flex items-center justify-between border-b-[2px] border-border pb-2">
                <span className="text-sm font-bold uppercase text-muted-foreground">{copy.operationalCosts}</span>
                <span className="text-3xl font-bold text-destructive">({formatCurrencyForReport(allTimeExpenses)})</span>
              </div>
              <div className="brutal-border p-4 bg-success/10">
                <p className="text-sm font-bold uppercase text-muted-foreground">{copy.netAuditoryProfit}</p>
                <p className="text-4xl font-bold text-success mt-1">{formatCurrencyForReport(allTimeProfit)}</p>
              </div>
            </div>
          </BrutalCard>

          <BrutalCard className="p-6" highlight="secondary">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              <h3 className="text-2xl font-bold">{copy.ytdProjection}</h3>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 brutal-border h-10 bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${projectionGoal}%` }} />
                </div>
                <span className="text-3xl font-bold">{projectionGoal}% {copy.goalSuffix}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="brutal-border p-4 bg-primary/15">
                <p className="text-xs font-bold uppercase text-muted-foreground">{copy.totalEntries}</p>
                <p className="text-3xl font-bold mt-1">{entries.length.toLocaleString()}</p>
              </div>
              <div className="brutal-border p-4 bg-secondary/15">
                <p className="text-xs font-bold uppercase text-muted-foreground">{copy.growthRate}</p>
                <p className="text-3xl font-bold text-primary mt-1">+{growthRate.toFixed(1)}%</p>
              </div>
            </div>
          </BrutalCard>
        </div>

        <div className="mt-6">
          <BrutalCard className="p-6" highlight="accent">
            <div className="flex items-center gap-3 border-b-[3px] border-border pb-3 mb-4">
              <Sparkles size={20} className="text-primary" />
              <h3 className="text-2xl font-bold">{copy.recentExports}</h3>
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
                          {copy.generatedMeta}: {item.date} • {item.size} • {user?.businessType ?? copy.businessFallback}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <BrutalButton variant="primary" size="sm" onClick={() => downloadExport(item.type)}>
                        <Download size={15} /> {copy.download}
                      </BrutalButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button className="font-bold uppercase text-sm border-b-[3px] border-accent pb-1">{copy.archiveButton}</button>
            </div>
          </BrutalCard>
        </div>
      </div>
    </AppLayout>
  );
}
