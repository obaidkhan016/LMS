"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error";

interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastStore {
  items: ToastItem[];
  push: (kind: Kind, message: string) => void;
  dismiss: (id: number) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (kind, message) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push("success", m),
  error: (m: string) => useToastStore.getState().push("error", m),
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && items.length > 0) {
        dismiss(items[items.length - 1]!.id);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items, dismiss]);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
      {items.map((t) => {
        const Icon = t.kind === "success" ? CheckCircle2 : XCircle;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex min-w-[280px] max-w-[420px] items-start gap-3 rounded-[12px] border bg-surface px-4 py-3 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.25)] rgs-fade-in",
              t.kind === "success" ? "border-success/40" : "border-danger/40",
            )}
            role="status"
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                t.kind === "success" ? "text-success" : "text-danger",
              )}
            />
            <span className="text-[13.5px] leading-snug text-fg">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="ml-auto text-[12px] text-fg-subtle hover:text-fg"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}