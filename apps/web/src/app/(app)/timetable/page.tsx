"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  DoorOpen,
  Gamepad2,
  PartyPopper,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
import { subjectsApi, type Subject } from "@/lib/api/subjects";
import { teachersApi, type Teacher } from "@/lib/api/teachers";
import {
  timetablesApi,
  type TimetableSlot,
} from "@/lib/api/timetables";
import {
  timetablePeriodsApi,
  type PeriodKind,
  type TimetablePeriod,
} from "@/lib/api/timetable-periods";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 0, short: "Mon", long: "Monday" },
  { value: 1, short: "Tue", long: "Tuesday" },
  { value: 2, short: "Wed", long: "Wednesday" },
  { value: 3, short: "Thu", long: "Thursday" },
  { value: 4, short: "Fri", long: "Friday" },
  { value: 5, short: "Sat", long: "Saturday" },
];

const KIND_OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "class", label: "Class" },
  { value: "break", label: "Break" },
  { value: "club", label: "Club" },
  { value: "game", label: "Game" },
];

const DEFAULT_LABELS: Record<PeriodKind, string> = {
  class: "",
  break: "Lunch",
  club: "Club",
  game: "Games",
};

const KIND_TINT: Record<
  PeriodKind,
  { bg: string; text: string; icon: typeof Sparkles }
> = {
  class: { bg: "bg-surface", text: "text-fg", icon: Sparkles },
  break: { bg: "bg-warning-bg", text: "text-warning", icon: PartyPopper },
  club: { bg: "bg-primary-soft", text: "text-primary-soft-fg", icon: Sparkles },
  game: { bg: "bg-success-bg", text: "text-success", icon: Gamepad2 },
};

function durationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (Number.isNaN(sh) || Number.isNaN(eh)) return 0;
  return eh * 60 + em - (sh * 60 + sm);
}

function fmtDuration(mins: number): string {
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h}h ${m}m`;
}

function displayPeriodNumber(
  entries: TimetablePeriod[],
  idx: number,
): number | null {
  if (entries[idx]?.kind === "break") return null;
  let n = 0;
  for (let i = 0; i <= idx; i++) {
    if (entries[i]?.kind !== "break") n += 1;
  }
  return n;
}

interface SlotEditForm {
  subject_id: number;
  teacher_id: number;
  start_time: string;
  end_time: string;
  room: string;
}

export default function TimetablePage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);

  const [campusId, setCampusId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [levelId, setLevelId] = useState<number | null>(null);
  const [gradeId, setGradeId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodsLoading, setPeriodsLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [editDay, setEditDay] = useState(0);
  const [editPeriod, setEditPeriod] = useState(1);
  const [form, setForm] = useState<SlotEditForm>({
    subject_id: 0,
    teacher_id: 0,
    start_time: "08:00",
    end_time: "08:40",
    room: "",
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<TimetableSlot | null>(
    null,
  );

  const [periodOpen, setPeriodOpen] = useState(false);

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
        const [ses, lv, gr, sec, sub, tch] = await Promise.all([
          academicSessionsApi.list(campusId),
          educationLevelsApi.list(campusId),
          gradesApi.list(),
          sectionsApi.list(),
          subjectsApi.list(campusId),
          teachersApi.list({ campus_id: campusId }),
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
        setSubjects(sub);
        setTeachers(tch);

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

  // Load periods AND slots whenever section changes
  useEffect(() => {
    if (!sectionId || !sessionId) {
      setPeriods([]);
      setSlots([]);
      return;
    }
    (async () => {
      setPeriodsLoading(true);
      setLoading(true);
      try {
        const [per, sl] = await Promise.all([
          timetablePeriodsApi.list(sectionId),
          timetablesApi.listForSection(sectionId, sessionId),
        ]);
        setPeriods(per);
        setSlots(sl);
      } catch (e) {
        toast.error(apiErrorMessage(e, "Could not load timetable"));
      } finally {
        setPeriodsLoading(false);
        setLoading(false);
      }
    })();
  }, [sectionId, sessionId]);

  async function reloadSlots() {
    if (!sectionId || !sessionId) return;
    setLoading(true);
    try {
      const data = await timetablesApi.listForSection(sectionId, sessionId);
      setSlots(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not load timetable"));
    } finally {
      setLoading(false);
    }
  }

  const subjectsMap = useMemo(() => {
    const m = new Map<number, Subject>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const teachersMap = useMemo(() => {
    const m = new Map<number, Teacher>();
    teachers.forEach((t) => m.set(t.id, t));
    return m;
  }, [teachers]);

  const availableGrades = useMemo(
    () => grades.filter((g) => !levelId || g.education_level_id === levelId),
    [grades, levelId],
  );
  const availableSections = useMemo(
    () => sections.filter((s) => !gradeId || s.grade_id === gradeId),
    [sections, gradeId],
  );

  const slotMap = useMemo(() => {
    const m = new Map<string, TimetableSlot>();
    slots.forEach((s) => m.set(`${s.day_of_week}:${s.period_number}`, s));
    return m;
  }, [slots]);

  const periodMap = useMemo(() => {
    const m = new Map<number, TimetablePeriod>();
    periods.forEach((p) => m.set(p.period, p));
    return m;
  }, [periods]);

  function openCell(day: number, period: number) {
    const p = periodMap.get(period);
    if (p && (p.kind === "break" || p.kind === "club" || p.kind === "game"))
      return;
    const existing = slotMap.get(`${day}:${period}`) ?? null;
    setEditingSlot(existing);
    setEditDay(day);
    setEditPeriod(period);

    if (existing) {
      setForm({
        subject_id: existing.subject_id,
        teacher_id: existing.teacher_id,
        start_time: existing.start_time.slice(0, 5),
        end_time: existing.end_time.slice(0, 5),
        room: existing.room ?? "",
      });
    } else {
      setForm({
        subject_id: subjects[0]?.id ?? 0,
        teacher_id: teachers[0]?.id ?? 0,
        start_time: p?.start_time ?? "08:00",
        end_time: p?.end_time ?? "08:40",
        room: "",
      });
    }
    setFieldErrors({});
    setEditOpen(true);
  }

  async function saveSlot(e: FormEvent) {
    e.preventDefault();
    if (!campusId || !sessionId || !gradeId || !sectionId) return;

    const errors: Record<string, string> = {};
    if (!form.subject_id) errors.subject_id = "Subject is required";
    if (!form.teacher_id) errors.teacher_id = "Teacher is required";
    if (!form.start_time) errors.start_time = "Start time is required";
    if (!form.end_time) errors.end_time = "End time is required";
    if (form.end_time && form.start_time && form.end_time <= form.start_time)
      errors.end_time = "End time must be after start time";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    try {
      if (editingSlot) {
        const updated = await timetablesApi.update(editingSlot.id, {
          subject_id: form.subject_id,
          teacher_id: form.teacher_id,
          start_time: `${form.start_time}:00`,
          end_time: `${form.end_time}:00`,
          room: form.room.trim() || null,
        });
        setSlots((p) => p.map((s) => (s.id === updated.id ? updated : s)));
        toast.success("Slot updated");
      } else {
        const created = await timetablesApi.create({
          campus_id: campusId,
          academic_session_id: sessionId,
          grade_id: gradeId,
          section_id: sectionId,
          subject_id: form.subject_id,
          teacher_id: form.teacher_id,
          day_of_week: editDay,
          period_number: editPeriod,
          start_time: `${form.start_time}:00`,
          end_time: `${form.end_time}:00`,
          room: form.room.trim() || null,
          is_active: true,
        });
        setSlots((p) => [...p, created]);
        toast.success("Slot created");
      }
      setEditOpen(false);
    } catch (err) {
      const msg = apiErrorMessage(err, "Save failed");
      setFieldErrors({ _global: msg });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot() {
    if (!confirmDelete) return;
    try {
      await timetablesApi.remove(confirmDelete.id);
      setSlots((p) => p.filter((s) => s.id !== confirmDelete.id));
      toast.success("Slot removed");
      setConfirmDelete(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  if (campuses.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] rgs-fade-in">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">
          Timetable
        </h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">
          Weekly class schedules.
        </p>
        <div className="mt-6">
          <EmptyState
            icon={Calendar}
            title="Create a campus first"
            description="Timetables belong to a campus. Create one, then set up sessions, grades, and sections."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] rgs-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            Scheduling
          </p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-fg">
            Timetable
          </h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            Each class section has its own periods and weekly timetable.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setPeriodOpen(true)}
          leadingIcon={<Settings2 className="h-4 w-4" />}
          disabled={!sectionId}
          title={
            !sectionId
              ? "Select a section to configure its periods"
              : "Configure this section's periods"
          }
        >
          Configure periods
        </Button>
      </div>

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
        </div>
      </Card>

      {!sectionId || !sessionId ? (
        <EmptyState
          icon={Calendar}
          title="Select a class section"
          description="Choose a campus, session, level, grade, and section to view or edit the timetable."
        />
      ) : periodsLoading || loading ? (
        <Card>
          <div className="flex items-center justify-center py-16 text-fg-muted">
            <Spinner />
            <span className="ml-3 text-[13.5px]">Loading timetable…</span>
          </div>
        </Card>
      ) : subjects.length === 0 || teachers.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Set up subjects and teachers first"
          description="You need at least one subject and one teacher before building a timetable."
        />
      ) : (
        <Card className="overflow-hidden p-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-1.5">
              <thead>
                <tr>
                  <th className="w-[130px] rounded-[10px] bg-surface-inset px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                    Period
                  </th>
                  {DAYS.map((d) => (
                    <th
                      key={d.value}
                      className="rounded-[10px] bg-surface-inset px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-fg-muted"
                    >
                      {d.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, idx) => {
                  const duration = durationMinutes(p.start_time, p.end_time);
                  const displayNo = displayPeriodNumber(periods, idx);
                  const tint = KIND_TINT[p.kind] ?? KIND_TINT.class;
                  const KindIcon = tint.icon;

                  if (p.kind === "break") {
                    return (
                      <tr key={`break-${p.period}`}>
                        <td className="px-3 py-1 align-middle">
                          <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
                            {p.start_time}–{p.end_time}
                          </div>
                        </td>
                        <td colSpan={6} className="p-0">
                          <div className="flex h-8 items-center justify-center gap-2 rounded-[8px] border border-dashed border-warning/30 bg-warning-bg text-[11.5px] font-medium text-warning">
                            <PartyPopper className="h-3.5 w-3.5" />
                            <span>{p.label || "Break"}</span>
                            <span className="opacity-70">
                              · {fmtDuration(duration)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (p.kind === "club" || p.kind === "game") {
                    return (
                      <tr key={p.period}>
                        <td className="rounded-[10px] bg-surface-inset px-3 py-2.5 align-middle">
                          <div className="text-[13px] font-semibold text-fg">
                            Period {displayNo}
                          </div>
                          <div className="mt-0.5 text-[11px] text-fg-subtle">
                            {p.start_time} – {p.end_time}
                          </div>
                          <div className="mt-0.5 text-[10.5px] text-fg-subtle">
                            {fmtDuration(duration)}
                          </div>
                        </td>
                        <td colSpan={6} className="p-0 align-middle">
                          <div
                            className={cn(
                              "flex h-[74px] items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-soft text-[13px] font-medium tracking-[0.02em]",
                              tint.bg,
                              tint.text,
                            )}
                          >
                            <KindIcon className="h-4 w-4" />
                            <span>
                              {p.label ||
                                (p.kind === "club"
                                  ? "Club Period"
                                  : "Game Period")}
                            </span>
                            <span className="text-[11px] opacity-70">
                              · {fmtDuration(duration)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.period} className="align-top">
                      <td className="rounded-[10px] bg-surface-inset px-3 py-2.5">
                        <div className="text-[13px] font-semibold text-fg">
                          Period {displayNo}
                        </div>
                        <div className="mt-0.5 text-[11px] text-fg-subtle">
                          {p.start_time} – {p.end_time}
                        </div>
                        <div className="mt-0.5 text-[10.5px] text-fg-subtle">
                          {fmtDuration(duration)}
                        </div>
                      </td>
                      {DAYS.map((d) => {
                        const slot = slotMap.get(`${d.value}:${p.period}`);
                        return (
                          <td
                            key={d.value}
                            className="p-0"
                            style={{ minWidth: 0 }}
                          >
                            {slot ? (
                              <button
                                type="button"
                                onClick={() => openCell(d.value, p.period)}
                                className="group flex w-full flex-col items-start gap-1.5 rounded-[10px] border border-line bg-surface px-3 py-2.5 text-left transition-all duration-150 hover:-translate-y-[1px] hover:border-primary/30 hover:bg-surface-hover hover:shadow-[0_4px_14px_-6px_rgb(0_0_0/0.15)]"
                              >
                                <div className="truncate text-[12.5px] font-semibold tracking-[-0.005em] text-fg">
                                  {subjectsMap.get(slot.subject_id)?.name ??
                                    `#${slot.subject_id}`}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {teachersMap.get(slot.teacher_id)
                                      ?.full_name ?? `#${slot.teacher_id}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 text-[10.5px] text-fg-subtle">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {slot.start_time.slice(0, 5)}
                                  </span>
                                  {slot.room && (
                                    <span className="inline-flex items-center gap-1">
                                      <DoorOpen className="h-3 w-3" />
                                      {slot.room}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openCell(d.value, p.period)}
                                className="group flex h-[74px] w-full items-center justify-center rounded-[10px] border border-dashed border-line-soft text-fg-subtle transition-all duration-150 hover:border-primary/40 hover:bg-primary-soft/40 hover:text-primary"
                                title={`Add class · ${d.long} · Period ${p.period}`}
                              >
                                <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PeriodConfigDialog
        open={periodOpen}
        onClose={() => setPeriodOpen(false)}
        sectionId={sectionId}
        periods={periods}
        onSaved={(updated) => {
          setPeriods(updated);
          void reloadSlots();
        }}
      />

      <Dialog
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title={editingSlot ? "Edit class slot" : "Add class slot"}
        description={`${DAYS.find((d) => d.value === editDay)?.long ?? ""} · Period ${editPeriod}`}
        footer={
          <>
            {editingSlot && (
              <Button
                variant="danger"
                onClick={() => {
                  setEditOpen(false);
                  setConfirmDelete(editingSlot);
                }}
                disabled={saving}
                leadingIcon={<Trash2 className="h-4 w-4" />}
              >
                Remove
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="slot-form" loading={saving}>
              {editingSlot ? "Save changes" : "Add to timetable"}
            </Button>
          </>
        }
      >
        <form
          id="slot-form"
          onSubmit={saveSlot}
          noValidate
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const t = e.target as HTMLElement;
            if (t.tagName === "TEXTAREA") return;
            if (t instanceof HTMLButtonElement) return;
            e.preventDefault();
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="t-subject">Subject *</Label>
            <Select
              id="t-subject"
              value={form.subject_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject_id: Number(e.target.value) }))
              }
              error={!!fieldErrors.subject_id}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="t-teacher">Teacher *</Label>
            <Select
              id="t-teacher"
              value={form.teacher_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, teacher_id: Number(e.target.value) }))
              }
              error={!!fieldErrors.teacher_id}
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.employee_id})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="t-start">Start time *</Label>
              <Input
                id="t-start"
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_time: e.target.value }))
                }
                error={!!fieldErrors.start_time}
              />
            </div>
            <div>
              <Label htmlFor="t-end">End time *</Label>
              <Input
                id="t-end"
                type="time"
                value={form.end_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_time: e.target.value }))
                }
                error={!!fieldErrors.end_time}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="t-room">Room</Label>
            <Input
              id="t-room"
              value={form.room}
              onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
              placeholder="e.g. Room 12"
            />
          </div>

          {fieldErrors._global && (
            <div className="rounded-[10px] border border-danger/30 bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
              {fieldErrors._global}
            </div>
          )}
        </form>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove class slot"
        description="This removes the slot from the timetable."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteSlot}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-fg">
          Remove{" "}
          <span className="font-semibold">
            {confirmDelete
              ? subjectsMap.get(confirmDelete.subject_id)?.name ?? "this slot"
              : ""}
          </span>{" "}
          from the timetable?
        </p>
      </Dialog>
    </div>
  );
}

/* ── Period config dialog (per section) ────────────────────────── */
function PeriodConfigDialog({
  open,
  onClose,
  sectionId,
  periods,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  sectionId: number | null;
  periods: TimetablePeriod[];
  onSaved: (periods: TimetablePeriod[]) => void;
}) {
  const [local, setLocal] = useState<TimetablePeriod[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLocal(
        periods.map((p) => ({
          period: p.period,
          start_time: p.start_time,
          end_time: p.end_time,
          kind: p.kind ?? "class",
          label: p.label ?? null,
        })),
      );
      setErr(null);
    }
  }, [open, periods]);

  function update<K extends keyof TimetablePeriod>(
    idx: number,
    key: K,
    value: TimetablePeriod[K],
  ) {
    setLocal((p) =>
      p.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, [key]: value };
        if (key === "kind") {
          const k = value as PeriodKind;
          const prevKind = row.kind;
          const wasDefault =
            !row.label || row.label === DEFAULT_LABELS[prevKind];
          if (k === "class") next.label = null;
          else if (wasDefault) next.label = DEFAULT_LABELS[k];
        }
        return next;
      }),
    );
  }

  function moveUp(idx: number) {
    if (idx <= 0) return;
    setLocal((p) => {
      const copy = [...p];
      [copy[idx - 1], copy[idx]] = [copy[idx]!, copy[idx - 1]!];
      return copy.map((r, i) => ({ ...r, period: i + 1 }));
    });
  }

  function moveDown(idx: number) {
    if (idx >= local.length - 1) return;
    setLocal((p) => {
      const copy = [...p];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1]!, copy[idx]!];
      return copy.map((r, i) => ({ ...r, period: i + 1 }));
    });
  }

  function addPeriod() {
    if (local.length >= 30) return;
    const last = local[local.length - 1];
    const nextStart = last?.end_time ?? "08:00";
    const [hh, mm] = nextStart.split(":").map(Number);
    const endMinutes = (hh ?? 0) * 60 + (mm ?? 0) + 40;
    const eH = String(Math.floor(endMinutes / 60) % 24).padStart(2, "0");
    const eM = String(endMinutes % 60).padStart(2, "0");
    setLocal([
      ...local,
      {
        period: (last?.period ?? 0) + 1,
        start_time: nextStart,
        end_time: `${eH}:${eM}`,
        kind: "class",
        label: null,
      },
    ]);
  }

  function removePeriod(idx: number) {
    const next = local.filter((_, i) => i !== idx);
    setLocal(next.map((r, i) => ({ ...r, period: i + 1 })));
  }

  async function save() {
    if (!sectionId) return;
    setErr(null);
    for (const p of local) {
      if (!p.start_time || !p.end_time) {
        setErr(`Row ${p.period}: start and end times are required`);
        return;
      }
      if (p.end_time <= p.start_time) {
        setErr(`Row ${p.period}: end time must be after start time`);
        return;
      }
    }
    setSaving(true);
    try {
      const saved = await timetablePeriodsApi.save(sectionId, local);
      onSaved(saved);
      toast.success("Periods updated for this section");
      onClose();
    } catch (e) {
      const msg = apiErrorMessage(e, "Save failed");
      setErr(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      title="Configure periods for this section"
      description="Breaks are gaps between periods and are not numbered. Club and Game periods count like classes."
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save periods
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-[10px] border border-line">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-inset">
                <th className="w-[70px] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  No.
                </th>
                <th className="w-[110px] px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  Kind
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  Label
                </th>
                <th className="w-[115px] px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  Start
                </th>
                <th className="w-[115px] px-2 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  End
                </th>
                <th className="w-[70px] px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  Length
                </th>
                <th className="w-[92px] px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {local.map((p, i) => {
                const duration = durationMinutes(p.start_time, p.end_time);
                const tint = KIND_TINT[p.kind] ?? KIND_TINT.class;
                const isBreak = p.kind === "break";
                const displayNo = displayPeriodNumber(local, i);
                return (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-line-soft last:border-0",
                      isBreak && "bg-warning-bg/30",
                    )}
                  >
                    <td className="px-3 py-2.5 text-[14px] font-semibold">
                      {isBreak ? (
                        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-warning">
                          Gap
                        </span>
                      ) : (
                        <span className="text-fg">{displayNo}</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <select
                        value={p.kind}
                        onChange={(e) =>
                          update(i, "kind", e.target.value as PeriodKind)
                        }
                        className={cn(
                          "h-9 w-full rounded-[8px] border border-line px-2 text-[13px] font-medium focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
                          tint.bg,
                          tint.text,
                        )}
                      >
                        {KIND_OPTIONS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2.5">
                      {p.kind === "class" ? (
                        <span className="pl-1 text-[12px] italic text-fg-subtle">
                          — teaching period —
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={p.label ?? ""}
                          maxLength={20}
                          onChange={(e) =>
                            update(i, "label", e.target.value || null)
                          }
                          placeholder={
                            p.kind === "break"
                              ? "Lunch"
                              : p.kind === "club"
                                ? "Football Club"
                                : "Games"
                          }
                          className="h-9 w-full rounded-[8px] border border-line bg-surface px-2.5 text-[13px] text-fg placeholder:text-fg-subtle focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <input
                        type="time"
                        value={p.start_time}
                        onChange={(e) =>
                          update(i, "start_time", e.target.value)
                        }
                        className="h-9 w-full rounded-[8px] border border-line bg-surface px-2 text-[13px] text-fg focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <input
                        type="time"
                        value={p.end_time}
                        onChange={(e) => update(i, "end_time", e.target.value)}
                        className="h-9 w-full rounded-[8px] border border-line bg-surface px-2 text-[13px] text-fg focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-right text-[12px] font-medium text-fg-muted">
                      {fmtDuration(duration)}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveUp(i)}
                          disabled={i === 0}
                          className="grid h-7 w-7 place-items-center rounded-[6px] text-fg-muted hover:bg-surface-hover hover:text-fg disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(i)}
                          disabled={i === local.length - 1}
                          className="grid h-7 w-7 place-items-center rounded-[6px] text-fg-muted hover:bg-surface-hover hover:text-fg disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePeriod(i)}
                          disabled={local.length <= 1}
                          className="grid h-7 w-7 place-items-center rounded-[6px] text-fg-muted hover:bg-danger-bg hover:text-danger disabled:opacity-25 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Button
          variant="outline"
          onClick={addPeriod}
          leadingIcon={<Plus className="h-4 w-4" />}
          disabled={local.length >= 30}
        >
          Add period
        </Button>

        {err && (
          <div className="rounded-[10px] border border-danger/30 bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
            {err}
          </div>
        )}
      </div>
    </Dialog>
  );
}

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
    <div className="min-w-[160px]">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full rounded-[10px] border border-line bg-surface-inset px-2.5 text-[13px] text-fg focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
      >
        {options.length === 0 && <option value="">—</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}