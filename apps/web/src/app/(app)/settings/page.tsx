"use client";
import { Settings } from "lucide-react";
import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";

export default function SettingsPage() {
  return (
    <SectionPlaceholder
      icon={Settings}
      eyebrow="Configuration"
      title="Settings"
      description="System-wide configuration — attendance rules, AI thresholds, notifications, security, and backups."
      bullets={[
        "Attendance policy: locking, corrections, thresholds",
        "AI attendance: enabled methods and confidence bands",
        "Notification rules for absences and alerts",
        "Data import, backups, and audit log access",
      ]}
    />
  );
}