import { api } from "./client";

// ── Academic Session ───────────────────────────────────────────────
export interface AcademicSession {
  id: number;
  campus_id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AcademicSessionInput = {
  campus_id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
};

export const academicSessionsApi = {
  list: async (campus_id?: number) => {
    const { data } = await api.get<AcademicSession[]>("/academic-sessions", {
      params: campus_id ? { campus_id } : undefined,
    });
    return data;
  },
  create: async (input: AcademicSessionInput) => {
    const { data } = await api.post<AcademicSession>("/academic-sessions", input);
    return data;
  },
  update: async (id: number, input: Partial<AcademicSessionInput>) => {
    const { data } = await api.patch<AcademicSession>(`/academic-sessions/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/academic-sessions/${id}`);
  },
};

// ── Education Level ───────────────────────────────────────────────
export interface EducationLevel {
  id: number;
  campus_id: number;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EducationLevelInput = {
  campus_id: number;
  name: string;
  code: string;
  sort_order?: number;
  is_active?: boolean;
};

export const educationLevelsApi = {
  list: async (campus_id?: number) => {
    const { data } = await api.get<EducationLevel[]>("/education-levels", {
      params: campus_id ? { campus_id } : undefined,
    });
    return data;
  },
  create: async (input: EducationLevelInput) => {
    const { data } = await api.post<EducationLevel>("/education-levels", input);
    return data;
  },
  update: async (id: number, input: Partial<EducationLevelInput>) => {
    const { data } = await api.patch<EducationLevel>(`/education-levels/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/education-levels/${id}`);
  },
};

// ── Grade ─────────────────────────────────────────────────────────
export interface Grade {
  id: number;
  education_level_id: number;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type GradeInput = {
  education_level_id: number;
  name: string;
  code: string;
  sort_order?: number;
  is_active?: boolean;
};

export const gradesApi = {
  list: async (education_level_id?: number) => {
    const { data } = await api.get<Grade[]>("/grades", {
      params: education_level_id ? { education_level_id } : undefined,
    });
    return data;
  },
  create: async (input: GradeInput) => {
    const { data } = await api.post<Grade>("/grades", input);
    return data;
  },
  update: async (id: number, input: Partial<GradeInput>) => {
    const { data } = await api.patch<Grade>(`/grades/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/grades/${id}`);
  },
};

// ── Section ───────────────────────────────────────────────────────
export interface Section {
  id: number;
  grade_id: number;
  name: string;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SectionInput = {
  grade_id: number;
  name: string;
  capacity?: number | null;
  is_active?: boolean;
};

export const sectionsApi = {
  list: async (grade_id?: number) => {
    const { data } = await api.get<Section[]>("/sections", {
      params: grade_id ? { grade_id } : undefined,
    });
    return data;
  },
  create: async (input: SectionInput) => {
    const { data } = await api.post<Section>("/sections", input);
    return data;
  },
  update: async (id: number, input: Partial<SectionInput>) => {
    const { data } = await api.patch<Section>(`/sections/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/sections/${id}`);
  },
};