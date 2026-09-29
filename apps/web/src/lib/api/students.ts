import { api } from "./client";

export interface EnrollmentSummary {
  id: number;
  academic_session_id: number;
  grade_id: number;
  section_id: number;
  program_id: number | null;
  roll_number: string | null;
  status: string;
}

export interface Student {
  id: number;
  user_id: number | null;
  campus_id: number;
  admission_number: string;
  full_name: string;
  father_name: string | null;
  mother_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  photo_url: string | null;
  status: string;
  admission_date: string | null;
  created_at: string;
  updated_at: string;
  current_enrollment: EnrollmentSummary | null;
}

export interface EnrollmentInput {
  academic_session_id: number;
  grade_id: number;
  section_id: number;
  program_id?: number | null;
  roll_number?: string | null;
}

export interface StudentInput {
  campus_id: number;
  admission_number: string;
  full_name: string;
  father_name?: string | null;
  mother_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  status?: string;
  admission_date?: string | null;
  enrollment: EnrollmentInput;
}

export const studentsApi = {
  list: async (params?: {
    campus_id?: number;
    grade_id?: number;
    section_id?: number;
    status?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) => {
    const { data } = await api.get<Student[]>("/students", { params });
    return data;
  },
  get: async (id: number) => {
    const { data } = await api.get<Student>(`/students/${id}`);
    return data;
  },
  create: async (input: StudentInput) => {
    const { data } = await api.post<Student>("/students", input);
    return data;
  },
  update: async (id: number, input: Partial<StudentInput>) => {
    const { data } = await api.patch<Student>(`/students/${id}`, input);
    return data;
  },
  remove: async (id: number) => {
    await api.delete(`/students/${id}`);
  },
};