import { InputHTMLAttributes, forwardRef, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BrutalInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const BrutalInput = forwardRef<HTMLInputElement, BrutalInputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="text-sm font-bold uppercase tracking-wide">{label}</label>}
      <input
        ref={ref}
        className={cn("w-full px-4 py-2.5 brutal-input", error && "border-destructive", className)}
        {...props}
      />
      {error && <p className="text-sm font-bold text-destructive">{error}</p>}
    </div>
  )
);
BrutalInput.displayName = "BrutalInput";

interface BrutalSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const BrutalSelect = forwardRef<HTMLSelectElement, BrutalSelectProps>(
  ({ label, error, className, children, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="text-sm font-bold uppercase tracking-wide">{label}</label>}
      <select
        ref={ref}
        className={cn("w-full px-4 py-2.5 brutal-input bg-card", error && "border-destructive", className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm font-bold text-destructive">{error}</p>}
    </div>
  )
);
BrutalSelect.displayName = "BrutalSelect";
