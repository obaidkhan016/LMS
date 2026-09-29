import { api } from "./client";

export interface Teacher {
  id: number;
  user_id: number | null;
  campus_id: number;
  employee_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  photo_url: string | null;
  status: string;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TeacherInput = {
  campus_id: number;
  employee_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  status?: string;
  joined_at?: string | null;
};

export const teachersApi = {
  list: async (params?: { campus_id?: number; q?: string }) => {
    const { data } = await api.get<Teacher[]>("/teachers", { params });
    return data;
  },
  create: async (input: TeacherInput) => {
    const { data } = await api.post<Teacher>("/teachers", input);
    return data;
  },
  update: async (id: number, input: Partial<TeacherInput>) => {
    const { data } = await api.patch<Teacher>(`/teachers/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/teachers/${id}`);
  },
};