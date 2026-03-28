import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, TrendingUp, Package, FileText,
  AlertTriangle, User, Shield, Menu, X, Mic, LogOut, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Ledger", path: "/ledger", icon: BookOpen },
  { title: "Upload Ledger", path: "/upload-ledger", icon: Upload },
  { title: "Insights", path: "/insights", icon: TrendingUp },
  { title: "Suggestions", path: "/suggestions", icon: Package },
  { title: "Reports", path: "/reports", icon: FileText },
  { title: "Alerts", path: "/alerts", icon: AlertTriangle },
  { title: "Profile", path: "/profile", icon: User },
];

const adminItems = [
  { title: "Admin", path: "/admin", icon: Shield },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-sm brutal-border flex items-center justify-center">
              <Mic size={20} className="text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">VoiceTrace</span>
          </Link>
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-bold transition-all",
                  active
                    ? "bg-primary text-primary-foreground brutal-border brutal-shadow-sm"
                    : "hover:bg-muted"
                )}
              >
                <item.icon size={18} />
                {item.title}
              </Link>
            );
          })}

          <div className="border-t-[3px] border-foreground my-3" />

          {adminItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-bold transition-all",
                  active
                    ? "bg-secondary text-secondary-foreground brutal-border brutal-shadow-sm"
                    : "hover:bg-muted"
                )}
              >
                <item.icon size={18} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t-[3px] border-foreground">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-bold hover:bg-destructive/10 text-destructive"
          >
            <LogOut size={18} />
            Logout
          </Link>
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
            <div className="w-8 h-8 bg-primary rounded-sm brutal-border flex items-center justify-center text-primary-foreground text-sm font-bold">
              R
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
