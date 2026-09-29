"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light",   icon: Sun },
  { value: "dark",  label: "Dark",    icon: Moon },
  { value: "oled",  label: "OLED (pure black)", icon: Zap },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="h-9 w-[108px] rounded-[10px] border border-line bg-surface-inset"
        aria-hidden
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex h-9 items-center gap-0.5 rounded-[10px] border border-line bg-surface-inset p-0.5"
    >
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => setTheme(o.value)}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-[8px] transition-colors",
              active
                ? "bg-surface text-primary-soft-fg shadow-sm"
                : "text-fg-subtle hover:bg-surface/60 hover:text-fg",
            )}
          >
            <Icon className="h-[15px] w-[15px]" />
          </button>
        );
      })}
    </div>
  );
}