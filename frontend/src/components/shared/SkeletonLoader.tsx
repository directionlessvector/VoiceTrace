import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
  type?: "text" | "card" | "stat";
}

export function SkeletonLoader({ lines = 3, className, type = "text" }: SkeletonLoaderProps) {
  if (type === "stat") {
    return (
      <div className={cn("brutal-card p-5 animate-pulse", className)}>
        <div className="h-3 w-20 bg-muted rounded mb-3" />
        <div className="h-8 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className={cn("brutal-card p-5 animate-pulse space-y-3", className)}>
        <div className="h-5 w-3/4 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-2/3 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 animate-pulse", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded" style={{ width: `${Math.random() * 40 + 60}%` }} />
      ))}
    </div>
  );
}
