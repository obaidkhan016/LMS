import { api } from "./client";

export interface TimetableSlot {
  id: number;
  campus_id: number;
  academic_session_id: number;
  grade_id: number;
  section_id: number;
  subject_id: number;
  teacher_id: number;
  day_of_week: number;
  period_number: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  room: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimetableSlotInput {
  campus_id: number;
  academic_session_id: number;
  grade_id: number;
  section_id: number;
  subject_id: number;
  teacher_id: number;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  is_active?: boolean;
}

export const timetablesApi = {
  listForSection: async (sectionId: number, academicSessionId: number) => {
    const { data } = await api.get<TimetableSlot[]>("/timetables", {
      params: { section_id: sectionId, academic_session_id: academicSessionId },
    });
    return data;
  },
  create: async (input: TimetableSlotInput) => {
    const { data } = await api.post<TimetableSlot>("/timetables", input);
    return data;
  },
  update: async (id: number, input: Partial<TimetableSlotInput>) => {
    const { data } = await api.patch<TimetableSlot>(`/timetables/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/timetables/${id}`);
  },
  todayForTeacher: async (teacherId: number) => {
    const { data } = await api.get<TimetableSlot[]>(
      `/timetables/teacher/${teacherId}/today`,
    );
    return data;
  },
};