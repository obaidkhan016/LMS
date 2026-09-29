import { api } from "./client";

export type DailyStatus = "present" | "absent" | "late" | "excused";

export interface DailyAttendanceItem {
  student_id: number;
  student_name: string;
  admission_number: string;
  roll_number: string | null;
  status: DailyStatus;
  note: string | null;
}

export interface DailyRoster {
  campus_id: number;
  academic_session_id: number;
  grade_id: number;
  grade_name: string;
  section_id: number;
  section_name: string;
  attendance_date: string;
  submitted: boolean;
  submitted_at: string | null;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
  records: DailyAttendanceItem[];
}

export interface DailyMarkInput {
  campus_id: number;
  academic_session_id: number;
  grade_id: number;
  section_id: number;
  attendance_date: string;
  records: { student_id: number; status: DailyStatus; note?: string | null }[];
}

export interface DailySubmitInput {
  campus_id: number;
  academic_session_id: number;
  section_id: number;
  attendance_date: string;
}

export interface DailySummaryRow {
  attendance_date: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  attendance_rate: number;
}

export const dailyAttendanceApi = {
  roster: async (params: {
    campus_id: number;
    academic_session_id: number;
    section_id: number;
    date: string;
  }) => {
    const { data } = await api.get<DailyRoster>("/attendance/daily/roster", {
      params,
    });
    return data;
  },
  mark: async (input: DailyMarkInput) => {
    const { data } = await api.post<DailyRoster>("/attendance/daily/mark", input);
    return data;
  },
  submit: async (input: DailySubmitInput) => {
    const { data } = await api.post<DailyRoster>(
      "/attendance/daily/submit",
      input,
    );
    return data;
  },
  summary: async (params: {
    campus_id: number;
    academic_session_id: number;
    section_id?: number;
    days?: number;
  }) => {
    const { data } = await api.get<DailySummaryRow[]>(
      "/attendance/daily/summary",
      { params },
    );
    return data;
  },
};