import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  onDark?: boolean;
  showWordmark?: boolean;
}

export function Logo({ className, onDark = false, showWordmark = true }: LogoProps) {
  const fg = onDark ? "#ffffff" : "#0b4f3f";
  const accent = "#c9a961";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill={fg} />
        <path
          d="M16 23V14"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M16 15L11 11M16 15L21 11"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="23" r="1.6" fill={accent} />
      </svg>

      {showWordmark && (
        <div className="leading-none">
          <div
            className="text-[15px] font-semibold tracking-[-0.02em]"
            style={{ color: onDark ? "#ffffff" : "#14171a" }}
          >
            Roots Garden
          </div>
          <div
            className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em]"
            style={{ color: onDark ? "rgba(255,255,255,0.6)" : "#8b9298" }}
          >
            Attendance
          </div>
        </div>
      )}
    </div>
  );
}