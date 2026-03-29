import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type AppLanguage } from "@/contexts/LanguageContext";
import {
  LayoutDashboard, BookOpen, TrendingUp, Package, FileText,
  AlertTriangle, User, Shield, Menu, X, Mic, LogOut, Wallet, MapPin, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { titleKey: "nav.dashboard", path: "/dashboard", icon: LayoutDashboard },
  { titleKey: "nav.ledger", path: "/ledger", icon: BookOpen },
  { titleKey: "nav.uploadLedger", path: "/upload-ledger", icon: Upload },
  { titleKey: "nav.udhaar", path: "/udhaar", icon: Wallet },
  { titleKey: "nav.insights", path: "/insights", icon: TrendingUp },
  { titleKey: "nav.suggestions", path: "/suggestions", icon: Package },
  { titleKey: "nav.nearbySuppliers", path: "/nearby-suppliers", icon: MapPin },
  { titleKey: "nav.reports", path: "/reports", icon: FileText },
  { titleKey: "nav.alerts", path: "/alerts", icon: AlertTriangle },
  { titleKey: "nav.profile", path: "/profile", icon: User },
];

const adminItems = [{ titleKey: "nav.adminDashboard", path: "/admin", icon: Shield }];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, adminUser, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const isAdminSession = !!adminUser;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userInitial = (isAdminSession ? adminUser?.email?.charAt(0) : user?.name?.charAt(0))?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card brutal-border border-l-0 border-t-0 border-b-0 flex flex-col transition-transform duration-200",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 border-b-[3px] border-foreground flex items-center justify-between">
          <Link to={isAdminSession ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-sm brutal-border flex items-center justify-center">
              <Mic size={20} className="text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Vyapar Saathi</span>
          </Link>
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {(isAdminSession ? adminItems : navItems).map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-bold transition-all",
                  active
                    ? `${isAdminSession ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"} brutal-border brutal-shadow-sm`
                    : "hover:bg-muted"
                )}
              >
                <item.icon size={18} />
                {t(item.titleKey)}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t-[3px] border-foreground">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-bold hover:bg-destructive/10 text-destructive"
          >
            <LogOut size={18} />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-card border-b-[3px] border-foreground px-4 h-14 flex items-center justify-between">
          <button
            className="lg:hidden brutal-btn brutal-border brutal-shadow-sm p-2 bg-card"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            {!isAdminSession && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">{t("nav.language")}</span>
                <select
                  value={language}
                  onChange={(e) => void setLanguage(e.target.value as AppLanguage)}
                  className="brutal-select px-2 py-1 text-xs font-bold"
                >
                  <option value="en">{t("lang.en")}</option>
                  <option value="hi">{t("lang.hi")}</option>
                  <option value="mr">{t("lang.mr")}</option>
                  <option value="ta">{t("lang.ta")}</option>
                  <option value="te">{t("lang.te")}</option>
                </select>
              </div>
            )}
            <div className="w-8 h-8 bg-primary rounded-sm brutal-border flex items-center justify-center text-primary-foreground text-sm font-bold">
              {userInitial}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
