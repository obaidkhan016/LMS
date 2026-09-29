"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import {
  createCampus,
  deleteCampus,
  listCampuses,
  updateCampus,
  type Campus,
  type CampusCreateInput,
} from "@/lib/api/campuses";
import { apiErrorMessage } from "@/lib/api/client";

const EMPTY_FORM: CampusCreateInput = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  principal_name: "",
  is_active: true,
};

export default function CampusesPage() {
  const [items, setItems] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campus | null>(null);
  const [form, setForm] = useState<CampusCreateInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Campus | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listCampuses({ q: query || undefined });
      setItems(data);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not load campuses"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(c: Campus) {
    setEditing(c);
    setForm({
      name: c.name,
      code: c.code,
      address: c.address ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      principal_name: c.principal_name ?? "",
      is_active: c.is_active,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload: CampusCreateInput = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      principal_name: form.principal_name?.trim() || null,
      is_active: form.is_active ?? true,
    };

    if (!payload.name) { setFormError("Name is required"); setSaving(false); return; }
    if (!payload.code) { setFormError("Code is required"); setSaving(false); return; }
    if (!/^[A-Z0-9_-]+$/.test(payload.code)) {
      setFormError("Code may only contain A–Z, 0–9, underscore, hyphen");
      setSaving(false);
      return;
    }

    try {
      if (editing) {
        const updated = await updateCampus(editing.id, payload);
        setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success(`Campus “${updated.name}” updated`);
      } else {
        const created = await createCampus(payload);
        setItems((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast.success(`Campus “${created.name}” created`);
      }
      setDialogOpen(false);
    } catch (err) {
      const msg = apiErrorMessage(err, "Save failed");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteCampus(confirmDelete.id);
      setItems((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      toast.success(`Campus “${confirmDelete.name}” deleted`);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Delete failed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] rgs-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
            Institution
          </p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-fg">
            Campuses
          </h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            Physical locations of Roots Garden Schools &amp; Colleges.
          </p>
        </div>

        <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
          New campus
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
              placeholder="Search by name or code…"
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
            <span className="ml-3 text-[13.5px]">Loading campuses…</span>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No campuses yet"
          description="Create your first Roots Garden campus to begin configuring the institution."
          action={
            <Button onClick={openCreate} leadingIcon={<Plus className="h-4 w-4" />}>
              Create campus
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                    Campus
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                    Code
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                    Principal
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                    Contact
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-line-soft last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-5 py-3">
                      <div className="text-[13.5px] font-medium text-fg">
                        {c.name}
                      </div>
                      {c.address && (
                        <div className="mt-0.5 text-[12px] text-fg-muted">
                          {c.address}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-[6px] bg-surface-inset px-2 py-0.5 font-mono text-[11.5px] text-fg">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-fg-muted">
                      {c.principal_name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-[12.5px] text-fg">{c.phone || "—"}</div>
                      <div className="text-[12px] text-fg-muted">
                        {c.email || "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-muted">
                          <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="grid h-8 w-8 place-items-center rounded-[8px] text-fg-muted hover:bg-surface-hover hover:text-fg"
                          aria-label={`Edit ${c.name}`}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(c)}
                          className="grid h-8 w-8 place-items-center rounded-[8px] text-fg-muted hover:bg-danger-bg hover:text-danger"
                          aria-label={`Delete ${c.name}`}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        title={editing ? "Edit campus" : "New campus"}
        description={
          editing
            ? "Update the campus record."
            : "Add a physical location to the institution."
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="campus-form" loading={saving}>
              {editing ? "Save changes" : "Create campus"}
            </Button>
          </>
        }
      >
        <form id="campus-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="c-name">Name *</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Roots Garden Rawalpindi"
                autoFocus
                required
              />
            </div>

            <div>
              <Label htmlFor="c-code">Code *</Label>
              <Input
                id="c-code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. RGS-RWP"
                required
              />
              <p className="mt-1 text-[11.5px] text-fg-subtle">
                Uppercase letters, digits, hyphen, underscore.
              </p>
            </div>

            <div>
              <Label htmlFor="c-principal">Principal / head</Label>
              <Input
                id="c-principal"
                value={form.principal_name ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, principal_name: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="c-address">Address</Label>
              <Input
                id="c-address"
                value={form.address ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Street, city, postal code"
              />
            </div>

            <div>
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+92 …"
              />
            </div>

            <div>
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="campus@rootsgarden.edu.pk"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span className="text-[13px] text-fg">
              Campus is active and available for scheduling
            </span>
          </label>

          {formError && (
            <div className="rounded-[10px] border border-danger/30 bg-danger-bg px-3.5 py-3 text-[13px] text-danger">
              {formError}
            </div>
          )}
        </form>
      </Dialog>

      <Dialog
        open={!!confirmDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
        title="Delete campus"
        description="This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={onDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] text-fg">
          Delete <span className="font-semibold">{confirmDelete?.name}</span>? If
          the campus has students, teachers, or academic sessions, the server will
          refuse and suggest deactivating it instead.
        </p>
      </Dialog>
    </div>
  );
}