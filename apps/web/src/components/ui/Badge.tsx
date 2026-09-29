import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-inset text-fg-muted",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-primary-soft text-primary-soft-fg",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[11.5px] font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}