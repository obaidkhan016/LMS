"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { apiErrorMessage } from "@/lib/api/client";
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
  bulkImportStudents,
  type BulkImportResult,
  type StudentImportRow,
} from "@/lib/api/student-imports";

/* ─── Which target fields we support ─────────────────────────── */

type FieldKey =
  | "admission_number"
  | "full_name"
  | "father_name"
  | "mother_name"
  | "date_of_birth"
  | "gender"
  | "email"
  | "phone"
  | "address"
  | "roll_number"
  | "__ignore__";

const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "admission_number", label: "Admission number", required: true },
  { key: "full_name", label: "Full name", required: true },
  { key: "father_name", label: "Father / guardian" },
  { key: "mother_name", label: "Mother" },
  { key: "date_of_birth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "roll_number", label: "Roll number" },
  { key: "__ignore__", label: "— Ignore this column —" },
];

/* Auto-guess mapping from a header name */
function guessField(header: string): FieldKey {
  const h = header.toLowerCase().trim().replace(/[\s_-]+/g, "");
  if (/(admission|admno|admissionno|regno|reg|registration)/.test(h))
    return "admission_number";
  if (/(fullname|studentname|name)/.test(h) && !/father|mother|guardian/.test(h))
    return "full_name";
  if (/(father|guardian|parent)/.test(h)) return "father_name";
  if (/mother/.test(h)) return "mother_name";
  if (/(dob|birth|dateofbirth)/.test(h)) return "date_of_birth";
  if (/gender|sex/.test(h)) return "gender";
  if (/email|mail/.test(h)) return "email";
  if (/phone|mobile|contact|cell/.test(h)) return "phone";
  if (/address|street|city/.test(h)) return "address";
  if (/roll/.test(h)) return "roll_number";
  return "__ignore__";
}

interface Props {
  open: boolean;
  onClose: () => void;
  campusId: number;
  onImported: () => void;
}

type Step = "pick" | "map" | "result";

export function StudentImportDialog({
  open,
  onClose,
  campusId,
  onImported,
}: Props) {
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  // Default enrollment context
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sessionId, setSessionId] = useState<number | "">("");
  const [levelId, setLevelId] = useState<number | "">("");
  const [gradeId, setGradeId] = useState<number | "">("");
  const [sectionId, setSectionId] = useState<number | "">("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep("pick");
      setFile(null);
      setRows([]);
      setHeaders([]);
      setMapping({});
      setResult(null);
      setSubmitting(false);
      setParsing(false);
    }
  }, [open]);

  // Load lookups when dialog opens
  useEffect(() => {
    if (!open || !campusId) return;
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
        const filteredGrades = gr.filter((g) => levelIds.has(g.education_level_id));
        setGrades(filteredGrades);
        const gradeIds = new Set(filteredGrades.map((g) => g.id));
        setSections(sec.filter((s) => gradeIds.has(s.grade_id)));

        const activeSession = ses.find((s) => s.is_active) ?? ses[0];
        if (activeSession) setSessionId(activeSession.id);
        if (lv[0]) setLevelId(lv[0].id);
        const firstGrade =
          filteredGrades.find((g) => g.education_level_id === lv[0]?.id) ??
          filteredGrades[0];
        if (firstGrade) setGradeId(firstGrade.id);
        const firstSection = sec.find((s) => s.grade_id === firstGrade?.id);
        if (firstSection) setSectionId(firstSection.id);
      } catch (e) {
        toast.error(apiErrorMessage(e, "Could not load setup data"));
      }
    })();
  }, [open, campusId]);

  const availableGrades = useMemo(
    () => grades.filter((g) => !levelId || g.education_level_id === levelId),
    [grades, levelId],
  );
  const availableSections = useMemo(
    () => sections.filter((s) => !gradeId || s.grade_id === gradeId),
    [sections, gradeId],
  );

  async function onPickFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please choose a .csv file");
      return;
    }
    setParsing(true);
    setFile(f);

    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        setParsing(false);
        if (res.errors.length > 0 && res.data.length === 0) {
          toast.error("Could not parse the file. Is it a valid CSV?");
          return;
        }
        const rowsData = res.data.filter((r) =>
          Object.values(r).some((v) => String(v ?? "").trim() !== ""),
        );
        const detectedHeaders = Object.keys(rowsData[0] ?? {});
        if (detectedHeaders.length === 0) {
          toast.error("The file appears to have no columns");
          return;
        }
        setRows(rowsData as Record<string, string>[]);
        setHeaders(detectedHeaders);

        const guessed: Record<string, FieldKey> = {};
        for (const h of detectedHeaders) guessed[h] = guessField(h);
        setMapping(guessed);
        setStep("map");
      },
      error: (err) => {
        setParsing(false);
        toast.error(`Parse error: ${err.message}`);
      },
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void onPickFile(f);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void onPickFile(f);
  }

  const missingRequired = useMemo(() => {
    const assigned = new Set(Object.values(mapping));
    const missing: string[] = [];
    for (const f of FIELDS) {
      if (f.required && !assigned.has(f.key)) missing.push(f.label);
    }
    return missing;
  }, [mapping]);

  async function submit() {
    if (missingRequired.length > 0) {
      toast.error(`Map required column(s): ${missingRequired.join(", ")}`);
      return;
    }
    if (!sessionId || !gradeId || !sectionId) {
      toast.error("Choose an academic session, grade, and section");
      return;
    }

    // Transform rows using the mapping
    const cleaned: StudentImportRow[] = [];
    rows.forEach((raw, idx) => {
      const out: Record<string, string | number | null> = { row_number: idx + 2 };
      for (const [header, field] of Object.entries(mapping)) {
        if (field === "__ignore__") continue;
        const val = String(raw[header] ?? "").trim();
        out[field] = val === "" ? null : val;
      }
      // Ensure required
      if (!out.admission_number) return;
      if (!out.full_name) return;
      cleaned.push(out as unknown as StudentImportRow);
    });

    if (cleaned.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setSubmitting(true);
    try {
      const res = await bulkImportStudents({
        campus_id: campusId,
        academic_session_id: Number(sessionId),
        grade_id: Number(gradeId),
        section_id: Number(sectionId),
        rows: cleaned,
      });
      setResult(res);
      setStep("result");
      if (res.created > 0) {
        toast.success(`${res.created} student(s) imported`);
        onImported();
      }
      if (res.failed > 0) {
        toast.error(`${res.failed} row(s) failed`);
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, "Import failed"));
    } finally {
      setSubmitting(false);
    }
  }

  function downloadErrorReport() {
    if (!result || result.errors.length === 0) return;
    const csv =
      "row_number,admission_number,error\n" +
      result.errors
        .map(
          (e) =>
            `${e.row_number},"${(e.admission_number ?? "").replace(/"/g, '""')}","${e.message.replace(/"/g, '""')}"`,
        )
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* Footer changes per step */
  const footer =
    step === "pick" ? (
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
    ) : step === "map" ? (
      <>
        <Button
          variant="outline"
          onClick={() => {
            setStep("pick");
            setFile(null);
            setRows([]);
            setHeaders([]);
            setMapping({});
          }}
          disabled={submitting}
        >
          Back
        </Button>
        <Button onClick={submit} loading={submitting}>
          Import {rows.length} row{rows.length === 1 ? "" : "s"}
        </Button>
      </>
    ) : (
      <>
        {result && result.errors.length > 0 && (
          <Button
            variant="outline"
            onClick={downloadErrorReport}
            leadingIcon={<Download className="h-4 w-4" />}
          >
            Download errors
          </Button>
        )}
        <Button onClick={onClose}>Done</Button>
      </>
    );

  return (
    <Dialog
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Import students from CSV"
      description={
        step === "pick"
          ? "Upload a .csv file with your student records."
          : step === "map"
            ? "Map your columns to the fields below."
            : "Import complete."
      }
      size="xl"
      footer={footer}
    >
      {/* ── STEP 1: pick file ─────────────────────────────── */}
      {step === "pick" && (
        <div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-line bg-surface-sunken px-6 py-14 text-center transition-colors hover:border-primary/50 hover:bg-surface-hover"
          >
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-primary-soft text-primary-soft-fg">
              <Upload className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[14px] font-medium text-fg">
              Drop your CSV here, or click to browse
            </p>
            <p className="mt-1 text-[12.5px] text-fg-muted">
              Required columns: admission number, full name. Other fields optional.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          <div className="mt-5 rounded-[10px] border border-line bg-surface-inset px-4 py-3 text-[12.5px] text-fg-muted">
            <div className="flex items-start gap-2">
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
              <div>
                <div className="font-medium text-fg">Expected format</div>
                <div className="mt-1 leading-relaxed">
                  First row must be column headers. Example:{" "}
                  <span className="font-mono text-[11.5px] text-fg">
                    admission_number, full_name, father_name, phone, gender
                  </span>
                </div>
              </div>
            </div>
          </div>

          {parsing && (
            <div className="mt-4 text-center text-[13px] text-fg-muted">
              Parsing file…
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: map columns ───────────────────────────── */}
      {step === "map" && (
        <div className="space-y-6">
          {/* File info */}
          <div className="flex items-center gap-2 rounded-[10px] border border-line bg-surface-inset px-3.5 py-2.5 text-[13px]">
            <FileSpreadsheet className="h-4 w-4 text-fg-subtle" />
            <span className="font-medium text-fg">{file?.name}</span>
            <span className="text-fg-muted">·</span>
            <span className="text-fg-muted">{rows.length} rows</span>
          </div>

          {/* Default enrollment */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              Default placement for all imported students
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Academic session *</Label>
                <Select
                  value={sessionId}
                  onChange={(e) => setSessionId(Number(e.target.value))}
                  className="h-10 text-[13px]"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.is_active ? " (current)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Education level *</Label>
                <Select
                  value={levelId}
                  onChange={(e) => {
                    const lid = Number(e.target.value);
                    setLevelId(lid);
                    const g = grades.find((x) => x.education_level_id === lid);
                    setGradeId(g?.id ?? "");
                    const sec = sections.find((x) => x.grade_id === g?.id);
                    setSectionId(sec?.id ?? "");
                  }}
                  className="h-10 text-[13px]"
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Grade *</Label>
                <Select
                  value={gradeId}
                  onChange={(e) => {
                    const gid = Number(e.target.value);
                    setGradeId(gid);
                    const sec = sections.find((x) => x.grade_id === gid);
                    setSectionId(sec?.id ?? "");
                  }}
                  className="h-10 text-[13px]"
                >
                  {availableGrades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Section *</Label>
                <Select
                  value={sectionId}
                  onChange={(e) => setSectionId(Number(e.target.value))}
                  className="h-10 text-[13px]"
                >
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Column mapping */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                Column mapping
              </div>
              {missingRequired.length > 0 && (
                <div className="flex items-center gap-1 text-[11.5px] text-danger">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Missing: {missingRequired.join(", ")}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[10px] border border-line">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-surface-inset">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                      CSV column
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                      Sample values
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                      Maps to
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => {
                    const samples = rows
                      .slice(0, 3)
                      .map((r) => String(r[h] ?? "").trim())
                      .filter((v) => v !== "");
                    return (
                      <tr
                        key={h}
                        className="border-b border-line-soft last:border-0"
                      >
                        <td className="px-3 py-2">
                          <span className="font-mono text-[12px] text-fg">
                            {h}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[12px] text-fg-muted">
                          {samples.join(" · ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={mapping[h] ?? "__ignore__"}
                            onChange={(e) =>
                              setMapping((m) => ({
                                ...m,
                                [h]: e.target.value as FieldKey,
                              }))
                            }
                            className="h-8 w-full max-w-[220px] rounded-[8px] border border-line bg-surface px-2 text-[12.5px] text-fg focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                          >
                            {FIELDS.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview first 5 rows */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              Preview (first 5 rows)
            </div>
            <div className="overflow-x-auto rounded-[10px] border border-line">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-surface-inset">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                      #
                    </th>
                    {Object.values(mapping)
                      .filter((v) => v !== "__ignore__")
                      .filter(
                        (v, i, arr) => arr.indexOf(v) === i,
                      )
                      .map((f) => (
                        <th
                          key={f}
                          className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                        >
                          {FIELDS.find((x) => x.key === f)?.label ?? f}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr
                      key={i}
                      className="border-b border-line-soft last:border-0"
                    >
                      <td className="px-3 py-2 text-[12px] text-fg-muted">
                        {i + 2}
                      </td>
                      {Object.entries(mapping)
                        .filter(([, f]) => f !== "__ignore__")
                        .filter(
                          ([, f], idx, arr) =>
                            arr.findIndex(([, ff]) => ff === f) === idx,
                        )
                        .map(([header, f]) => (
                          <td
                            key={f}
                            className="px-3 py-2 text-[12.5px] text-fg"
                          >
                            {String(r[header] ?? "") || "—"}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: result ─────────────────────────────────── */}
      {step === "result" && result && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard
              label="Total rows"
              value={result.total}
              tone="neutral"
            />
            <SummaryCard
              label="Imported"
              value={result.created}
              tone="success"
            />
            <SummaryCard
              label="Failed"
              value={result.failed}
              tone={result.failed > 0 ? "danger" : "neutral"}
            />
          </div>

          {result.errors.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-danger">
                <AlertCircle className="h-3.5 w-3.5" />
                {result.errors.length} row(s) failed
              </div>
              <div className="max-h-[280px] overflow-y-auto rounded-[10px] border border-line">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line bg-surface-inset">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                        Row
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                        Admission #
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-b border-line-soft last:border-0">
                        <td className="px-3 py-2 text-[12px] text-fg-muted">
                          {e.row_number}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-fg">
                          {e.admission_number || "—"}
                        </td>
                        <td className="px-3 py-2 text-[12.5px] text-danger">
                          {e.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-[10px] border border-success/30 bg-success-bg px-3.5 py-3 text-[13px] text-success">
              <CheckCircle2 className="h-4 w-4" />
              All rows imported successfully.
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-fg";
  return (
    <div className="rounded-[10px] border border-line bg-surface-inset px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-muted">
        {label}
      </div>
      <div className={`mt-1 text-[22px] font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}