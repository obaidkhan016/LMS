import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line bg-surface px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-primary-soft text-primary-soft-fg">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-fg">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-fg-muted">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}