import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "earnings" | "expenses" | "profit" | "pending";
}

export function StatCard({ title, value, icon: Icon, trend, trendValue, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "bg-card",
    earnings: "bg-success/10",
    expenses: "bg-destructive/10",
    profit: "bg-secondary/10",
    pending: "bg-warning/10",
  };

  const iconStyles = {
    default: "text-foreground",
    earnings: "text-success",
    expenses: "text-destructive",
    profit: "text-secondary",
    pending: "text-warning",
  };

  return (
    <div className={cn("brutal-card p-3 sm:p-5", variantStyles[variant])}>
      <div className="flex items-start justify-between gap-1 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-muted-foreground truncate">{title}</p>
          <p className="text-xl sm:text-3xl font-bold mt-1 font-mono truncate">{typeof value === "number" ? `₹${value.toLocaleString()}` : value}</p>
          {trend && trendValue && (
            <p className={cn("text-[10px] sm:text-sm font-bold mt-1 truncate", trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground")}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
            </p>
          )}
        </div>
        <div className={cn("p-1.5 sm:p-2 brutal-border brutal-shadow-sm shrink-0", iconStyles[variant])}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
}
