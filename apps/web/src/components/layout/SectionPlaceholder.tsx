import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
}

export function SectionPlaceholder({
  icon: Icon,
  eyebrow,
  title,
  description,
  bullets,
}: Props) {
  return (
    <div className="mx-auto max-w-[720px] rgs-fade-in">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
      </div>

      <div className="rounded-[16px] border border-line bg-surface p-8">
        <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-primary-soft text-primary-soft-fg">
          <Icon className="h-5 w-5" />
        </div>

        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-[24px] font-semibold tracking-[-0.02em] text-fg">
          {title}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
          {description}
        </p>

        <div className="mt-6 rounded-[12px] bg-surface-inset p-5">
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
            What will be built here
          </div>
          <ul className="mt-3 space-y-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[13.5px] text-fg">
                <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-[10px] border border-warning/30 bg-warning-bg px-3.5 py-3 text-[12.5px] text-warning">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" />
          <span>This section is on the roadmap and will be delivered in a later build step.</span>
        </div>
      </div>
    </div>
  );
}