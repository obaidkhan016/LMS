"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/lib/auth/store";
import { initials } from "@/lib/utils";

export function Topbar() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur lg:px-6">
      <div className="lg:hidden">
        <span className="text-[14px] font-semibold tracking-[-0.02em] text-fg">
          Roots Garden
        </span>
      </div>

      <div className="relative ml-auto hidden w-full max-w-[320px] md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input
          type="search"
          placeholder="Search students, teachers, classes…"
          className="h-9 w-full rounded-[10px] border border-line bg-surface-inset pl-9 pr-3 text-[13px] text-fg placeholder:text-fg-subtle focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <ThemeToggle />

        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-[8px] text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>

        <div className="mx-1 h-6 w-px bg-line" />

        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <div className="text-[13px] font-medium leading-tight text-fg">
              {user?.full_name ?? "—"}
            </div>
            <div className="text-[11px] leading-tight text-fg-muted">
              {user?.roles?.join(", ") ?? ""}
            </div>
          </div>

          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-fg text-[12px] font-semibold">
            {user ? initials(user.full_name) : "?"}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="Sign out"
            className="ml-1"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}