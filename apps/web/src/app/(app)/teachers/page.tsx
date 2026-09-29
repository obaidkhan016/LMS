"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Layers,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
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
import { teachersApi, type Teacher, type TeacherInput } from "@/lib/api/teachers";
import {
  teacherAssignmentsApi,
  type TeacherAssignment,
} from "@/lib/api/teacher-assignments";

type Tab = "teachers" | "assignments";

export default function TeachersPage() {
  const [tab, setTab] = useState<Tab>("teachers");
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listCampuses();
        setCampuses(data);
        if (data.length > 0) setCampusId(data[0]!.id);
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not load campuses"));
      }
    })();
  }, []);

  if (campuses.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] rgs-fade-in">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">
          Teachers
        </h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">
          Teacher records and subject/class assignments.
        </p>
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="Create a campus first"
            description="Teachers belong to a campus. Create one before adding staff."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] rgs-fade-in">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            People
          </p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-fg">
            Teachers
          </h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            Staff records, departments, and teaching assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-fg-muted">Campus:</span>
          <Select
            value={campusId ?? ""}
            onChange={(e) => setCampusId(Number(e.target.value))}
            className="h-9 w-[220px] text-[13px]"
          >
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-1 border-b border-line">
        {(
          [
            { id: "teachers", label: "All Teachers" },
            { id: "assignments", label: "Teaching Assignments" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "relative -mb-px h-10 px-4 text-[13.5px] font-medium transition-colors " +
              (tab === t.id
                ? "border-b-2 border-primary text-fg"
                : "border-b-2 border-transparent text-fg-muted hover:text-fg")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {campusId && tab === "teachers" && <TeachersTab campusId={campusId} />}
      {campusId && tab === "assignments" && <AssignmentsTab campusId={campusId} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Teachers Tab
   ═══════════════════════════════════════════════════════════════════ */
function TeachersTab({ campusId }: { campusId: number }) {
  const [items, setItems] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherInput>({
    campus_id: campusId,
    employee_id: "",
    full_name: "",
    email: "",
    phone: "",
    department: "",
    status: "active",
    joined_at: null,
  });

  async function load() {
    setLoading(true);
    try {
      const data = await teachersApi.list({
        campus_id: campusId,
        q: query || undefined,
      });
      setItems(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Load failed"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  function openCreate() {
    setEditing(null);
    setForm({
      campus_id: campusId,
      employee_id: "",
      full_name: "",
      email: "",
      phone: "",
      department: "",
      status: "active",
      joined_at: null,
    });
    setErr(null);
    setOpen(true);
  }
  function openEdit(t: Teacher) {
    setEditing(t);
    setForm({
      campus_id: t.campus_id,
      employee_id: t.employee_id,
      full_name: t.full_name,
      email: t.email ?? "",
      phone: t.phone ?? "",
      department: t.department ?? "",
      status: t.status,
      joined_at: t.joined_at,
    });
    setErr(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload: TeacherInput = {
      campus_id: campusId,
      employee_id: form.employee_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      department: form.department?.trim() || null,
      status: form.status || "active",
      joined_at: form.joined_at || null,
    };
    if (!payload.employee_id || !payload.full_name) {
      setErr("Employee ID and full name are required");
      setSaving(false);
      return;
    }
    try {
      if (editing) {
        const u = await teachersApi.update(editing.id, {
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          department: payload.department,
          status: payload.status,
          joined_at: payload.joined_at,
        });
        setItems((p) => p.map((x) => (x.id === u.id ? u : x)));
        toast.success("Teacher updated");
      } else {
        const c = await teachersApi.create(payload);
        setItems((p) => [...p, c].sort((a, b) => a.full_name.localeCompare(b.full_name)));
        toast.success("Teacher created");
      }
      setOpen(false);
    } catch (e) {
      const m = apiErrorMessage(e, "Save failed");
      setErr(m);
      toast.error(m);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm) return;
    try {
      await teachersApi.remove(confirm.id);
      setItems((p) => p.filter((x) => x.id !== confirm.id));
      toast.success("Teacher deleted");
      setConfirm(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">
            All Teachers
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            {items.length} {items.length === 1 ? "teacher" : "teachers"} on this campus.
          </p>
        </div>
        <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
          New teacher
        </Button>
      </div>

      <Card className="mb-4">
        <div className="flex items-center gap-3 p-3">
          <div className="relative w-full max-w-[340px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search by name or employee ID…"
              className="h-9 w-full rounded-[10px] border border-line bg-surface-inset pl-9 pr-3 text-[13px] text-fg placeholder:text-fg-subtle focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-16 text-fg-muted">
            <Spinner />
            <span className="ml-3 text-[13.5px]">Loading…</span>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teachers yet"
          description="Add teaching staff, then create their subject and class assignments."
          action={
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
              Add teacher
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Name</Th>
                <Th>Employee ID</Th>
                <Th>Department</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                >
                  <Td>
                    <span className="font-medium text-fg">{t.full_name}</span>
                  </Td>
                  <Td>
                    <span className="rounded-[6px] bg-surface-inset px-2 py-0.5 font-mono text-[11.5px] text-fg">
                      {t.employee_id}
                    </span>
                  </Td>
                  <Td>{t.department || "—"}</Td>
                  <Td>
                    <div className="text-[12.5px] text-fg">{t.email || "—"}</div>
                    <div className="text-[12px] text-fg-muted">{t.phone || "—"}</div>
                  </Td>
                  <Td>
                    {t.status === "active" ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge>Inactive</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <RowActions
                      onEdit={() => openEdit(t)}
                      onDelete={() => setConfirm(t)}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editing ? "Edit teacher" : "New teacher"}
        description="Employee ID is unique across the campus."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="teacher-form" loading={saving}>
              {editing ? "Save changes" : "Create teacher"}
            </Button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="t-empid">Employee ID *</Label>
              <Input
                id="t-empid"
                value={form.employee_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employee_id: e.target.value }))
                }
                placeholder="e.g. T-0001"
                disabled={!!editing}
                required
              />
            </div>
            <div>
              <Label htmlFor="t-name">Full name *</Label>
              <Input
                id="t-name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                placeholder="e.g. Mr. Ahmed Khan"
                required
              />
            </div>
            <div>
              <Label htmlFor="t-email">Email</Label>
              <Input
                id="t-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="t-phone">Phone</Label>
              <Input
                id="t-phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="t-dept">Department</Label>
              <Input
                id="t-dept"
                value={form.department ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
                placeholder="e.g. Science"
              />
            </div>
            <div>
              <Label htmlFor="t-status">Status</Label>
              <Select
                id="t-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="t-joined">Joined date</Label>
              <Input
                id="t-joined"
                type="date"
                value={form.joined_at ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, joined_at: e.target.value || null }))
                }
              />
            </div>
          </div>
          {err && <ErrorBox>{err}</ErrorBox>}
        </form>
      </Dialog>

      <ConfirmDelete
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
        name={confirm?.full_name ?? ""}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Assignments Tab
   ═══════════════════════════════════════════════════════════════════ */
function AssignmentsTab({ campusId }: { campusId: number }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [items, setItems] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<TeacherAssignment | null>(null);

  const [form, setForm] = useState({
    teacher_id: 0,
    subject_id: 0,
    education_level_id: 0,
    grade_id: 0,
    section_id: 0,
    academic_session_id: 0,
  });

  async function load() {
    setLoading(true);
    try {
      const [ts, ss, ls, gs, secs, ses] = await Promise.all([
        teachersApi.list({ campus_id: campusId }),
        subjectsApi.list(campusId),
        educationLevelsApi.list(campusId),
        gradesApi.list(),
        sectionsApi.list(),
        academicSessionsApi.list(campusId),
      ]);
      setTeachers(ts);
      setSubjects(ss);
      setLevels(ls);
      setSessions(ses);
      const levelIds = new Set(ls.map((l) => l.id));
      const filteredGrades = gs.filter((g) => levelIds.has(g.education_level_id));
      setGrades(filteredGrades);
      const gradeIds = new Set(filteredGrades.map((g) => g.id));
      setSections(secs.filter((s) => gradeIds.has(s.grade_id)));

      const assigns = await teacherAssignmentsApi.list();
      setItems(
        assigns.filter(
          (a) =>
            ts.some((t) => t.id === a.teacher_id) &&
            ss.some((s) => s.id === a.subject_id),
        ),
      );
    } catch (e) {
      toast.error(apiErrorMessage(e, "Load failed"));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  const teacherName = useMemo(() => {
    const m = new Map<number, string>();
    teachers.forEach((t) => m.set(t.id, t.full_name));
    return m;
  }, [teachers]);
  const subjectName = useMemo(() => {
    const m = new Map<number, string>();
    subjects.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [subjects]);
  const gradeName = useMemo(() => {
    const m = new Map<number, string>();
    grades.forEach((g) => m.set(g.id, g.name));
    return m;
  }, [grades]);
  const sectionName = useMemo(() => {
    const m = new Map<number, string>();
    sections.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [sections]);
  const sessionName = useMemo(() => {
    const m = new Map<number, string>();
    sessions.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [sessions]);

  const availableGrades = useMemo(
    () => grades.filter((g) => g.education_level_id === form.education_level_id),
    [grades, form.education_level_id],
  );
  const availableSections = useMemo(
    () => sections.filter((s) => s.grade_id === form.grade_id),
    [sections, form.grade_id],
  );

  function openCreate() {
    if (
      teachers.length === 0 ||
      subjects.length === 0 ||
      levels.length === 0 ||
      sessions.length === 0
    ) {
      toast.error(
        "Create teachers, subjects, education levels, grades, sections and academic sessions first.",
      );
      return;
    }
    const firstLevel = levels[0]!;
    const firstGrade =
      grades.find((g) => g.education_level_id === firstLevel.id) ?? grades[0];
    const firstSection = sections.find((s) => s.grade_id === firstGrade?.id) ?? sections[0];
    setForm({
      teacher_id: teachers[0]!.id,
      subject_id: subjects[0]!.id,
      education_level_id: firstLevel.id,
      grade_id: firstGrade?.id ?? 0,
      section_id: firstSection?.id ?? 0,
      academic_session_id: sessions[0]!.id,
    });
    setErr(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const created = await teacherAssignmentsApi.create({
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        grade_id: form.grade_id,
        section_id: form.section_id,
        academic_session_id: form.academic_session_id,
        is_active: true,
      });
      setItems((p) => [created, ...p]);
      toast.success("Assignment created");
      setOpen(false);
    } catch (e) {
      const m = apiErrorMessage(e, "Save failed");
      setErr(m);
      toast.error(m);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm) return;
    try {
      await teacherAssignmentsApi.remove(confirm.id);
      setItems((p) => p.filter((x) => x.id !== confirm.id));
      toast.success("Assignment removed");
      setConfirm(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">
            Teaching Assignments
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            Who teaches which subject, to which class, in which section.
          </p>
        </div>
        <Button onClick={openCreate} leadingIcon={<Link2 className="h-4 w-4" />}>
          New assignment
        </Button>
      </div>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-16 text-fg-muted">
            <Spinner />
            <span className="ml-3 text-[13.5px]">Loading…</span>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No assignments yet"
          description="Link a teacher to a subject, grade, section, and academic session."
          action={
            <Button onClick={openCreate} leadingIcon={<Link2 className="h-4 w-4" />}>
              Create assignment
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Teacher</Th>
                <Th>Subject</Th>
                <Th>Grade</Th>
                <Th>Section</Th>
                <Th>Session</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                >
                  <Td>
                    <span className="font-medium text-fg">
                      {teacherName.get(a.teacher_id) ?? `#${a.teacher_id}`}
                    </span>
                  </Td>
                  <Td>{subjectName.get(a.subject_id) ?? `#${a.subject_id}`}</Td>
                  <Td>{gradeName.get(a.grade_id) ?? `#${a.grade_id}`}</Td>
                  <Td>{sectionName.get(a.section_id) ?? `#${a.section_id}`}</Td>
                  <Td>{sessionName.get(a.academic_session_id) ?? `#${a.academic_session_id}`}</Td>
                  <Td align="right">
                    <button
                      onClick={() => setConfirm(a)}
                      className="grid h-8 w-8 place-items-center rounded-[8px] text-fg-muted hover:bg-danger-bg hover:text-danger"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="New teaching assignment"
        description="Links a teacher to a subject, grade, section, and academic session."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="assign-form" loading={saving}>
              Create assignment
            </Button>
          </>
        }
      >
        <form id="assign-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="a-teacher">Teacher *</Label>
              <Select
                id="a-teacher"
                value={form.teacher_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, teacher_id: Number(e.target.value) }))
                }
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.employee_id})
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="a-subject">Subject *</Label>
              <Select
                id="a-subject"
                value={form.subject_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject_id: Number(e.target.value) }))
                }
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="a-session">Academic session *</Label>
              <Select
                id="a-session"
                value={form.academic_session_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    academic_session_id: Number(e.target.value),
                  }))
                }
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="a-level">Education level *</Label>
              <Select
                id="a-level"
                value={form.education_level_id}
                onChange={(e) => {
                  const lid = Number(e.target.value);
                  const firstGrade = grades.find((g) => g.education_level_id === lid);
                  const firstSection = sections.find(
                    (s) => s.grade_id === firstGrade?.id,
                  );
                  setForm((f) => ({
                    ...f,
                    education_level_id: lid,
                    grade_id: firstGrade?.id ?? 0,
                    section_id: firstSection?.id ?? 0,
                  }));
                }}
              >
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="a-grade">Grade *</Label>
              <Select
                id="a-grade"
                value={form.grade_id}
                onChange={(e) => {
                  const gid = Number(e.target.value);
                  const firstSection = sections.find((s) => s.grade_id === gid);
                  setForm((f) => ({
                    ...f,
                    grade_id: gid,
                    section_id: firstSection?.id ?? 0,
                  }));
                }}
              >
                {availableGrades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="a-section">Section *</Label>
              <Select
                id="a-section"
                value={form.section_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, section_id: Number(e.target.value) }))
                }
              >
                {availableSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {err && <ErrorBox>{err}</ErrorBox>}
        </form>
      </Dialog>

      <ConfirmDelete
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
        name="this assignment"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */
function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted ${
        align === "right" ? "text-right" : "text-left"
      }`}
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
      className={`px-5 py-3 text-[13px] text-fg-muted ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={onEdit}
        className="grid h-8 w-8 place-items-center rounded-[8px] text-fg-muted hover:bg-surface-hover hover:text-fg"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="grid h-8 w-8 place-items-center rounded-[8px] text-fg-muted hover:bg-danger-bg hover:text-danger"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-danger/30 bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
      {children}
    </div>
  );
}

function ConfirmDelete({
  open,
  onCancel,
  onConfirm,
  name,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  name: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Confirm delete"
      description="This action cannot be undone."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </>
      }
    >
      <p className="text-[13.5px] text-fg">
        Delete <span className="font-semibold">{name}</span>? Related records may
        block the deletion.
      </p>
    </Dialog>
  );
}