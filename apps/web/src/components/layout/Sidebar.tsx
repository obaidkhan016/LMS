"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth/store";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/students", label: "Students", icon: GraduationCap, permission: "students.view" },
  { href: "/teachers", label: "Teachers", icon: Users, permission: "teachers.view" },
  { href: "/academics", label: "Academics", icon: Layers, permission: "classes.manage" },
  { href: "/timetable", label: "Timetable", icon: Calendar, permission: "timetable.manage" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
  { href: "/campuses", label: "Campuses", icon: Building2, permission: "settings.manage" },
  { href: "/users", label: "Users & Roles", icon: ShieldCheck, permission: "users.manage" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);

  const allowed = (code?: string) => {
    if (!code) return true;
    if (!user) return false;
    if (user.is_superuser) return true;
    return user.permissions.includes(code);
  };

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {items
            .filter((it) => allowed(it.permission))
            .map((it) => {
              const active =
                pathname === it.href || pathname.startsWith(it.href + "/");
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={cn(
                      "group flex h-9 items-center gap-2.5 rounded-[8px] px-3 text-[13.5px] font-medium",
                      "transition-colors duration-100",
                      active
                        ? "bg-primary-soft text-primary-soft-fg"
                        : "text-fg-muted hover:bg-surface-hover hover:text-fg",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[17px] w-[17px]",
                        active
                          ? "text-primary-soft-fg"
                          : "text-fg-subtle group-hover:text-fg-muted",
                      )}
                    />
                    {it.label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[12px] text-fg-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
          <span>System healthy</span>
        </div>
      </div>
    </aside>
  );
}