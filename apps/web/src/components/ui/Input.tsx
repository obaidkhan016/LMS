"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type, leadingIcon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;

    return (
      <div className="relative">
        {leadingIcon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle">
            {leadingIcon}
          </div>
        )}
        <input
          ref={ref}
          type={actualType}
          className={cn(
            "h-11 w-full rounded-[10px] border bg-surface px-3.5 text-sm text-fg",
            "placeholder:text-fg-subtle",
            "transition-[box-shadow,border-color] duration-150",
            "focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary",
            "disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-fg-subtle",
            leadingIcon && "pl-10",
            isPassword && "pr-10",
            error
              ? "border-danger focus:border-danger focus:ring-danger/15"
              : "border-line hover:border-fg-subtle/60",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fg-subtle hover:bg-surface-hover hover:text-fg"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";