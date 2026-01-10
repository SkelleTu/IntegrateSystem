import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant = "primary", isLoading, children, disabled, ...props }, ref) => {
    
    const variants = {
      primary: "bg-primary/30 text-white border border-primary/40 hover:bg-primary/40 hover:scale-[1.02]",
      secondary: "bg-white/12 border border-white/15 text-white hover:bg-white/20",
      danger: "bg-destructive/30 text-white border border-destructive/40 hover:bg-destructive/40",
      ghost: "bg-transparent text-white hover:bg-primary/10 border-transparent shadow-none",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative px-6 py-3 rounded-lg font-bold text-lg uppercase tracking-wider transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center font-display",
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

NeonButton.displayName = "NeonButton";
