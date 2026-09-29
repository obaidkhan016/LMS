"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none rounded-[10px] border bg-surface px-3.5 pr-10 text-sm text-fg",
          "transition-[box-shadow,border-color] duration-150",
          "focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary",
          "disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-fg-subtle",
          error
            ? "border-danger focus:border-danger focus:ring-danger/15"
            : "border-line hover:border-fg-subtle/60",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  ),
);
Select.displayName = "Select";