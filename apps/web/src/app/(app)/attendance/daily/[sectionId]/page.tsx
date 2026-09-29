"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Lock,
  MinusCircle,
  Save,
  Search,
  Send,
  Timer,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { apiErrorMessage } from "@/lib/api/client";
import { listCampuses } from "@/lib/api/campuses";
import {
  dailyAttendanceApi,
  type DailyRoster,
  type DailyStatus,
} from "@/lib/api/daily-attendance";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  DailyStatus,
  { label: string; icon: typeof Check; activeClass: string }
> = {
  present: {
    label: "Present",
    icon: Check,
    activeClass: "bg-success-bg text-success border-success/40",
  },
  absent: {
    label: "Absent",
    icon: XCircle,
    activeClass: "bg-danger-bg text-danger border-danger/40",
  },
  late: {
    label: "Late",
    icon: Timer,
    activeClass: "bg-warning-bg text-warning border-warning/40",
  },
  excused: {
    label: "Excused",
    icon: MinusCircle,
    activeClass: "bg-surface-inset text-fg border-line",
  },
};

const ORDER: DailyStatus[] = ["present", "absent", "late", "excused"];

export default function DailyRosterPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = use(params);
  const search = useSearchParams();

  const sessionParam = search.get("session");
  const dateParam = search.get("date") ?? new Date().toISOString().slice(0, 10);

  const [campusId, setCampusId] = useState<number | null>(null);
  const [roster, setRoster] = useState<DailyRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [marks, setMarks] = useState<Record<number, DailyStatus>>({});
  const [query, setQuery] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);

  const locked = !!roster?.submitted;

  useEffect(() => {
    (async () => {
      try {
        const list = await listCampuses();
        if (list.length > 0) setCampusId(list[0]!.id);
      } catch {
        /* silent */
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!sessionParam || !campusId) return;
      setLoading(true);
      try {
        const data = await dailyAttendanceApi.roster({
          campus_id: campusId,
          academic_session_id: Number(sessionParam),
          section_id: Number(sectionId),
          date: dateParam,
        });
        setRoster(data);
        const init: Record<number, DailyStatus> = {};
        data.records.forEach((r) => {
          init[r.student_id] = r.status;
        });
        setMarks(init);
      } catch (e) {
        toast.error(apiErrorMessage(e, "Could not load roster"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, sessionParam, dateParam, campusId]);

  const filtered = useMemo(() => {
    if (!roster) return [];
    if (!query.trim()) return roster.records;
    const q = query.toLowerCase();
    return roster.records.filter(
      (r) =>
        r.student_name.toLowerCase().includes(q) ||
        r.admission_number.toLowerCase().includes(q) ||
        (r.roll_number ?? "").toLowerCase().includes(q),
    );
  }, [roster, query]);

  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0, excused = 0;
    for (const sid of Object.keys(marks)) {
      const s = marks[Number(sid)];
      if (s === "present") present++;
      else if (s === "absent") absent++;
      else if (s === "late") late++;
      else if (s === "excused") excused++;
    }
    return { present, absent, late, excused };
  }, [marks]);

  function setMark(studentId: number, status: DailyStatus) {
    if (locked) return;
    setMarks((m) => ({ ...m, [studentId]: status }));
  }

  function markAll(status: DailyStatus) {
    if (locked || !roster) return;
    const next: Record<number, DailyStatus> = {};
    roster.records.forEach((r) => (next[r.student_id] = status));
    setMarks(next);
  }

  async function save() {
    if (!roster || !sessionParam) return;
    const payload = roster.records.map((r) => ({
      student_id: r.student_id,
      status: marks[r.student_id] ?? "present",
    }));
    setSaving(true);
    try {
      const updated = await dailyAttendanceApi.mark({
        campus_id: roster.campus_id,
        academic_session_id: Number(sessionParam),
        grade_id: roster.grade_id,
        section_id: roster.section_id,
        attendance_date: roster.attendance_date,
        records: payload,
      });
      setRoster(updated);
      toast.success("Draft saved");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!roster || !sessionParam) return;
    setSaving(true);
    try {
      const payload = roster.records.map((r) => ({
        student_id: r.student_id,
        status: marks[r.student_id] ?? "present",
      }));
      await dailyAttendanceApi.mark({
        campus_id: roster.campus_id,
        academic_session_id: Number(sessionParam),
        grade_id: roster.grade_id,
        section_id: roster.section_id,
        attendance_date: roster.attendance_date,
        records: payload,
      });
      const updated = await dailyAttendanceApi.submit({
        campus_id: roster.campus_id,
        academic_session_id: Number(sessionParam),
        section_id: roster.section_id,
        attendance_date: roster.attendance_date,
      });
      setRoster(updated);
      toast.success("Daily attendance submitted to admin");
      setSubmitOpen(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not submit"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-fg-muted">
          <Spinner />
          <span className="text-[13.5px]">Loading daily roster…</span>
        </div>
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="mx-auto max-w-[600px] rgs-fade-in">
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-danger" />
          <h2 className="mt-3 text-[16px] font-semibold text-fg">
            Roster not available
          </h2>
          <p className="mt-1 text-[13px] text-fg-muted">
            The section or academic session could not be found.
          </p>
          <Link
            href="/attendance"
            className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to attendance
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] rgs-fade-in">
      <div className="mb-5">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to attendance
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">
              Daily · {roster.grade_name} · {roster.section_name}
            </h1>
            {locked ? (
              <Badge tone="success">
                <Lock className="h-3 w-3" />
                Submitted
              </Badge>
            ) : (
              <Badge tone="warning">Draft</Badge>
            )}
          </div>
          <div className="mt-1.5 text-[12.5px] text-fg-muted">
            {roster.attendance_date} · {roster.total_students} students
            {roster.submitted_at &&
              ` · submitted ${roster.submitted_at.slice(0, 10)}`}
          </div>
        </div>

        {!locked && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => markAll("present")}
              leadingIcon={<Check className="h-4 w-4" />}
            >
              All present
            </Button>
            <Button
              variant="outline"
              onClick={() => markAll("absent")}
              leadingIcon={<XCircle className="h-4 w-4" />}
            >
              All absent
            </Button>
            <Button
              variant="outline"
              onClick={save}
              loading={saving}
              leadingIcon={<Save className="h-4 w-4" />}
            >
              Save draft
            </Button>
            <Button
              onClick={() => setSubmitOpen(true)}
              leadingIcon={<Send className="h-4 w-4" />}
            >
              Submit to admin
            </Button>
          </div>
        )}

        {locked && (
          <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-inset px-3.5 py-2 text-[12.5px] text-fg-muted">
            <Lock className="h-3.5 w-3.5" />
            Locked — submitted to admin
          </div>
        )}
      </div>

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Present" value={summary.present} tone="text-success" />
          <SummaryStat label="Absent" value={summary.absent} tone="text-danger" />
          <SummaryStat label="Late" value={summary.late} tone="text-warning" />
          <SummaryStat label="Excused" value={summary.excused} tone="text-fg-muted" />
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-3 p-3">
          <div className="relative w-full max-w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, admission #, roll #…"
              className="h-9 w-full rounded-[10px] border border-line bg-surface-inset pl-9 pr-3 text-[13px] text-fg placeholder:text-fg-subtle focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-fg-muted">
          {roster.records.length === 0
            ? "No students are enrolled in this section."
            : "No students match your search."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, idx) => {
            const current = marks[r.student_id] ?? "present";
            return (
              <Card
                key={r.student_id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3",
                  locked && "opacity-90",
                )}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-inset text-[12.5px] font-semibold text-fg-muted">
                  {r.roll_number || String(idx + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-fg">
                    {r.student_name}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-fg-subtle">
                    {r.admission_number}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {ORDER.map((s) => {
                    const meta = STATUS_META[s];
                    const Icon = meta.icon;
                    const active = current === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={locked}
                        onClick={() => setMark(r.student_id, s)}
                        className={cn(
                          "flex h-9 items-center gap-1.5 rounded-[8px] border px-3 text-[12.5px] font-medium transition-all",
                          active
                            ? meta.activeClass
                            : "border-line bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg",
                          locked && "cursor-not-allowed",
                        )}
                        title={meta.label}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={submitOpen}
        onClose={() => !saving && setSubmitOpen(false)}
        title="Submit daily attendance"
        description="This locks the record and sends it to admin."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSubmitOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={submit} loading={saving}>
              Confirm & submit
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-[13.5px] text-fg">
          <p>
            Submit daily attendance for{" "}
            <span className="font-semibold">
              {roster.grade_name} · {roster.section_name}
            </span>{" "}
            on {roster.attendance_date}?
          </p>
          <div className="grid grid-cols-2 gap-3 rounded-[10px] bg-surface-inset p-3">
            <SummaryLine label="Present" value={summary.present} tone="text-success" />
            <SummaryLine label="Absent" value={summary.absent} tone="text-danger" />
            <SummaryLine label="Late" value={summary.late} tone="text-warning" />
            <SummaryLine label="Excused" value={summary.excused} tone="text-fg-muted" />
          </div>
          <p className="text-[12px] text-fg-muted">
            Once submitted, records become read-only for teachers. Admin can
            still correct them.
          </p>
        </div>
      </Dialog>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </div>
      <div className={cn("mt-1 text-[20px] font-semibold", tone)}>{value}</div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px] text-fg-muted">{label}</span>
      <span className={cn("text-[13px] font-semibold", tone)}>{value}</span>
    </div>
  );
}