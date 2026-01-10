import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export const NeonCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass border border-white/15 rounded-2xl md:rounded-3xl p-4 md:p-8 transition-all duration-500 group relative overflow-hidden",
          "hover:border-primary/30 shadow-none",
          "w-full h-full",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

NeonCard.displayName = "NeonCard";
