import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BrutalCardProps {
  children: ReactNode;
  className?: string;
  highlight?: "primary" | "secondary" | "accent" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

export function BrutalCard({ children, className, highlight, onClick }: BrutalCardProps) {
  const highlightColors = {
    primary: "border-t-4 border-t-primary",
    secondary: "border-t-4 border-t-secondary",
    accent: "border-t-4 border-t-accent",
    success: "border-t-4 border-t-success",
    warning: "border-t-4 border-t-warning",
    destructive: "border-t-4 border-t-destructive",
  };

  return (
    <div onClick={onClick} className={cn("brutal-card p-5", highlight && highlightColors[highlight], className)}>
      {children}
    </div>
  );
}
