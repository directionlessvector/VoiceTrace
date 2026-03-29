import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { updateCurrentUserProfile } from "@/lib/usersApi";

export type AppLanguage = "en" | "hi" | "mr" | "ta" | "te";

const LANGUAGE_KEY = "voicetrace_language";

const STRINGS: Record<AppLanguage, Record<string, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.ledger": "Ledger",
    "nav.uploadLedger": "Upload Ledger",
    "nav.udhaar": "UdhaarBook",
    "nav.insights": "Insights",
    "nav.suggestions": "Suggestions",
    "nav.nearbySuppliers": "Nearby Suppliers",
    "nav.reports": "Reports",
    "nav.alerts": "Alerts",
    "nav.profile": "Profile",
    "nav.adminDashboard": "Admin Dashboard",
    "nav.logout": "Logout",
    "nav.language": "Language",
    "lang.en": "English",
    "lang.hi": "Hindi",
    "lang.mr": "Marathi",
    "lang.ta": "Tamil",
    "lang.te": "Telugu",
    "page.ledger": "Ledger",
    "page.uploadLedger": "Upload Ledger",
    "page.uploadLedgerSubtitle": "Upload a ledger image, preview extraction, then confirm save.",
    "page.udhaar": "UdhaarBook",
    "page.udhaarSubtitle": "Track and recover customer udhaar efficiently.",
    "page.insights": "Insights",
    "page.suggestions": "Stock Suggestions",
    "page.suggestionsSubtitle": "AI suggestions enriched with weather-driven recommendations.",
    "page.nearbySuppliers": "Nearby Suppliers",
    "page.reports": "Financial Reports",
    "page.alerts": "Alerts",
    "page.alertsSubtitle": "Anomalies detected compared to your daily averages.",
    "page.profile": "Profile",
  },
  hi: {
    "nav.dashboard": "डैशबोर्ड",
    "nav.ledger": "लेजर",
    "nav.uploadLedger": "लेजर अपलोड",
    "nav.udhaar": "उधारबुक",
    "nav.insights": "इनसाइट्स",
    "nav.suggestions": "सुझाव",
    "nav.nearbySuppliers": "नज़दीकी सप्लायर",
    "nav.reports": "रिपोर्ट्स",
    "nav.alerts": "अलर्ट्स",
    "nav.profile": "प्रोफाइल",
    "nav.adminDashboard": "एडमिन डैशबोर्ड",
    "nav.logout": "लॉगआउट",
    "nav.language": "भाषा",
    "lang.en": "English",
    "lang.hi": "हिंदी",
    "lang.mr": "मराठी",
    "lang.ta": "तमिल",
    "lang.te": "तेलुगु",
    "page.ledger": "लेजर",
    "page.uploadLedger": "लेजर अपलोड",
    "page.uploadLedgerSubtitle": "लेजर की इमेज अपलोड करें, एक्सट्रैक्शन देखें, फिर सेव की पुष्टि करें।",
    "page.udhaar": "उधारबुक",
    "page.udhaarSubtitle": "ग्राहक उधार को आसानी से ट्रैक और रिकवर करें।",
    "page.insights": "इनसाइट्स",
    "page.suggestions": "स्टॉक सुझाव",
    "page.suggestionsSubtitle": "मौसम आधारित AI सुझावों के साथ स्टॉक योजना बनाएं।",
    "page.nearbySuppliers": "नज़दीकी सप्लायर",
    "page.reports": "वित्तीय रिपोर्ट्स",
    "page.alerts": "अलर्ट्स",
    "page.alertsSubtitle": "आपके दैनिक औसत की तुलना में पाए गए असामान्य पैटर्न।",
    "page.profile": "प्रोफाइल",
  },
  mr: {
    "nav.dashboard": "डॅशबोर्ड",
    "nav.ledger": "लेजर",
    "nav.uploadLedger": "लेजर अपलोड",
    "nav.udhaar": "उधारबुक",
    "nav.insights": "इनसाइट्स",
    "nav.suggestions": "सूचना",
    "nav.nearbySuppliers": "जवळचे पुरवठादार",
    "nav.reports": "अहवाल",
    "nav.alerts": "अलर्ट्स",
    "nav.profile": "प्रोफाइल",
    "nav.adminDashboard": "अॅडमिन डॅशबोर्ड",
    "nav.logout": "लॉगआउट",
    "nav.language": "भाषा",
    "lang.en": "English",
    "lang.hi": "हिंदी",
    "lang.mr": "मराठी",
    "lang.ta": "தமிழ்",
    "lang.te": "తెలుగు",
    "page.ledger": "लेजर",
    "page.uploadLedger": "लेजर अपलोड",
    "page.uploadLedgerSubtitle": "लेजरची प्रतिमा अपलोड करा, एक्स्ट्रॅक्शन पहा, मग सेव करा.",
    "page.udhaar": "उधारबुक",
    "page.udhaarSubtitle": "ग्राहकांचे उधार प्रभावीपणे ट्रॅक करा आणि वसूल करा.",
    "page.insights": "इनसाइट्स",
    "page.suggestions": "स्टॉक सूचना",
    "page.suggestionsSubtitle": "हवामानाधारित AI सूचनांसह स्टॉक नियोजन करा.",
    "page.nearbySuppliers": "जवळचे पुरवठादार",
    "page.reports": "आर्थिक अहवाल",
    "page.alerts": "अलर्ट्स",
    "page.alertsSubtitle": "दैनंदिन सरासरीच्या तुलनेत आढळलेले बदल.",
    "page.profile": "प्रोफाइल",
  },
  ta: {
    "nav.dashboard": "டாஷ்போர்டு",
    "nav.ledger": "லெட்ஜர்",
    "nav.uploadLedger": "லெட்ஜர் அப்லோடு",
    "nav.udhaar": "உதார் புத்தகம்",
    "nav.insights": "இன்சைட்ஸ்",
    "nav.suggestions": "பரிந்துரைகள்",
    "nav.nearbySuppliers": "அருகிலுள்ள சப்ளையர்கள்",
    "nav.reports": "அறிக்கைகள்",
    "nav.alerts": "அலர்ட்ஸ்",
    "nav.profile": "சுயவிவரம்",
    "nav.adminDashboard": "அட்மின் டாஷ்போர்டு",
    "nav.logout": "வெளியேறு",
    "nav.language": "மொழி",
    "lang.en": "English",
    "lang.hi": "हिंदी",
    "lang.mr": "मराठी",
    "lang.ta": "தமிழ்",
    "lang.te": "తెలుగు",
    "page.ledger": "லெட்ஜர்",
    "page.uploadLedger": "லெட்ஜர் அப்லோடு",
    "page.uploadLedgerSubtitle": "லெட்ஜர் படத்தை அப்லோடு செய்து, எக்ஸ்ட்ராக்ஷனை பார்த்து சேமிக்கவும்.",
    "page.udhaar": "உதார் புத்தகம்",
    "page.udhaarSubtitle": "வாடிக்கையாளர் உதாரை எளிதாக கண்காணித்து வசூலிக்கவும்.",
    "page.insights": "இன்சைட்ஸ்",
    "page.suggestions": "ஸ்டாக் பரிந்துரைகள்",
    "page.suggestionsSubtitle": "வானிலை அடிப்படையிலான AI பரிந்துரைகளுடன் ஸ்டாக் திட்டமிடுங்கள்.",
    "page.nearbySuppliers": "அருகிலுள்ள சப்ளையர்கள்",
    "page.reports": "நிதி அறிக்கைகள்",
    "page.alerts": "அலர்ட்ஸ்",
    "page.alertsSubtitle": "உங்கள் தினசரி சராசரியுடன் ஒப்பிடும்போது கண்டுபிடிக்கப்பட்ட மாற்றங்கள்.",
    "page.profile": "சுயவிவரம்",
  },
  te: {
    "nav.dashboard": "డాష్‌బోర్డ్",
    "nav.ledger": "లెడ్జర్",
    "nav.uploadLedger": "లెడ్జర్ అప్లోడ్",
    "nav.udhaar": "ఉధార్‌బుక్",
    "nav.insights": "ఇన్‌సైట్స్",
    "nav.suggestions": "సజెషన్స్",
    "nav.nearbySuppliers": "సమీప సరఫరాదారులు",
    "nav.reports": "రిపోర్ట్స్",
    "nav.alerts": "అలర్ట్స్",
    "nav.profile": "ప్రొఫైల్",
    "nav.adminDashboard": "అడ్మిన్ డాష్‌బోర్డ్",
    "nav.logout": "లాగౌట్",
    "nav.language": "భాష",
    "lang.en": "English",
    "lang.hi": "हिंदी",
    "lang.mr": "मराठी",
    "lang.ta": "தமிழ்",
    "lang.te": "తెలుగు",
    "page.ledger": "లెడ్జర్",
    "page.uploadLedger": "లెడ్జర్ అప్లోడ్",
    "page.uploadLedgerSubtitle": "లెడ్జర్ ఇమేజ్‌ను అప్లోడ్ చేసి, ఎక్స్ట్రాక్షన్ చూసి సేవ్ చేయండి.",
    "page.udhaar": "ఉధార్‌బుక్",
    "page.udhaarSubtitle": "కస్టమర్ ఉధార్‌ను సమర్థంగా ట్రాక్ చేసి వసూలు చేయండి.",
    "page.insights": "ఇన్‌సైట్స్",
    "page.suggestions": "స్టాక్ సజెషన్స్",
    "page.suggestionsSubtitle": "వాతావరణ ఆధారిత AI సూచనలతో స్టాక్ ప్లాన్ చేయండి.",
    "page.nearbySuppliers": "సమీప సరఫరాదారులు",
    "page.reports": "ఆర్థిక నివేదికలు",
    "page.alerts": "అలర్ట్స్",
    "page.alertsSubtitle": "మీ రోజువారీ సగటుతో పోలిస్తే గుర్తించిన మార్పులు.",
    "page.profile": "ప్రొఫైల్",
  },
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  const code = (value || "en").toLowerCase();
  if (code === "hi" || code === "mr" || code === "ta" || code === "te") return code;
  return "en";
}

export function LanguageProvider({
  children,
  preferredLanguage,
}: {
  children: ReactNode;
  preferredLanguage?: string | null;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const fromStorage = localStorage.getItem(LANGUAGE_KEY);
    return normalizeLanguage(fromStorage || preferredLanguage || "en");
  });

  useEffect(() => {
    if (!preferredLanguage) return;
    const next = normalizeLanguage(preferredLanguage);
    setLanguageState(next);
    localStorage.setItem(LANGUAGE_KEY, next);
  }, [preferredLanguage]);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);

    try {
      await updateCurrentUserProfile({ languagePreference: nextLanguage });
      const raw = localStorage.getItem("voicetrace_user");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        parsed.languagePreference = nextLanguage;
        localStorage.setItem("voicetrace_user", JSON.stringify(parsed));
      }
    } catch {
      // Keep UI language switch local even if backend update fails.
    }
  };

  const t = useMemo(() => {
    return (key: string) => STRINGS[language][key] || STRINGS.en[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
