import type { CertificationType, MembershipStatus, UserRole } from "./types";

export const MONTHLY_CREDIT_ALLOWANCE = 30;
export const ANALYSIS_CREDIT_COST = 1;

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  instructor: "Instructor",
  client: "Client",
};

export const CERTIFICATION_LABELS: Record<CertificationType, string> = {
  navigator: "Navigator",
  melatonin_yoga_instructor: "Melatonin Yoga™ Instructor",
  sleep_wellness_producer: "Sleep Wellness Producer",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "有効",
  renewal_pending: "更新待ち",
  suspended: "停止",
  expired: "失効",
};

export const ACTIVE_MEMBERSHIP_STATUSES: MembershipStatus[] = ["active"];

export const MEMBERSHIP_BLOCK_MESSAGE =
  "認定資格の更新が必要です。Sleep Wellness Institute Japan までお問い合わせください。";

export const CREDIT_BLOCK_MESSAGE =
  "クレジットが不足しています。管理者にお問い合わせください。";

export function currentYearMonth(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isAdminRole(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === "super_admin";
}
