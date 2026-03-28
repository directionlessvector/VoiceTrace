import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface BrutalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const BrutalButton = forwardRef<HTMLButtonElement, BrutalButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      outline: "bg-card text-foreground",
      danger: "bg-destructive text-destructive-foreground",
      ghost: "bg-transparent border-none shadow-none hover:bg-muted",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-5 py-2.5 text-base",
      lg: "px-8 py-3.5 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "brutal-btn font-bold inline-flex items-center justify-center gap-2",
          variant !== "ghost" && "brutal-border brutal-shadow",
          variants[variant],
          sizes[size],
          (disabled || loading) && "opacity-60 cursor-not-allowed",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
BrutalButton.displayName = "BrutalButton";

export { BrutalButton };
