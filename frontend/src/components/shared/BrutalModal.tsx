import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface BrutalModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function BrutalModal({ open, onClose, title, children, className }: BrutalModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-foreground/40" onClick={onClose} />
      <div className={cn("brutal-card relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6", className)}>
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          <button onClick={onClose} className="brutal-btn brutal-border brutal-shadow-sm p-1.5 bg-card hover:bg-muted">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
