import { api } from "./client";

export interface Subject {
  id: number;
  campus_id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SubjectInput = {
  campus_id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active?: boolean;
};

export const subjectsApi = {
  list: async (campus_id?: number) => {
    const { data } = await api.get<Subject[]>("/subjects", {
      params: campus_id ? { campus_id } : undefined,
    });
    return data;
  },
  create: async (input: SubjectInput) => {
    const { data } = await api.post<Subject>("/subjects", input);
    return data;
  },
  update: async (id: number, input: Partial<SubjectInput>) => {
    const { data } = await api.patch<Subject>(`/subjects/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/subjects/${id}`);
  },
};