"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClass = {
  sm: "max-w-[400px]",
  md: "max-w-[520px]",
  lg: "max-w-[680px]",
  xl: "max-w-[840px]",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: DialogProps) {
  const [mounted, setMounted] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open && !prevOpenRef.current && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "var(--overlay)" }}
        onClick={onClose}
        aria-hidden
      />

      {/* maxHeight — panel grows to fit content, caps at 800px, then body scrolls */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-[16px] border border-line bg-surface-elevated shadow-[0_24px_64px_-12px_rgb(0_0_0/0.35)]",
          sizeClass[size],
        )}
        style={{ maxHeight: "min(90vh, 800px)" }}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-line px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="dialog-title"
              className="text-[16px] font-semibold tracking-[-0.01em] text-fg"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-3 grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-fg-subtle hover:bg-surface-hover hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
        >
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}