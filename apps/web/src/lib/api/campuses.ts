import { api } from "./client";

export interface Campus {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  principal_name: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampusCreateInput {
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  principal_name?: string | null;
  timezone?: string;
  is_active?: boolean;
}

export type CampusUpdateInput = Partial<CampusCreateInput>;

export async function listCampuses(params?: {
  q?: string;
  active_only?: boolean;
}): Promise<Campus[]> {
  const { data } = await api.get<Campus[]>("/campuses", { params });
  return data;
}

export async function getCampus(id: number): Promise<Campus> {
  const { data } = await api.get<Campus>(`/campuses/${id}`);
  return data;
}

export async function createCampus(input: CampusCreateInput): Promise<Campus> {
  const { data } = await api.post<Campus>("/campuses", input);
  return data;
}

export async function updateCampus(id: number, input: CampusUpdateInput): Promise<Campus> {
  const { data } = await api.patch<Campus>(`/campuses/${id}`, input);
  return data;
}

export async function deleteCampus(id: number): Promise<void> {
  await api.delete(`/campuses/${id}`);
}