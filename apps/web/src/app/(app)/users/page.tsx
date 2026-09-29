"use client";
import { ShieldCheck } from "lucide-react";
import { SectionPlaceholder } from "@/components/layout/SectionPlaceholder";

export default function UsersPage() {
  return (
    <SectionPlaceholder
      icon={ShieldCheck}
      eyebrow="Access control"
      title="Users & Roles"
      description="Granular role-based access control with audit-tracked actions."
      bullets={[
        "User accounts for administrators, teachers, and students",
        "Roles with configurable permissions",
        "Credential reset and account lockout handling",
        "Immutable audit log of every privileged action",
      ]}
    />
  );
}