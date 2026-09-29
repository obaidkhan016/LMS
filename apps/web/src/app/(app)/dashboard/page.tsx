"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardCheck,
  GraduationCap,
  Layers,
  Users,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth/store";
import { getDashboardStats, type DashboardStats } from "@/lib/api/dashboard";
import { formatDate } from "@/lib/utils";

const setupSteps = [
  "Create a campus",
  "Create an academic session",
  "Define education levels, grades, and sections",
  "Create subjects",
  "Add teachers and assign them to subjects and classes",
  "Import students or add them individually",
  "Build the timetable",
  "Configure attendance rules",
  "Start taking attendance",
];

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setStats(await getDashboardStats());
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = formatDate(new Date(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.full_name?.split(" ")[0] ?? "there";

  const cards = [
    {
      href: "/students",
      label: "Students enrolled",
      value: stats?.students_enrolled,
      icon: GraduationCap,
      hint: "Active students",
    },
    {
      href: "/teachers",
      label: "Teachers",
      value: stats?.teachers,
      icon: Users,
      hint: "Active staff",
    },
    {
      href: "/academics",
      label: "Sections",
      value: stats?.sections,
      icon: Layers,
      hint: "Across all grades",
    },
    {
      href: "/attendance",
      label: "Sessions today",
      value: stats?.sessions_today,
      icon: ClipboardCheck,
      hint:
        stats?.attendance_rate_today != null
          ? `${stats.attendance_rate_today}% attendance`
          : "Not yet taken",
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] rgs-fade-in">
      <div className="mb-7">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
          {today}
        </p>
        <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-fg">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Here&apos;s what&apos;s happening across the institution today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="group block">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardBody className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-primary-soft text-primary-soft-fg">
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-fg-subtle transition-colors group-hover:text-primary" />
                  </div>
                  <div className="mt-4 text-[26px] font-semibold leading-none tracking-[-0.02em] text-fg">
                    {loading ? (
                      <span className="inline-block h-6 w-10 animate-pulse rounded bg-surface-inset" />
                    ) : (
                      c.value ?? 0
                    )}
                  </div>
                  <div className="mt-2 text-[13px] font-medium text-fg">
                    {c.label}
                  </div>
                  <div className="mt-0.5 text-[12px] text-fg-subtle">{c.hint}</div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Set up your institution</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-fg-muted">
              The platform starts empty — that&apos;s intentional. Follow this
              order to configure Roots Garden and begin taking attendance.
            </p>

            <ol className="mt-5 space-y-3">
              {setupSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-soft-fg">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-[13.5px] text-fg">{step}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/students"
                className="flex items-center justify-between rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[13.5px] font-medium text-fg transition-colors hover:border-primary/40 hover:bg-surface-hover"
              >
                <span>Add a student</span>
                <ArrowUpRight className="h-4 w-4 text-fg-subtle" />
              </Link>
              <Link
                href="/teachers"
                className="flex items-center justify-between rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[13.5px] font-medium text-fg transition-colors hover:border-primary/40 hover:bg-surface-hover"
              >
                <span>Add a teacher</span>
                <ArrowUpRight className="h-4 w-4 text-fg-subtle" />
              </Link>
              <Link
                href="/academics"
                className="flex items-center justify-between rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[13.5px] font-medium text-fg transition-colors hover:border-primary/40 hover:bg-surface-hover"
              >
                <span>Configure academics</span>
                <ArrowUpRight className="h-4 w-4 text-fg-subtle" />
              </Link>
              <Link
                href="/attendance"
                className="flex items-center justify-between rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[13.5px] font-medium text-fg transition-colors hover:border-primary/40 hover:bg-surface-hover"
              >
                <span>Take attendance</span>
                <ArrowUpRight className="h-4 w-4 text-fg-subtle" />
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}