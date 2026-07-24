import type { UserRole } from "@/lib/platform/types";
import { AUTHORITY_LABELS, authorityFromUserRole } from "@/lib/rbac/constants";

/** Sleep Wellness OS で扱うロール */
export type OsRole = UserRole;

export const OS_ROLE_LABELS: Record<OsRole, string> = {
  super_admin: AUTHORITY_LABELS.hq,
  admin: AUTHORITY_LABELS.hq,
  school: AUTHORITY_LABELS.school,
  instructor: AUTHORITY_LABELS.instructor,
  client: AUTHORITY_LABELS.client,
  enterprise: "企業管理者",
};

export const OS_ROLE_EYEBROWS: Record<OsRole, string> = {
  super_admin: "HQ",
  admin: "HQ",
  school: "SCHOOL",
  instructor: "INSTRUCTOR",
  client: "CLIENT",
  enterprise: "ENTERPRISE",
};

export function normalizeOsRole(role: string | null | undefined): OsRole {
  if (role === "client") return "client";
  if (role === "enterprise") return "enterprise";
  if (role === "school") return "school";
  if (role === "admin" || role === "super_admin") return role;
  return "instructor";
}

export function isAdminOsRole(role: OsRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSchoolOsRole(role: OsRole): boolean {
  return role === "school";
}

export function isEnterpriseOsRole(role: OsRole): boolean {
  return role === "enterprise";
}

export function osAuthorityLabel(role: OsRole): string {
  const authority = authorityFromUserRole(role);
  if (authority) return AUTHORITY_LABELS[authority];
  return OS_ROLE_LABELS[role];
}
