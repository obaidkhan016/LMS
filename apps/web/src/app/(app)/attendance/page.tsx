"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  User,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { apiErrorMessage } from "@/lib/api/client";
import { listCampuses, type Campus } from "@/lib/api/campuses";
import {
  academicSessionsApi,
  educationLevelsApi,
  gradesApi,
  sectionsApi,
  type AcademicSession,
  type EducationLevel,
  type Grade,
  type Section,
} from "@/lib/api/academics";
import {
  attendanceApi,
  type AttendanceSession,
  type ScheduledClass,
} from "@/lib/api/attendance";
import {
  dailyAttendanceApi,
  type DailySummaryRow,
} from "@/lib/api/daily-attendance";
import { cn } from "@/lib/utils";

type Tab = "period" | "daily";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>("period");
  return (
    <div className="mx-auto max-w-[1200px] rgs-fade-in">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
          Daily operations
        </p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-fg">
          Attendance
        </h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">
          Class attendance is per period. Daily attendance is the formal morning
          roll call — one submit per student per day.
        </p>
      </div>

      <div className="mb-5 flex items-center gap-1 border-b border-line">
        {(
          [
            { id: "period" as Tab, label: "Class attendance", icon: Clock },
            { id: "daily" as Tab, label: "Daily attendance", icon: CalendarCheck },
          ]
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative -mb-px flex h-10 items-center gap-2 px-4 text-[13.5px] font-medium transition-colors",
                tab === t.id
                  ? "border-b-2 border-primary text-fg"
                  : "border-b-2 border-transparent text-fg-muted hover:text-fg",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "period" && <PeriodTab />}
      {tab === "daily" && <DailyTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
function PeriodTab() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [campusId, setCampusId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [onDate, setOnDate] = useState<string>(todayIso());

  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [recent, setRecent] = useState<AttendanceSession[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await listCampuses();
        setCampuses(data);
        if (data.length > 0) setCampusId(data[0]!.id);
      } catch (e) {
        toast.error(apiErrorMessage(e, "Could not load campuses"));
      }
    })();
  }, []);

  useEffect(() => {
    if (!campusId) return;
    (async () => {
      try {
        const data = await academicSessionsApi.list(campusId);
        setSessions(data);
        const active = data.find((s) => s.is_active) ?? data[0];
        if (active) setSessionId(active.id);
      } catch {
        /* silent */
      }
    })();
  }, [campusId]);

  async function load() {
    if (!campusId || !sessionId) return;
    setLoadingClasses(true);
    setLoadingRecent(true);
    try {
      const [cls, rec] = await Promise.all([
        attendanceApi.today({
          campus_id: campusId,
          academic_session_id: sessionId,
          date: onDate,
        }),
        attendanceApi.listSessions({
          campus_id: campusId,
          academic_session_id: sessionId,
          limit: 15,
        }),
      ]);
      setClasses(cls);
      setRecent(rec);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not load attendance data"));
    } finally {
      setLoadingClasses(false);
      setLoadingRecent(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId, sessionId, onDate]);

  return (
    <div>
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <ContextPicker
            label="Campus"
            value={campusId}
            onChange={(v) => setCampusId(v)}
            options={campuses.map((c) => ({ id: c.id, label: c.name }))}
          />
          <ContextPicker
            label="Academic session"
            value={sessionId}
            onChange={(v) => setSessionId(v)}
            options={sessions.map((s) => ({
              id: s.id,
              label: s.name + (s.is_active ? " (current)" : ""),
            }))}
          />
          <div className="min-w-[180px]">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
              Date
            </div>
            <input
              type="date"
              value={onDate}
              onChange={(e) => setOnDate(e.target.value)}
              className="h-9 w-full rounded-[10px] border border-line bg-surface-inset px-2.5 text-[13px] text-fg focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>
      </Card>

      <div className="mb-8">
        <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-fg">
          Scheduled classes
        </h2>

        {loadingClasses ? (
          <Card>
            <div className="flex items-center justify-center py-14 text-fg-muted">
              <Spinner />
              <span className="ml-3 text-[13.5px]">Loading schedule…</span>
            </div>
          </Card>
        ) : classes.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No scheduled classes"
            description="No timetable entries exist for this date. Check the timetable and academic session."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((c) => {
              const taken = !!c.existing_session_id;
              return (
                <Card
                  key={`${c.section_id}-${c.subject_id}-${c.period_number}`}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary-soft-fg">
                      <span className="text-[13px] font-bold">
                        P{c.period_number}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-semibold tracking-[-0.01em] text-fg">
                        {c.subject_name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-fg-muted">
                        <GraduationCap className="h-3 w-3" />
                        {c.grade_name} · {c.section_name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11.5px] text-fg-subtle">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {c.teacher_name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-line px-4 py-3">
                    {taken ? (
                      <Badge tone="success">
                        <CheckCircle2 className="h-3 w-3" />
                        {c.existing_session_status === "submitted" ||
                        c.existing_session_status === "locked"
                          ? "Submitted"
                          : "In progress"}
                      </Badge>
                    ) : (
                      <Badge>Not taken</Badge>
                    )}
                    <Button
                      size="sm"
                      variant={taken ? "outline" : "primary"}
                      onClick={async () => {
                        if (!campusId || !sessionId) return;
                        try {
                          const session = await attendanceApi.createSession({
                            campus_id: campusId,
                            academic_session_id: sessionId,
                            grade_id: c.grade_id,
                            section_id: c.section_id,
                            subject_id: c.subject_id,
                            scheduled_teacher_id: c.teacher_id,
                            attendance_date: onDate,
                            period_number: c.period_number,
                            scheduled_start: c.start_time,
                            scheduled_end: c.end_time,
                          });
                          window.location.href = `/attendance/${session.id}`;
                        } catch (e) {
                          toast.error(
                            apiErrorMessage(e, "Could not open attendance"),
                          );
                        }
                      }}
                      trailingIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      {taken ? "Open" : "Take attendance"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-fg">
          Recent class sessions
        </h2>
        {loadingRecent ? (
          <Card>
            <div className="flex items-center justify-center py-14 text-fg-muted">
              <Spinner />
              <span className="ml-3 text-[13.5px]">Loading history…</span>
            </div>
          </Card>
        ) : recent.length === 0 ? (
          <Card>
            <div className="px-5 py-10 text-center text-[13px] text-fg-muted">
              No class attendance recorded yet.
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line text-left">
                    <Th>Date</Th>
                    <Th>Class</Th>
                    <Th>Subject</Th>
                    <Th>Period</Th>
                    <Th>Summary</Th>
                    <Th>Status</Th>
                    <Th align="right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                    >
                      <Td>{s.attendance_date}</Td>
                      <Td>
                        <span className="font-medium text-fg">
                          {s.grade_name} · {s.section_name}
                        </span>
                      </Td>
                      <Td>{s.subject_name ?? "—"}</Td>
                      <Td>{s.period_number ? `P${s.period_number}` : "—"}</Td>
                      <Td>
                        <span className="text-[12.5px]">
                          <span className="text-success">P {s.present}</span>{" "}
                          <span className="text-fg-subtle">·</span>{" "}
                          <span className="text-danger">A {s.absent}</span>
                          {s.late > 0 && (
                            <>
                              {" "}
                              <span className="text-fg-subtle">·</span>{" "}
                              <span className="text-warning">L {s.late}</span>
                            </>
                          )}
                          {s.excused > 0 && (
                            <>
                              {" "}
                              <span className="text-fg-subtle">·</span>{" "}
                              <span className="text-fg-muted">
                                E {s.excused}
                              </span>
                            </>
                          )}
                        </span>
                      </Td>
                      <Td>
                        {s.status === "submitted" || s.status === "locked" ? (
                          <Badge tone="success">Submitted</Badge>
                        ) : (
                          <Badge tone="warning">Draft</Badge>
                        )}
                      </Td>
                      <Td align="right">
                        <Link
                          href={`/attendance/${s.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                        >
                          View
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
function DailyTab() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [campusId, setCampusId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [onDate, setOnDate] = useState<string>(todayIso());
  const [days, setDays] = useState<number>(30);

  const [summary, setSummary] = useState<DailySummaryRow[]>([]);
  const [loadingGraph, setLoadingGraph] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await listCampuses();
        setCampuses(data);
        if (data.length > 0) setCampusId(data[0]!.id);
      } catch (e) {
        toast.error(apiErrorMessage(e, "Could not load campuses"));
      }
    })();
  }, []);

  useEffect(() => {
    if (!campusId) return;
    (async () => {
      try {
        const [ses, lv, gr, sec] = await Promise.all([
          academicSessionsApi.list(campusId),
          educationLevelsApi.list(campusId),
          gradesApi.list(),
          sectionsApi.list(),
        ]);
        setSessions(ses);
        setLevels(lv);
        const levelIds = new Set(lv.map((l) => l.id));
        const filteredGrades = gr.filter((g) =>
          levelIds.has(g.education_level_id),
        );
        setGrades(filteredGrades);
        const gradeIds = new Set(filteredGrades.map((g) => g.id));
        setSections(sec.filter((s) => gradeIds.has(s.grade_id)));

        const activeSession = ses.find((s) => s.is_active) ?? ses[0];
        if (activeSession) setSessionId(activeSession.id);
        if (lv[0]) setLevelId(lv[0].id);
        const firstGrade = filteredGrades.find(
          (g) => g.education_level_id === lv[0]?.id,
        );
        if (firstGrade) setGradeId(firstGrade.id);
        const firstSection = sec.find((s) => s.grade_id === firstGrade?.id);
        if (firstSection) setSectionId(firstSection.id);
      } catch (e) {
        toast.error(apiErrorMessage(e, "Could not load setup data"));
      }
    })();
  }, [campusId]);

  useEffect(() => {
    if (!campusId || !sessionId) return;
    (async () => {
      setLoadingGraph(true);
      try {
        const data = await dailyAttendanceApi.summary({
          campus_id: campusId,
          academic_session_id: sessionId,
          section_id: sectionId ?? undefined,
          days,
        });
        setSummary(data);
      } catch (e) {
        toast.error(apiErrorMessage(e, "Could not load chart"));
      } finally {
        setLoadingGraph(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId, sessionId, sectionId, days]);

  const availableGrades = grades.filter(
    (g) => !levelId || g.education_level_id === levelId,
  );
  const availableSections = sections.filter(
    (s) => !gradeId || s.grade_id === gradeId,
  );

  const chartData = summary.map((r) => ({
    date: r.attendance_date.slice(5),
    rate: r.attendance_rate,
    present: r.present,
    absent: r.absent,
    total: r.total,
  }));

  const canOpen = !!(campusId && sessionId && sectionId && onDate);

  return (
    <div>
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3 p-4">
          <ContextPicker
            label="Campus"
            value={campusId}
            onChange={(v) => setCampusId(v)}
            options={campuses.map((c) => ({ id: c.id, label: c.name }))}
          />
          <ContextPicker
            label="Academic session"
            value={sessionId}
            onChange={(v) => setSessionId(v)}
            options={sessions.map((s) => ({
              id: s.id,
              label: s.name + (s.is_active ? " (current)" : ""),
            }))}
          />
          <ContextPicker
            label="Level"
            value={levelId}
            onChange={(v) => {
              setLevelId(v);
              const g = grades.find((x) => x.education_level_id === v);
              setGradeId(g?.id ?? null);
              const sec = sections.find((x) => x.grade_id === g?.id);
              setSectionId(sec?.id ?? null);
            }}
            options={levels.map((l) => ({ id: l.id, label: l.name }))}
          />
          <ContextPicker
            label="Grade"
            value={gradeId}
            onChange={(v) => {
              setGradeId(v);
              const sec = sections.find((x) => x.grade_id === v);
              setSectionId(sec?.id ?? null);
            }}
            options={availableGrades.map((g) => ({ id: g.id, label: g.name }))}
          />
          <ContextPicker
            label="Section"
            value={sectionId}
            onChange={(v) => setSectionId(v)}
            options={availableSections.map((s) => ({ id: s.id, label: s.name }))}
          />
          <div className="min-w-[170px]">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
              Date
            </div>
            <input
              type="date"
              value={onDate}
              onChange={(e) => setOnDate(e.target.value)}
              className="h-9 w-full rounded-[10px] border border-line bg-surface-inset px-2.5 text-[13px] text-fg focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <Button
            onClick={() => {
              if (!canOpen) return;
              window.location.href = `/attendance/daily/${sectionId}?date=${onDate}&session=${sessionId}`;
            }}
            disabled={!canOpen}
          >
            Open daily roster
          </Button>
        </div>
      </Card>

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
              Daily attendance rate
            </h2>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              Last {days} days
              {sectionId
                ? ` · ${
                    sections.find((s) => s.id === sectionId)?.name ?? ""
                  }`
                : " · all sections"}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-[10px] border border-line bg-surface-inset p-0.5">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "h-7 rounded-[8px] px-3 text-[12px] font-medium transition-colors",
                  days === d
                    ? "bg-surface text-fg shadow-sm"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="px-3 py-5">
          {loadingGraph ? (
            <div className="flex items-center justify-center py-14 text-fg-muted">
              <Spinner />
              <span className="ml-3 text-[13.5px]">Loading chart…</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="py-14 text-center text-[13px] text-fg-muted">
              No daily attendance data yet. Open the daily roster and submit
              attendance to see the trend.
            </div>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4c8f7d" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#4c8f7d" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 6"
                    stroke="var(--color-line-soft)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="var(--color-fg-subtle)"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--color-fg-subtle)"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "var(--fg)",
                    }}
                    formatter={(value) => [`${value}%`, "Rate"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#4c8f7d"
                    strokeWidth={2}
                    fill="url(#rateFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
function ContextPicker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  options: { id: number; label: string }[];
}) {
  return (
    <div className="min-w-[150px]">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </div>
      <Select
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full text-[13px]"
      >
        {options.length === 0 && <option value="">—</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "px-5 py-3 text-[13px] text-fg-muted",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </td>
  );
}