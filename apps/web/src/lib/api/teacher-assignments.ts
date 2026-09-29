import { api } from "./client";

export interface TeacherAssignment {
  id: number;
  teacher_id: number;
  subject_id: number;
  grade_id: number;
  section_id: number;
  academic_session_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TeacherAssignmentInput = {
  teacher_id: number;
  subject_id: number;
  grade_id: number;
  section_id: number;
  academic_session_id: number;
  is_active?: boolean;
};

export const teacherAssignmentsApi = {
  list: async (params?: { teacher_id?: number; academic_session_id?: number }) => {
    const { data } = await api.get<TeacherAssignment[]>("/teacher-assignments", {
      params,
    });
    return data;
  },
  create: async (input: TeacherAssignmentInput) => {
    const { data } = await api.post<TeacherAssignment>("/teacher-assignments", input);
    return data;
  },
  update: async (id: number, input: { is_active?: boolean }) => {
    const { data } = await api.patch<TeacherAssignment>(
      `/teacher-assignments/${id}`,
      input,
    );
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/teacher-assignments/${id}`);
  },
};