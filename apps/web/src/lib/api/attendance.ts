import { api } from "./client";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface ScheduledClass {
  grade_id: number;
  grade_name: string;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
  teacher_id: number;
  teacher_name: string;
  period_number: number;
  start_time: string;
  end_time: string;
  existing_session_id: number | null;
  existing_session_status: string | null;
}

export interface AttendanceRecordItem {
  id: number;
  student_id: number;
  student_name: string;
  admission_number: string;
  roll_number: string | null;
  status: AttendanceStatus;
  note: string | null;
  is_needs_review: boolean;
}

export interface AttendanceSession {
  id: number;
  campus_id: number;
  academic_session_id: number;
  grade_id: number;
  grade_name: string;
  section_id: number;
  section_name: string;
  subject_id: number | null;
  subject_name: string | null;
  scheduled_teacher_id: number | null;
  teacher_name: string | null;
  attendance_date: string;
  period_number: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  method: string;
  status: "draft" | "in_review" | "submitted" | "locked";
  submitted_at: string | null;
  locked_at: string | null;
  notes: string | null;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
  records: AttendanceRecordItem[];
}

export interface CreateSessionInput {
  campus_id: number;
  academic_session_id: number;
  grade_id: number;
  section_id: number;
  subject_id?: number | null;
  scheduled_teacher_id?: number | null;
  attendance_date: string;
  period_number?: number | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
}

export interface SubmitRecord {
  student_id: number;
  status: AttendanceStatus;
  note?: string | null;
}

export const attendanceApi = {
  today: async (params: {
    campus_id: number;
    academic_session_id: number;
    date?: string;
    teacher_id?: number;
  }) => {
    const { data } = await api.get<ScheduledClass[]>("/attendance/today", {
      params,
    });
    return data;
  },
  listSessions: async (params: {
    campus_id: number;
    academic_session_id?: number;
    section_id?: number;
    date?: string;
    limit?: number;
  }) => {
    const { data } = await api.get<AttendanceSession[]>("/attendance/sessions", {
      params,
    });
    return data;
  },
  getSession: async (id: number) => {
    const { data } = await api.get<AttendanceSession>(
      `/attendance/sessions/${id}`,
    );
    return data;
  },
  createSession: async (input: CreateSessionInput) => {
    const { data } = await api.post<AttendanceSession>(
      "/attendance/sessions",
      input,
    );
    return data;
  },
  submit: async (id: number, records: SubmitRecord[]) => {
    const { data } = await api.post<AttendanceSession>(
      `/attendance/sessions/${id}/submit`,
      { records },
    );
    return data;
  },
};