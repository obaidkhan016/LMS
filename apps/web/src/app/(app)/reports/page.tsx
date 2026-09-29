"use client";
import { BarChart3 } from "lucide-react";
import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";

export default function ReportsPage() {
  return (
    <SectionPlaceholder
      icon={BarChart3}
      eyebrow="Insight"
      title="Reports & Analytics"
      description="Attendance reports and analytics scoped by campus, class, section, subject, teacher, and date range."
      bullets={[
        "Daily, weekly, monthly, and custom range reports",
        "Class, section, subject, and student-level breakdowns",
        "Students below configurable attendance thresholds",
        "CSV / Excel / PDF export with report metadata",
      ]}
    />
  );
}