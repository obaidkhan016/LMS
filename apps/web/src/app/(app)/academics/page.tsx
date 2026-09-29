"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
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

type Tab = "sessions" | "levels" | "grades" | "sections" | "subjects";

const TABS: { id: Tab; label: string }[] = [
  { id: "sessions", label: "Academic Sessions" },
  { id: "levels", label: "Education Levels" },
  { id: "grades", label: "Grades" },
  { id: "sections", label: "Sections" },
  { id: "subjects", label: "Subjects" },
];

export default function AcademicsPage() {
  const [tab, setTab] = useState<Tab>("sessions");
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [activeCampusId, setActiveCampusId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await listCampuses({ active_only: false });
        setCampuses(data);
        if (data.length > 0) setActiveCampusId(data[0]!.id);
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not load campuses"));
      }
    })();
  }, []);

  if (campuses.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] rgs-fade-in">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">
          Academics
        </h1>
        <p className="mt-1 text-[13.5px] text-fg-muted">
          Education levels, grades, sections, and academic sessions.
        </p>
        <div className="mt-6">
          <EmptyState
            icon={BookOpen}
            title="Create a campus first"
            description="The academic structure belongs to a campus. Create one before configuring sessions, levels, grades, and sections."
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
            Structure
          </p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-fg">
            Academics
          </h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            Define the academic hierarchy for the institution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-fg-muted">Campus:</span>
          <Select
            value={activeCampusId ?? ""}
            onChange={(e) => setActiveCampusId(Number(e.target.value))}
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

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 border-b border-line">
        {TABS.map((t) => (
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

      {activeCampusId && (
        <>
          {tab === "sessions" && <SessionsTab campusId={activeCampusId} />}
          {tab === "levels" && <LevelsTab campusId={activeCampusId} />}
          {tab === "grades" && <GradesTab campusId={activeCampusId} />}
          {tab === "sections" && <SectionsTab campusId={activeCampusId} />}
          {tab === "subjects" && <SubjectsTab campusId={activeCampusId} />}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACADEMIC SESSIONS TAB
   ═══════════════════════════════════════════════════════════════════ */
function SessionsTab({ campusId }: { campusId: number }) {
  const [items, setItems] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_active: false,
  });
  const [confirm, setConfirm] = useState<AcademicSession | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await academicSessionsApi.list(campusId));
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
    setForm({ name: "", start_date: "", end_date: "", is_active: false });
    setErr(null);
    setOpen(true);
  }
  function openEdit(s: AcademicSession) {
    setEditing(s);
    setForm({
      name: s.name,
      start_date: s.start_date,
      end_date: s.end_date,
      is_active: s.is_active,
    });
    setErr(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        const u = await academicSessionsApi.update(editing.id, form);
        setItems((p) => p.map((x) => (x.id === u.id ? u : x)));
        toast.success("Session updated");
      } else {
        const c = await academicSessionsApi.create({ campus_id: campusId, ...form });
        setItems((p) => [c, ...p]);
        toast.success("Session created");
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
      await academicSessionsApi.remove(confirm.id);
      setItems((p) => p.filter((x) => x.id !== confirm.id));
      toast.success("Session deleted");
      setConfirm(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  return (
    <TabShell
      title="Academic Sessions"
      subtitle="Year boundaries (e.g. 2025–2026). Attendance is tied to a session."
      onCreate={openCreate}
      createLabel="New session"
    >
      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No academic sessions yet"
          description="Create your first session — e.g. 2025–2026 — to begin scheduling."
          action={
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
              Create session
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Name</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                >
                  <Td>
                    <span className="font-medium text-fg">{s.name}</span>
                  </Td>
                  <Td>{s.start_date}</Td>
                  <Td>{s.end_date}</Td>
                  <Td>
                    {s.is_active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge>Inactive</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <RowActions
                      onEdit={() => openEdit(s)}
                      onDelete={() => setConfirm(s)}
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
        title={editing ? "Edit session" : "New academic session"}
        description="Sessions isolate attendance and enrollment by academic year."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="session-form" loading={saving}>
              {editing ? "Save changes" : "Create"}
            </Button>
          </>
        }
      >
        <form id="session-form" onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="s-name">Name *</Label>
            <Input
              id="s-name"
              placeholder="e.g. 2025-2026"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="s-start">Start date *</Label>
              <Input
                id="s-start"
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="s-end">End date *</Label>
              <Input
                id="s-end"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-[13px] text-fg">
              Mark as the current active session
            </span>
          </label>
          {err && <ErrorBox>{err}</ErrorBox>}
        </form>
      </Dialog>

      <ConfirmDelete
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
        name={confirm?.name ?? ""}
      />
    </TabShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EDUCATION LEVELS TAB
   ═══════════════════════════════════════════════════════════════════ */
function LevelsTab({ campusId }: { campusId: number }) {
  const [items, setItems] = useState<EducationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EducationLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    sort_order: 0,
    is_active: true,
  });
  const [confirm, setConfirm] = useState<EducationLevel | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await educationLevelsApi.list(campusId));
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
    setForm({ name: "", code: "", sort_order: 0, is_active: true });
    setErr(null);
    setOpen(true);
  }
  function openEdit(l: EducationLevel) {
    setEditing(l);
    setForm({
      name: l.name,
      code: l.code,
      sort_order: l.sort_order,
      is_active: l.is_active,
    });
    setErr(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        const u = await educationLevelsApi.update(editing.id, form);
        setItems((p) => p.map((x) => (x.id === u.id ? u : x)));
        toast.success("Level updated");
      } else {
        const c = await educationLevelsApi.create({ campus_id: campusId, ...form });
        setItems((p) => [...p, c]);
        toast.success("Level created");
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
      await educationLevelsApi.remove(confirm.id);
      setItems((p) => p.filter((x) => x.id !== confirm.id));
      toast.success("Level deleted");
      setConfirm(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  return (
    <TabShell
      title="Education Levels"
      subtitle="Early Years, Primary, Middle, High School, HSSC, O Levels, etc."
      onCreate={openCreate}
      createLabel="New level"
    >
      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No education levels yet"
          description="Levels group grades into stages of schooling."
          action={
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
              Create level
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                >
                  <Td>
                    <span className="font-medium text-fg">{l.name}</span>
                  </Td>
                  <Td>
                    <span className="rounded-[6px] bg-surface-inset px-2 py-0.5 font-mono text-[11.5px] text-fg">
                      {l.code}
                    </span>
                  </Td>
                  <Td>{l.sort_order}</Td>
                  <Td>
                    {l.is_active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge>Inactive</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <RowActions
                      onEdit={() => openEdit(l)}
                      onDelete={() => setConfirm(l)}
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
        title={editing ? "Edit level" : "New education level"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="level-form" loading={saving}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="level-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="l-name">Name *</Label>
              <Input
                id="l-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. High School"
                required
              />
            </div>
            <div>
              <Label htmlFor="l-code">Code *</Label>
              <Input
                id="l-code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. HS"
                required
              />
            </div>
            <div>
              <Label htmlFor="l-order">Sort order</Label>
              <Input
                id="l-order"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-[13px] text-fg">Active</span>
          </label>
          {err && <ErrorBox>{err}</ErrorBox>}
        </form>
      </Dialog>

      <ConfirmDelete
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
        name={confirm?.name ?? ""}
      />
    </TabShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GRADES TAB
   ═══════════════════════════════════════════════════════════════════ */
function GradesTab({ campusId }: { campusId: number }) {
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [items, setItems] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    education_level_id: 0,
    name: "",
    code: "",
    sort_order: 0,
    is_active: true,
  });
  const [confirm, setConfirm] = useState<Grade | null>(null);

  async function load() {
    setLoading(true);
    try {
      const ls = await educationLevelsApi.list(campusId);
      setLevels(ls);
      const gs = await gradesApi.list();
      const levelIds = new Set(ls.map((l) => l.id));
      setItems(gs.filter((g) => levelIds.has(g.education_level_id)));
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

  const levelName = useMemo(() => {
    const m = new Map<number, string>();
    levels.forEach((l) => m.set(l.id, l.name));
    return m;
  }, [levels]);

  function openCreate() {
    if (levels.length === 0) {
      toast.error("Create an education level first");
      return;
    }
    setEditing(null);
    setForm({
      education_level_id: levels[0]!.id,
      name: "",
      code: "",
      sort_order: 0,
      is_active: true,
    });
    setErr(null);
    setOpen(true);
  }
  function openEdit(g: Grade) {
    setEditing(g);
    setForm({
      education_level_id: g.education_level_id,
      name: g.name,
      code: g.code,
      sort_order: g.sort_order,
      is_active: g.is_active,
    });
    setErr(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (editing) {
        const u = await gradesApi.update(editing.id, form);
        setItems((p) => p.map((x) => (x.id === u.id ? u : x)));
        toast.success("Grade updated");
      } else {
        const c = await gradesApi.create(form);
        setItems((p) => [...p, c]);
        toast.success("Grade created");
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
      await gradesApi.remove(confirm.id);
      setItems((p) => p.filter((x) => x.id !== confirm.id));
      toast.success("Grade deleted");
      setConfirm(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  return (
    <TabShell
      title="Grades"
      subtitle="Individual year-groups within a level (Grade 9, Grade 10, 11th, 12th…)."
      onCreate={openCreate}
      createLabel="New grade"
    >
      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No grades yet"
          description="Grades sit under education levels and contain sections."
          action={
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
              Create grade
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Grade</Th>
                <Th>Code</Th>
                <Th>Level</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                >
                  <Td>
                    <span className="font-medium text-fg">{g.name}</span>
                  </Td>
                  <Td>
                    <span className="rounded-[6px] bg-surface-inset px-2 py-0.5 font-mono text-[11.5px] text-fg">
                      {g.code}
                    </span>
                  </Td>
                  <Td>{levelName.get(g.education_level_id) ?? "—"}</Td>
                  <Td>
                    {g.is_active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge>Inactive</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <RowActions
                      onEdit={() => openEdit(g)}
                      onDelete={() => setConfirm(g)}
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
        title={editing ? "Edit grade" : "New grade"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="grade-form" loading={saving}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="grade-form" onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="g-level">Education level *</Label>
            <Select
              id="g-level"
              value={form.education_level_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  education_level_id: Number(e.target.value),
                }))
              }
            >
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="g-name">Name *</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Grade 9"
                required
              />
            </div>
            <div>
              <Label htmlFor="g-code">Code *</Label>
              <Input
                id="g-code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. G9"
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-[13px] text-fg">Active</span>
          </label>
          {err && <ErrorBox>{err}</ErrorBox>}
        </form>
      </Dialog>

      <ConfirmDelete
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
        name={confirm?.name ?? ""}
      />
    </TabShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTIONS TAB
   ═══════════════════════════════════════════════════════════════════ */
function SectionsTab({ campusId }: { campusId: number }) {
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [items, setItems] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    grade_id: 0,
    name: "",
    capacity: undefined as number | undefined,
    is_active: true,
  });
  const [confirm, setConfirm] = useState<Section | null>(null);

  async function load() {
    setLoading(true);
    try {
      const ls = await educationLevelsApi.list(campusId);
      setLevels(ls);
      const levelIds = new Set(ls.map((l) => l.id));
      const gs = (await gradesApi.list()).filter((g) =>
        levelIds.has(g.education_level_id),
      );
      setGrades(gs);
      const gradeIds = new Set(gs.map((g) => g.id));
      setItems((await sectionsApi.list()).filter((s) => gradeIds.has(s.grade_id)));
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

  const gradeName = useMemo(() => {
    const m = new Map<number, string>();
    grades.forEach((g) => m.set(g.id, g.name));
    return m;
  }, [grades]);

  const levelOfGrade = useMemo(() => {
    const m = new Map<number, string>();
    grades.forEach((g) => {
      const lvl = levels.find((l) => l.id === g.education_level_id);
      m.set(g.id, lvl?.name ?? "");
    });
    return m;
  }, [grades, levels]);

  function openCreate() {
    if (grades.length === 0) {
      toast.error("Create a grade first");
      return;
    }
    setEditing(null);
    setForm({
      grade_id: grades[0]!.id,
      name: "",
      capacity: undefined,
      is_active: true,
    });
    setErr(null);
    setOpen(true);
  }
  function openEdit(s: Section) {
    setEditing(s);
    setForm({
      grade_id: s.grade_id,
      name: s.name,
      capacity: s.capacity ?? undefined,
      is_active: s.is_active,
    });
    setErr(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const payload = { ...form, capacity: form.capacity ?? null };
      if (editing) {
        const u = await sectionsApi.update(editing.id, payload);
        setItems((p) => p.map((x) => (x.id === u.id ? u : x)));
        toast.success("Section updated");
      } else {
        const c = await sectionsApi.create(payload);
        setItems((p) => [...p, c]);
        toast.success("Section created");
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
      await sectionsApi.remove(confirm.id);
      setItems((p) => p.filter((x) => x.id !== confirm.id));
      toast.success("Section deleted");
      setConfirm(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  return (
    <TabShell
      title="Sections"
      subtitle="Class sections within a grade — A, B, C, or custom names."
      onCreate={openCreate}
      createLabel="New section"
    >
      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No sections yet"
          description="Sections are the containers students are enrolled into."
          action={
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
              Create section
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Section</Th>
                <Th>Grade</Th>
                <Th>Level</Th>
                <Th>Capacity</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                >
                  <Td>
                    <span className="font-medium text-fg">{s.name}</span>
                  </Td>
                  <Td>{gradeName.get(s.grade_id) ?? "—"}</Td>
                  <Td>{levelOfGrade.get(s.grade_id) ?? "—"}</Td>
                  <Td>{s.capacity ?? "—"}</Td>
                  <Td>
                    {s.is_active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge>Inactive</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <RowActions
                      onEdit={() => openEdit(s)}
                      onDelete={() => setConfirm(s)}
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
        title={editing ? "Edit section" : "New section"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="section-form" loading={saving}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="section-form" onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="sec-grade">Grade *</Label>
            <Select
              id="sec-grade"
              value={form.grade_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, grade_id: Number(e.target.value) }))
              }
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sec-name">Name *</Label>
              <Input
                id="sec-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. A"
                required
              />
            </div>
            <div>
              <Label htmlFor="sec-capacity">Capacity</Label>
              <Input
                id="sec-capacity"
                type="number"
                value={form.capacity ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    capacity: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-[13px] text-fg">Active</span>
          </label>
          {err && <ErrorBox>{err}</ErrorBox>}
        </form>
      </Dialog>

      <ConfirmDelete
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
        name={confirm?.name ?? ""}
      />
    </TabShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUBJECTS TAB
   ═══════════════════════════════════════════════════════════════════ */
function SubjectsTab({ campusId }: { campusId: number }) {
  const [items, setItems] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    is_active: true,
  });
  const [confirm, setConfirm] = useState<Subject | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await subjectsApi.list(campusId));
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
    setForm({ name: "", code: "", description: "", is_active: true });
    setErr(null);
    setOpen(true);
  }
  function openEdit(s: Subject) {
    setEditing(s);
    setForm({
      name: s.name,
      code: s.code,
      description: s.description ?? "",
      is_active: s.is_active,
    });
    setErr(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload = {
      campus_id: campusId,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        const u = await subjectsApi.update(editing.id, payload);
        setItems((p) => p.map((x) => (x.id === u.id ? u : x)));
        toast.success("Subject updated");
      } else {
        const c = await subjectsApi.create(payload);
        setItems((p) => [...p, c].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Subject created");
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
      await subjectsApi.remove(confirm.id);
      setItems((p) => p.filter((x) => x.id !== confirm.id));
      toast.success("Subject deleted");
      setConfirm(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Delete failed"));
    }
  }

  return (
    <TabShell
      title="Subjects"
      subtitle="Mathematics, Physics, Chemistry, Biology, English, Urdu, Computer Science, etc."
      onCreate={openCreate}
      createLabel="New subject"
    >
      {loading ? (
        <LoadingCard />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Subjects are what teachers get assigned to teach."
          action={
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
              Create subject
            </Button>
          }
        />
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                >
                  <Td>
                    <span className="font-medium text-fg">{s.name}</span>
                  </Td>
                  <Td>
                    <span className="rounded-[6px] bg-surface-inset px-2 py-0.5 font-mono text-[11.5px] text-fg">
                      {s.code}
                    </span>
                  </Td>
                  <Td>{s.description || "—"}</Td>
                  <Td>
                    {s.is_active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge>Inactive</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <RowActions
                      onEdit={() => openEdit(s)}
                      onDelete={() => setConfirm(s)}
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
        title={editing ? "Edit subject" : "New subject"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="subject-form" loading={saving}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form id="subject-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="sub-name">Name *</Label>
              <Input
                id="sub-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mathematics"
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="sub-code">Code *</Label>
              <Input
                id="sub-code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. MATH"
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="sub-desc">Description</Label>
              <Input
                id="sub-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-[13px] text-fg">Active</span>
          </label>
          {err && <ErrorBox>{err}</ErrorBox>}
        </form>
      </Dialog>

      <ConfirmDelete
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
        name={confirm?.name ?? ""}
      />
    </TabShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared bits
   ═══════════════════════════════════════════════════════════════════ */
function TabShell({
  title,
  subtitle,
  onCreate,
  createLabel,
  children,
}: {
  title: string;
  subtitle: string;
  onCreate: () => void;
  createLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-muted">{subtitle}</p>
        </div>
        <Button onClick={onCreate} leadingIcon={<Plus className="h-4 w-4" />}>
          {createLabel}
        </Button>
      </div>
      {children}
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

function LoadingCard() {
  return (
    <Card>
      <div className="flex items-center justify-center py-16 text-fg-muted">
        <Spinner />
        <span className="ml-3 text-[13.5px]">Loading…</span>
      </div>
    </Card>
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