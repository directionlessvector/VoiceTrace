import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BrutalBadgeProps {
  children: ReactNode;
  variant?: "default" | "approximate" | "confirmed" | "warning" | "danger" | "info";
  className?: string;
}

export function BrutalBadge({ children, variant = "default", className }: BrutalBadgeProps) {
  const variants = {
    default: "bg-muted text-foreground",
    approximate: "bg-warning text-warning-foreground",
    confirmed: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-destructive text-destructive-foreground",
    info: "bg-secondary text-secondary-foreground",
  };

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider brutal-border", variants[variant], className)}>
      {children}
    </span>
  );
}
