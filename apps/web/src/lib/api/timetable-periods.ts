import { api } from "./client";

export type PeriodKind = "class" | "break" | "club" | "game";

export interface TimetablePeriod {
  period: number;
  start_time: string;
  end_time: string;
  kind: PeriodKind;
  label: string | null;
}

export const timetablePeriodsApi = {
  list: async (sectionId: number) => {
    const { data } = await api.get<TimetablePeriod[]>("/timetables/periods", {
      params: { section_id: sectionId },
    });
    return data;
  },
  save: async (sectionId: number, periods: TimetablePeriod[]) => {
    const { data } = await api.put<TimetablePeriod[]>(
      "/timetables/periods",
      { periods },
      { params: { section_id: sectionId } },
    );
    return data;
  },
};