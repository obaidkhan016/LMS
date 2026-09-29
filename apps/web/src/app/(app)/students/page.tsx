"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Filter,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

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
import { StudentImportDialog } from "@/components/students/StudentImportDialog";
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
  studentsApi,
  type Student,
  type StudentInput,
} from "@/lib/api/students";

type FieldErrors = Record<string, string>;

/** Block Enter from submitting a form. Only the submit button can submit. */
function blockEnterSubmit(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  const tag = target.tagName;
  if (tag === "TEXTAREA") return;
  if (target instanceof HTMLButtonElement) return;
  e.preventDefault();
}

export default function StudentsPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<number | "">("");
  const [sectionFilter, setSectionFilter] = useState<number | "">("");

  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirm, setConfirm] = useState<Student | null>(null);

  const [form, setForm] = useState<StudentInput>({
    campus_id: 0,
    admission_number: "",
    full_name: "",
    father_name: "",
    mother_name: "",
    date_of_birth: null,
    gender: "",
    email: "",
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    status: "active",
    admission_date: null,
    enrollment: {
      academic_session_id: 0,
      grade_id: 0,
      section_id: 0,
      roll_number: "",
    },
  });

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

  useEffect(() => {
    if (!campusId) return;
    (async () => {
      try {
        const [ls, gs, secs, ses] = await Promise.all([
          educationLevelsApi.list(campusId),
          gradesApi.list(),
          sectionsApi.list(),
          academicSessionsApi.list(campusId),
        ]);
        setLevels(ls);
        const levelIds = new Set(ls.map((l) => l.id));
        const filteredGrades = gs.filter((g) =>
          levelIds.has(g.education_level_id),
        );
        setGrades(filteredGrades);
        const gradeIds = new Set(filteredGrades.map((g) => g.id));
        setSections(secs.filter((s) => gradeIds.has(s.grade_id)));
        setSessions(ses);
      } catch {
        /* silent */
      }
    })();
  }, [campusId]);

  async function load() {
    if (!campusId) return;
    setLoading(true);
    try {
      const data = await studentsApi.list({
        campus_id: campusId,
        grade_id: gradeFilter || undefined,
        section_id: sectionFilter || undefined,
        status: statusFilter || undefined,
        q: query || undefined,
      });
      setStudents(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not load students"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId, gradeFilter, sectionFilter, statusFilter]);

  const gradeMap = useMemo(() => {
    const m = new Map<number, Grade>();
    grades.forEach((g) => m.set(g.id, g));
    return m;
  }, [grades]);

  const sectionMap = useMemo(() => {
    const m = new Map<number, Section>();
    sections.forEach((s) => m.set(s.id, s));
    return m;
  }, [sections]);

  const availableGrades = useMemo(
    () =>
      grades.filter(
        (g) => !sectionFilter || sectionMap.get(sectionFilter)?.grade_id === g.id,
      ),
    [grades, sectionFilter, sectionMap],
  );

  function setField<K extends keyof StudentInput>(
    key: K,
    value: StudentInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((e) => {
        const copy = { ...e };
        delete copy[key as string];
        return copy;
      });
    }
  }

  function setEnrollField(
    key: keyof StudentInput["enrollment"],
    value: number | string | null,
  ) {
    setForm((f) => ({ ...f, enrollment: { ...f.enrollment, [key]: value } }));
    if (fieldErrors[`enrollment.${key}`]) {
      setFieldErrors((e) => {
        const copy = { ...e };
        delete copy[`enrollment.${key}`];
        return copy;
      });
    }
  }

  function openCreate() {
    if (!campusId) return;
    if (grades.length === 0 || sections.length === 0 || sessions.length === 0) {
      toast.error(
        "Set up education levels, grades, sections and an academic session first.",
      );
      return;
    }
    const firstSession = sessions.find((s) => s.is_active) ?? sessions[0]!;
    const firstGrade = grades[0]!;
    const firstSection =
      sections.find((s) => s.grade_id === firstGrade.id) ?? sections[0]!;
    setEditing(null);
    setForm({
      campus_id: campusId,
      admission_number: "",
      full_name: "",
      father_name: "",
      mother_name: "",
      date_of_birth: null,
      gender: "",
      email: "",
      phone: "",
      address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      status: "active",
      admission_date: null,
      enrollment: {
        academic_session_id: firstSession.id,
        grade_id: firstGrade.id,
        section_id: firstSection.id,
        roll_number: "",
      },
    });
    setFieldErrors({});
    setOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      campus_id: s.campus_id,
      admission_number: s.admission_number,
      full_name: s.full_name,
      father_name: s.father_name ?? "",
      mother_name: s.mother_name ?? "",
      date_of_birth: s.date_of_birth,
      gender: s.gender ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
      emergency_contact_name: s.emergency_contact_name ?? "",
      emergency_contact_phone: s.emergency_contact_phone ?? "",
      status: s.status,
      admission_date: s.admission_date,
      enrollment: {
        academic_session_id: s.current_enrollment?.academic_session_id ?? 0,
        grade_id: s.current_enrollment?.grade_id ?? 0,
        section_id: s.current_enrollment?.section_id ?? 0,
        roll_number: s.current_enrollment?.roll_number ?? "",
      },
    });
    setFieldErrors({});
    setOpen(true);
  }

  /** REQUIRED FIELDS — the definitive list. */
  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!form.admission_number.trim())
      e.admission_number = "Admission number is required";
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.father_name?.trim())
      e.father_name = "Father / guardian name is required";
    if (!form.phone?.trim()) e.phone = "Phone number is required";
    if (!form.admission_date) e.admission_date = "Admission date is required";
    if (!editing) {
      if (!form.enrollment.academic_session_id)
        e["enrollment.academic_session_id"] = "Academic session is required";
      if (!form.enrollment.grade_id)
        e["enrollment.grade_id"] = "Grade is required";
      if (!form.enrollment.section_id)
        e["enrollment.section_id"] = "Section is required";
    }
    return e;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(`Please fix ${Object.keys(errors).length} field(s)`);
      return;
    }
    setFieldErrors({});
    setSaving(true);

    const payload: StudentInput = {
      ...form,
      admission_number: form.admission_number.trim(),
      full_name: form.full_name.trim(),
      father_name: form.father_name?.trim() || null,
      mother_name: form.mother_name?.trim() || null,
      gender: form.gender?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
      emergency_contact_name: form.emergency_contact_name?.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone?.trim() || null,
      enrollment: {
        ...form.enrollment,
        roll_number: form.enrollment.roll_number?.trim() || null,
      },
    };

    try {
      if (editing) {
        const u = await studentsApi.update(editing.id, {
          full_name: payload.full_name,
          father_name: payload.father_name,
          mother_name: payload.mother_name,
          date_of_birth: payload.date_of_birth,
          gender: payload.gender,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          emergency_contact_name: payload.emergency_contact_name,
          emergency_contact_phone: payload.emergency_contact_phone,
          status: payload.status,
          admission_date: payload.admission_date,
        });
        setStudents((p) => p.map((x) => (x.id === u.id ? u : x)));
        toast.success("Student updated");
      } else {
        const c = await studentsApi.create(payload);
        setStudents((p) =>
          [...p, c].sort((a, b) => a.full_name.localeCompare(b.full_name)),
        );
        toast.success("Student created");
      }
      setOpen(false);
    } catch (err) {
      const msg = apiErrorMessage(err, "Save failed");
      toast.error(msg);
      if (msg.toLowerCase().includes("admission")) {
        setFieldErrors({ admission_number: msg });
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm) return;
    try {
      await studentsApi.remove(confirm.id);
      setStudents((p) => p.filter((x) => x.id !== confirm.id));
      toast.success("Student deleted");
      setConfirm(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
    setGradeFilter("");
    setSectionFilter("");
  }

  const hasFilters = query || statusFilter || gradeFilter || sectionFilter;

  if (campuses.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] rgs-fade-in">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">
          Students
        </h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">
          The full student directory for every campus.
        </p>
        <div className="mt-6">
          <EmptyState
            icon={GraduationCap}
            title="Create a campus first"
            description="Students belong to a campus. Create one before adding students."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] rgs-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            People
          </p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-fg">
            Students
          </h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            Search, filter, and manage student records.
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
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            leadingIcon={<Upload className="h-4 w-4" />}
          >
            Import CSV
          </Button>
          <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
            New student
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3 p-3">
          <div className="relative w-full max-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Name, admission #, father…"
              className="h-9 w-full rounded-[10px] border border-line bg-surface-inset pl-9 pr-3 text-[13px] text-fg placeholder:text-fg-subtle focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <Select
            value={gradeFilter}
            onChange={(e) =>
              setGradeFilter(e.target.value ? Number(e.target.value) : "")
            }
            className="h-9 w-[150px] text-[13px]"
          >
            <option value="">All grades</option>
            {availableGrades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>

          <Select
            value={sectionFilter}
            onChange={(e) =>
              setSectionFilter(e.target.value ? Number(e.target.value) : "")
            }
            className="h-9 w-[150px] text-[13px]"
          >
            <option value="">All sections</option>
            {sections
              .filter((s) => !gradeFilter || s.grade_id === gradeFilter)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {!gradeFilter
                    ? ` (${gradeMap.get(s.grade_id)?.name ?? ""})`
                    : ""}
                </option>
              ))}
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-[150px] text-[13px]"
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="transferred">Transferred</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="graduated">Graduated</option>
            <option value="suspended">Suspended</option>
          </Select>

          <Button variant="outline" size="sm" onClick={load}>
            <Filter className="h-3.5 w-3.5" />
            Apply
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-16 text-fg-muted">
            <Spinner />
            <span className="ml-3 text-[13.5px]">Loading students…</span>
          </div>
        </Card>
      ) : students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={hasFilters ? "No students match those filters" : "No students yet"}
          description={
            hasFilters
              ? "Try adjusting or clearing your filters."
              : "Add students individually, or use the Import CSV button to add them in bulk."
          }
          action={
            !hasFilters && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setImportOpen(true)}
                  leadingIcon={<Upload className="h-4 w-4" />}
                >
                  Import CSV
                </Button>
                <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
                  Add student
                </Button>
              </div>
            )
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-left">
                  <Th>Student</Th>
                  <Th>Admission #</Th>
                  <Th>Grade · Section</Th>
                  <Th>Roll #</Th>
                  <Th>Father</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const g = s.current_enrollment
                    ? gradeMap.get(s.current_enrollment.grade_id)
                    : null;
                  const sec = s.current_enrollment
                    ? sectionMap.get(s.current_enrollment.section_id)
                    : null;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                    >
                      <Td>
                        <span className="font-medium text-fg">{s.full_name}</span>
                      </Td>
                      <Td>
                        <span className="rounded-[6px] bg-surface-inset px-2 py-0.5 font-mono text-[11.5px] text-fg">
                          {s.admission_number}
                        </span>
                      </Td>
                      <Td>
                        {g || sec ? (
                          <span>
                            {g?.name ?? "—"}
                            {sec ? ` · ${sec.name}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>{s.current_enrollment?.roll_number || "—"}</Td>
                      <Td>{s.father_name || "—"}</Td>
                      <Td>
                        {s.status === "active" ? (
                          <Badge tone="success">Active</Badge>
                        ) : s.status === "suspended" ? (
                          <Badge tone="warning">Suspended</Badge>
                        ) : s.status === "withdrawn" ? (
                          <Badge tone="danger">Withdrawn</Badge>
                        ) : (
                          <Badge>{s.status}</Badge>
                        )}
                      </Td>
                      <Td align="right">
                        <RowActions
                          onEdit={() => openEdit(s)}
                          onDelete={() => setConfirm(s)}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editing ? "Edit student" : "New student"}
        description={
          editing
            ? "Update the student's record."
            : "Fields marked * are required."
        }
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="student-form" loading={saving}>
              {editing ? "Save changes" : "Create student"}
            </Button>
          </>
        }
      >
        <form
          id="student-form"
          onSubmit={submit}
          onKeyDown={blockEnterSubmit}
          className="space-y-5"
          noValidate
        >
          {/* Identity */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              Identity
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="s-adm">Admission number *</Label>
                <Input
                  id="s-adm"
                  value={form.admission_number}
                  onChange={(e) => setField("admission_number", e.target.value)}
                  placeholder="e.g. RGS-2026-001"
                  disabled={!!editing}
                  error={!!fieldErrors.admission_number}
                />
                <FieldError message={fieldErrors.admission_number} />
              </div>
              <div>
                <Label htmlFor="s-name">Full name *</Label>
                <Input
                  id="s-name"
                  value={form.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  placeholder="e.g. Ahmed Ali Khan"
                  error={!!fieldErrors.full_name}
                />
                <FieldError message={fieldErrors.full_name} />
              </div>
              <div>
                <Label htmlFor="s-father">Father / guardian *</Label>
                <Input
                  id="s-father"
                  value={form.father_name ?? ""}
                  onChange={(e) => setField("father_name", e.target.value)}
                  error={!!fieldErrors.father_name}
                />
                <FieldError message={fieldErrors.father_name} />
              </div>
              <div>
                <Label htmlFor="s-mother">Mother</Label>
                <Input
                  id="s-mother"
                  value={form.mother_name ?? ""}
                  onChange={(e) => setField("mother_name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="s-dob">Date of birth</Label>
                <Input
                  id="s-dob"
                  type="date"
                  value={form.date_of_birth ?? ""}
                  onChange={(e) =>
                    setField("date_of_birth", e.target.value || null)
                  }
                />
              </div>
              <div>
                <Label htmlFor="s-gender">Gender</Label>
                <Select
                  id="s-gender"
                  value={form.gender ?? ""}
                  onChange={(e) => setField("gender", e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              Contact
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="s-phone">Phone *</Label>
                <Input
                  id="s-phone"
                  value={form.phone ?? ""}
                  onChange={(e) => setField("phone", e.target.value)}
                  error={!!fieldErrors.phone}
                />
                <FieldError message={fieldErrors.phone} />
              </div>
              <div>
                <Label htmlFor="s-email">Email</Label>
                <Input
                  id="s-email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="s-address">Address</Label>
                <Input
                  id="s-address"
                  value={form.address ?? ""}
                  onChange={(e) => setField("address", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="s-emerg-name">Emergency contact</Label>
                <Input
                  id="s-emerg-name"
                  value={form.emergency_contact_name ?? ""}
                  onChange={(e) =>
                    setField("emergency_contact_name", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="s-emerg-phone">Emergency phone</Label>
                <Input
                  id="s-emerg-phone"
                  value={form.emergency_contact_phone ?? ""}
                  onChange={(e) =>
                    setField("emergency_contact_phone", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* Enrollment */}
          {!editing && (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                Initial enrollment
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="s-session">Academic session *</Label>
                  <Select
                    id="s-session"
                    value={form.enrollment.academic_session_id}
                    onChange={(e) =>
                      setEnrollField(
                        "academic_session_id",
                        Number(e.target.value),
                      )
                    }
                    error={!!fieldErrors["enrollment.academic_session_id"]}
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.is_active ? " (current)" : ""}
                      </option>
                    ))}
                  </Select>
                  <FieldError
                    message={fieldErrors["enrollment.academic_session_id"]}
                  />
                </div>
                <div>
                  <Label htmlFor="s-grade">Grade *</Label>
                  <Select
                    id="s-grade"
                    value={form.enrollment.grade_id}
                    onChange={(e) => {
                      const gid = Number(e.target.value);
                      const firstSection = sections.find(
                        (x) => x.grade_id === gid,
                      );
                      setForm((f) => ({
                        ...f,
                        enrollment: {
                          ...f.enrollment,
                          grade_id: gid,
                          section_id: firstSection?.id ?? 0,
                        },
                      }));
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy["enrollment.grade_id"];
                        delete copy["enrollment.section_id"];
                        return copy;
                      });
                    }}
                    error={!!fieldErrors["enrollment.grade_id"]}
                  >
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={fieldErrors["enrollment.grade_id"]} />
                </div>
                <div>
                  <Label htmlFor="s-section">Section *</Label>
                  <Select
                    id="s-section"
                    value={form.enrollment.section_id}
                    onChange={(e) =>
                      setEnrollField("section_id", Number(e.target.value))
                    }
                    error={!!fieldErrors["enrollment.section_id"]}
                  >
                    {sections
                      .filter((s) => s.grade_id === form.enrollment.grade_id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </Select>
                  <FieldError message={fieldErrors["enrollment.section_id"]} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="s-roll">Roll number</Label>
                  <Input
                    id="s-roll"
                    value={form.enrollment.roll_number ?? ""}
                    onChange={(e) =>
                      setEnrollField("roll_number", e.target.value)
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Record */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              Record
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="s-status">Status</Label>
                <Select
                  id="s-status"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="transferred">Transferred</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="graduated">Graduated</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="s-adm-date">Admission date *</Label>
                <Input
                  id="s-adm-date"
                  type="date"
                  value={form.admission_date ?? ""}
                  onChange={(e) =>
                    setField("admission_date", e.target.value || null)
                  }
                  error={!!fieldErrors.admission_date}
                />
                <FieldError message={fieldErrors.admission_date} />
              </div>
            </div>
          </div>
        </form>
      </Dialog>

      <ConfirmDelete
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
        name={confirm?.full_name ?? ""}
      />

      {campusId && (
        <StudentImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          campusId={campusId}
          onImported={load}
        />
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11.5px] text-danger">{message}</p>;
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
        Delete <span className="font-semibold">{name}</span>? Related enrollment
        records will also be removed.
      </p>
    </Dialog>
  );
}