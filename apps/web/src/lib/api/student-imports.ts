import { api } from "./client";

export interface StudentImportRow {
  admission_number: string;
  full_name: string;
  father_name?: string | null;
  mother_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  roll_number?: string | null;
  row_number: number;
}

export interface BulkImportRequest {
  campus_id: number;
  academic_session_id: number;
  grade_id: number;
  section_id: number;
  rows: StudentImportRow[];
}

export interface ImportRowError {
  row_number: number;
  admission_number: string | null;
  message: string;
}

export interface BulkImportResult {
  total: number;
  created: number;
  failed: number;
  errors: ImportRowError[];
}

export async function bulkImportStudents(
  payload: BulkImportRequest,
): Promise<BulkImportResult> {
  const { data } = await api.post<BulkImportResult>("/students/import", payload);
  return data;
}