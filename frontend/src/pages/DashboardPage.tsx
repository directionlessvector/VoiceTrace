import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { DollarSign, TrendingDown, TrendingUp, Mic, Lightbulb, PhoneCall } from "lucide-react";

type TrendInfo = {
  trend: "up" | "down" | "neutral";
  value: string;
};

type LocaleCopy = {
  greeting: string;
  fallbackName: string;
  overview: string;
  callAssistant: string;
  recordEntry: string;
  earnings: string;
  expenses: string;
  profit: string;
  vsLastWeek: string;
  newVsLastWeek: string;
  insightTitle: string;
  insightBody: string;
  recentActivity: string;
  noEntries: string;
  voiceSale: string;
  voiceExpense: string;
  callModalTitle: string;
  callModalDesc: string;
  startCall: string;
  quickClarification: string;
  approxDetected: string;
  uncertainLine: string;
  noTextAvailable: string;
  confirmApproxPrompt: string;
  correctedPlaceholder: string;
  keepApprox: string;
  submitCorrection: string;
};

const DASHBOARD_COPY: Record<string, LocaleCopy> = {
  en: {
    greeting: "Good morning",
    fallbackName: "there",
    overview: "Here's your business overview for today.",
    callAssistant: "Call Assistant",
    recordEntry: "Record Entry",
    earnings: "Earnings",
    expenses: "Expenses",
    profit: "Profit",
    vsLastWeek: "vs last week",
    newVsLastWeek: "new vs last week",
    insightTitle: "Weekend Boost!",
    insightBody: "You earn 40% more on weekends. Consider stocking extra on Fridays for maximum profit.",
    recentActivity: "Recent Activity",
    noEntries: "No entries yet. Record your first voice entry!",
    voiceSale: "Voice sale",
    voiceExpense: "Voice expense",
    callModalTitle: "Call Voice Assistant",
    callModalDesc: "Enter the phone number to receive the call. Use E.164 format like +919876543210.",
    startCall: "Start Call",
    quickClarification: "Quick Clarification Needed",
    approxDetected: "We detected an approximate voice entry and saved it so nothing is lost.",
    uncertainLine: "Uncertain line",
    noTextAvailable: "No text available",
    confirmApproxPrompt: "Is this entry okay as approximate? If not, enter corrected amount/value below.",
    correctedPlaceholder: "Enter corrected amount/value",
    keepApprox: "Yes, keep approximate",
    submitCorrection: "Submit correction",
  },
  hi: {
    greeting: "सुप्रभात",
    fallbackName: "मित्र",
    overview: "आज के लिए आपके व्यवसाय का सारांश यहां है।",
    callAssistant: "सहायक को कॉल करें",
    recordEntry: "एंट्री रिकॉर्ड करें",
    earnings: "कमाई",
    expenses: "खर्च",
    profit: "मुनाफा",
    vsLastWeek: "पिछले सप्ताह से",
    newVsLastWeek: "पिछले सप्ताह के मुकाबले नया",
    insightTitle: "वीकेंड बूस्ट!",
    insightBody: "वीकेंड पर आपकी कमाई 40% ज्यादा होती है। ज्यादा मुनाफे के लिए शुक्रवार को अतिरिक्त स्टॉक रखें।",
    recentActivity: "हाल की गतिविधि",
    noEntries: "अभी तक कोई एंट्री नहीं। अपनी पहली वॉयस एंट्री रिकॉर्ड करें!",
    voiceSale: "वॉयस बिक्री",
    voiceExpense: "वॉयस खर्च",
    callModalTitle: "वॉयस सहायक को कॉल करें",
    callModalDesc: "कॉल प्राप्त करने के लिए फोन नंबर दर्ज करें। E.164 फॉर्मेट जैसे +919876543210 का उपयोग करें।",
    startCall: "कॉल शुरू करें",
    quickClarification: "त्वरित स्पष्टीकरण आवश्यक",
    approxDetected: "हमें एक अनुमानित वॉयस एंट्री मिली और हमने उसे सुरक्षित कर लिया ताकि डेटा न खोए।",
    uncertainLine: "अस्पष्ट पंक्ति",
    noTextAvailable: "कोई टेक्स्ट उपलब्ध नहीं",
    confirmApproxPrompt: "क्या यह एंट्री अनुमानित रूप में सही है? नहीं तो नीचे सही राशि/वैल्यू दर्ज करें।",
    correctedPlaceholder: "सही राशि/वैल्यू दर्ज करें",
    keepApprox: "हाँ, अनुमानित ही रखें",
    submitCorrection: "सुधार सबमिट करें",
  },
  mr: {
    greeting: "शुभ सकाळ",
    fallbackName: "मित्रा",
    overview: "आजसाठी तुमच्या व्यवसायाचा आढावा येथे आहे.",
    callAssistant: "सहाय्यकाला कॉल करा",
    recordEntry: "नोंद रेकॉर्ड करा",
    earnings: "उत्पन्न",
    expenses: "खर्च",
    profit: "नफा",
    vsLastWeek: "मागील आठवड्याच्या तुलनेत",
    newVsLastWeek: "मागील आठवड्याच्या तुलनेत नवीन",
    insightTitle: "वीकेंड बूस्ट!",
    insightBody: "वीकेंडला तुमचे उत्पन्न 40% जास्त असते. जास्त नफ्यासाठी शुक्रवारी अतिरिक्त स्टॉक ठेवा.",
    recentActivity: "अलिकडील क्रियाकलाप",
    noEntries: "अजून नोंदी नाहीत. तुमची पहिली व्हॉइस नोंद रेकॉर्ड करा!",
    voiceSale: "व्हॉइस विक्री",
    voiceExpense: "व्हॉइस खर्च",
    callModalTitle: "व्हॉइस सहाय्यकाला कॉल करा",
    callModalDesc: "कॉल मिळवण्यासाठी फोन नंबर भरा. +919876543210 सारखा E.164 फॉरमॅट वापरा.",
    startCall: "कॉल सुरू करा",
    quickClarification: "त्वरित स्पष्टीकरण हवे",
    approxDetected: "आम्हाला अंदाजे व्हॉइस नोंद आढळली आणि डेटा न हरवता ती जतन केली.",
    uncertainLine: "अनिश्चित ओळ",
    noTextAvailable: "मजकूर उपलब्ध नाही",
    confirmApproxPrompt: "ही नोंद अंदाजे म्हणून योग्य आहे का? नसेल तर खाली योग्य रक्कम/मूल्य भरा.",
    correctedPlaceholder: "योग्य रक्कम/मूल्य भरा",
    keepApprox: "हो, अंदाजेच ठेवा",
    submitCorrection: "सुधारणा सबमिट करा",
  },
  ta: {
    greeting: "காலை வணக்கம்",
    fallbackName: "நண்பரே",
    overview: "இன்றைய உங்கள் வணிகத்தின் சுருக்கம் இங்கே.",
    callAssistant: "உதவியாளரை அழைக்கவும்",
    recordEntry: "பதிவு செய்",
    earnings: "வருவாய்",
    expenses: "செலவு",
    profit: "லாபம்",
    vsLastWeek: "கடந்த வாரத்துடன் ஒப்பிடுக",
    newVsLastWeek: "கடந்த வாரத்துடன் ஒப்பிடும் போது புதியது",
    insightTitle: "வார இறுதி உயர்வு!",
    insightBody: "வார இறுதியில் உங்கள் வருவாய் 40% அதிகம். அதிக லாபத்திற்கு வெள்ளிக்கிழமையிலே கூடுதல் ஸ்டாக் வைத்துக்கொள்ளுங்கள்.",
    recentActivity: "சமீப செயல்பாடுகள்",
    noEntries: "இன்னும் பதிவுகள் இல்லை. உங்கள் முதல் குரல் பதிவை சேமிக்கவும்!",
    voiceSale: "குரல் விற்பனை",
    voiceExpense: "குரல் செலவு",
    callModalTitle: "குரல் உதவியாளரை அழைக்கவும்",
    callModalDesc: "அழைப்பு பெற தொலைபேசி எண்ணை உள்ளிடுங்கள். +919876543210 போன்ற E.164 வடிவம் பயன்படுத்தவும்.",
    startCall: "அழைப்பை தொடங்கு",
    quickClarification: "விரைவான தெளிவு தேவை",
    approxDetected: "சுமார் குரல் பதிவு கண்டறியப்பட்டது, தரவு இழக்காமல் சேமித்துவைத்தோம்.",
    uncertainLine: "தெளிவில்லா வரி",
    noTextAvailable: "எழுத்து இல்லை",
    confirmApproxPrompt: "இந்த பதிவு சுமார் மதிப்பாக வைத்திருக்கலாமா? இல்லையெனில் சரியான மதிப்பை கீழே உள்ளிடுங்கள்.",
    correctedPlaceholder: "சரியான மதிப்பு உள்ளிடவும்",
    keepApprox: "ஆம், சுமார் மதிப்பாகவே வைக்கவும்",
    submitCorrection: "திருத்தம் சமர்ப்பிக்கவும்",
  },
  te: {
    greeting: "శుభోదయం",
    fallbackName: "మిత్రమా",
    overview: "ఈ రోజు మీ వ్యాపార సమీక్ష ఇది.",
    callAssistant: "అసిస్టెంట్‌కు కాల్ చేయండి",
    recordEntry: "ఎంట్రీ రికార్డ్ చేయండి",
    earnings: "ఆదాయం",
    expenses: "ఖర్చులు",
    profit: "లాభం",
    vsLastWeek: "గత వారంతో పోలిస్తే",
    newVsLastWeek: "గత వారంతో పోలిస్తే కొత్తది",
    insightTitle: "వీకెండ్ బూస్ట్!",
    insightBody: "వీకెండ్‌లో మీ ఆదాయం 40% ఎక్కువగా ఉంటుంది. ఎక్కువ లాభం కోసం శుక్రవారం అదనపు స్టాక్ పెట్టండి.",
    recentActivity: "ఇటీవలి కార్యకలాపాలు",
    noEntries: "ఇంకా ఎంట్రీలు లేవు. మీ మొదటి వాయిస్ ఎంట్రీని రికార్డ్ చేయండి!",
    voiceSale: "వాయిస్ అమ్మకం",
    voiceExpense: "వాయిస్ ఖర్చు",
    callModalTitle: "వాయిస్ అసిస్టెంట్‌కు కాల్ చేయండి",
    callModalDesc: "కాల్ పొందడానికి ఫోన్ నంబర్ ఇవ్వండి. +919876543210 లాంటి E.164 ఫార్మాట్ వాడండి.",
    startCall: "కాల్ ప్రారంభించండి",
    quickClarification: "త్వరిత స్పష్టీకరణ అవసరం",
    approxDetected: "సుమారుగా ఉన్న వాయిస్ ఎంట్రీని గుర్తించాం, డేటా కోల్పోకుండా సేవ్ చేశాం.",
    uncertainLine: "అస్పష్టమైన లైన్",
    noTextAvailable: "టెక్స్ట్ అందుబాటులో లేదు",
    confirmApproxPrompt: "ఈ ఎంట్రీని సుమారుగా ఉంచాలా? లేదంటే కరెక్ట్ విలువను క్రింద ఇవ్వండి.",
    correctedPlaceholder: "సరైన విలువ ఇవ్వండి",
    keepApprox: "అవును, సుమారుగా ఉంచండి",
    submitCorrection: "సవరణను సమర్పించండి",
  },
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

function calculateTrend(
  current: number,
  previous: number,
  labels: { vsLastWeek: string; newVsLastWeek: string },
  invertDirection = false
): TrendInfo {
  if (previous === 0 && current === 0) {
    return { trend: "neutral", value: `0% ${labels.vsLastWeek}` };
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
    return { trend, value: labels.newVsLastWeek };
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
    value: `${formatPercent(Math.abs(changePct))} ${labels.vsLastWeek}`,
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const lang = language.toLowerCase();
  const copy = useMemo(() => DASHBOARD_COPY[lang] || DASHBOARD_COPY.en, [lang]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ earnings: 0, expenses: 0, profit: 0 });
  const [trends, setTrends] = useState<{
    earnings: TrendInfo;
    expenses: TrendInfo;
    profit: TrendInfo;
  }>({
    earnings: { trend: "neutral", value: "0%" },
    expenses: { trend: "neutral", value: "0%" },
    profit: { trend: "neutral", value: "0%" },
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
        earnings: calculateTrend(currentWeekEarnings, previousWeekEarnings, copy),
        // Lower expenses are better, so invert trend direction for this card.
        expenses: calculateTrend(currentWeekExpenses, previousWeekExpenses, copy, true),
        profit: calculateTrend(currentWeekProfit, previousWeekProfit, copy),
      });

      const recent = [...entries]
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
        .slice(0, 5);

      setRecentEntries(recent);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }, [copy]);

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
  }, [copy]);

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
              {copy.greeting}, {user?.name?.split(" ")[0] ?? copy.fallbackName}! 👋
            </h1>
            <p className="text-muted-foreground font-medium">
              {copy.overview}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BrutalButton variant="outline" size="lg" onClick={() => setCallOpen(true)}>
              <PhoneCall size={20} /> {copy.callAssistant}
            </BrutalButton>
            <BrutalButton variant="primary" size="lg" onClick={() => setVoiceOpen(true)}>
              <Mic size={22} /> {copy.recordEntry}
            </BrutalButton>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard 
            title={copy.earnings} 
            value={stats.earnings} 
            icon={DollarSign} 
            variant="earnings" 
            trend={trends.earnings.trend} 
            trendValue={trends.earnings.value} 
          />
          <StatCard 
            title={copy.expenses} 
            value={stats.expenses} 
            icon={TrendingDown} 
            variant="expenses" 
            trend={trends.expenses.trend} 
            trendValue={trends.expenses.value} 
          />
          <StatCard 
            title={copy.profit} 
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
            <h3 className="font-bold">{copy.insightTitle}</h3>
            <p className="text-sm text-muted-foreground font-medium">
              {copy.insightBody}
            </p>
          </div>
        </BrutalCard>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-bold mb-3">{copy.recentActivity}</h2>
          {recentEntries.length === 0 ? (
            <BrutalCard className="text-center py-8">
              <p className="text-muted-foreground font-medium">
                {copy.noEntries}
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
                        {entry.itemName ?? (isSale ? copy.voiceSale : copy.voiceExpense)}
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

      <BrutalModal open={callOpen} onClose={() => setCallOpen(false)} title={copy.callModalTitle}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium">
            {copy.callModalDesc}
          </p>
          <input
            value={callNumber}
            onChange={(e) => setCallNumber(e.target.value)}
            placeholder="+919876543210"
            className="w-full px-4 py-2.5 brutal-input"
          />
          <div className="flex justify-end">
            <BrutalButton variant="primary" onClick={handleStartCall} loading={isCalling}>
              <PhoneCall size={16} /> {copy.startCall}
            </BrutalButton>
          </div>
        </div>
      </BrutalModal>

      <BrutalModal open={flagPromptOpen} onClose={() => setFlagPromptOpen(false)} title={copy.quickClarification}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-medium">
            {copy.approxDetected}
          </p>
          <div className="brutal-card p-3 bg-muted/30">
            <p className="font-bold text-sm">{copy.uncertainLine}</p>
            <p className="text-sm text-muted-foreground">{pendingFlag?.originalText ?? copy.noTextAvailable}</p>
          </div>
          <p className="text-sm font-medium">
            {copy.confirmApproxPrompt}
          </p>
          <input
            value={clarificationValue}
            onChange={(e) => setClarificationValue(e.target.value)}
            placeholder={copy.correctedPlaceholder}
            className="w-full px-4 py-2.5 brutal-input"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <BrutalButton variant="outline" onClick={handleAcceptFlag} loading={flagSubmitting}>
              {copy.keepApprox}
            </BrutalButton>
            <BrutalButton variant="primary" onClick={handleCorrectFlag} loading={flagSubmitting}>
              {copy.submitCorrection}
            </BrutalButton>
          </div>
        </div>
      </BrutalModal>
    </AppLayout>
  );
}