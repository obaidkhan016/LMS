import { api } from "./client";

export interface DashboardStats {
  students_enrolled: number;
  teachers: number;
  sections: number;
  sessions_today: number;
  attendance_rate_today: number | null;
}

export async function getDashboardStats(campusId?: number): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/dashboard/stats", {
    params: campusId ? { campus_id: campusId } : undefined,
  });
  return data;
}