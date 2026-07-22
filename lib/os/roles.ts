import type { UserRole } from "@/lib/platform/types";

/** Sleep Wellness OS で扱うロール */
export type OsRole = UserRole;

export const OS_ROLE_LABELS: Record<OsRole, string> = {
  super_admin: "管理者",
  admin: "管理者",
  instructor: "認定講師",
  client: "クライアント",
  enterprise: "企業管理者",
};

export const OS_ROLE_EYEBROWS: Record<OsRole, string> = {
  super_admin: "ADMIN",
  admin: "ADMIN",
  instructor: "INSTRUCTOR",
  client: "CLIENT",
  enterprise: "ENTERPRISE",
};

export function normalizeOsRole(role: string | null | undefined): OsRole {
  if (role === "client") return "client";
  if (role === "enterprise") return "enterprise";
  if (role === "admin" || role === "super_admin") return role;
  return "instructor";
}

export function isAdminOsRole(role: OsRole): boolean {
  return role === "admin" || role === "super_admin";
}

export function isEnterpriseOsRole(role: OsRole): boolean {
  return role === "enterprise";
}
