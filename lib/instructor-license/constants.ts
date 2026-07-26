import type {
  InstructorLicenseStatus,
  InstructorRenewalStatus,
} from "./types";

export const INSTRUCTOR_LICENSE_STATUSES = [
  "active",
  "expiring",
  "expired",
  "suspended",
  "pending",
] as const satisfies readonly InstructorLicenseStatus[];

export const INSTRUCTOR_LICENSE_STATUS_LABELS: Record<
  InstructorLicenseStatus,
  string
> = {
  active: "有効",
  expiring: "更新期限間近",
  expired: "期限切れ",
  suspended: "停止中",
  pending: "審査中",
};

export const INSTRUCTOR_RENEWAL_STATUSES = [
  "not_requested",
  "requested",
  "approved",
  "rejected",
] as const satisfies readonly InstructorRenewalStatus[];

export const INSTRUCTOR_RENEWAL_STATUS_LABELS: Record<
  InstructorRenewalStatus,
  string
> = {
  not_requested: "未申請",
  requested: "申請中",
  approved: "承認済み",
  rejected: "却下",
};

export const EXPIRING_SOON_DAYS = 90;

export function isInstructorLicenseStatus(
  value: string,
): value is InstructorLicenseStatus {
  return (INSTRUCTOR_LICENSE_STATUSES as readonly string[]).includes(value);
}

export function isInstructorRenewalStatus(
  value: string,
): value is InstructorRenewalStatus {
  return (INSTRUCTOR_RENEWAL_STATUSES as readonly string[]).includes(value);
}

export function daysUntil(dateIso: string, now = new Date()): number {
  const target = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const diff = target.getTime() - start.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function formatJaDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addYearsIso(dateIso: string, years: number): string {
  const date = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return todayIso();
  date.setFullYear(date.getFullYear() + years);
  return todayIso(date);
}

export function renewalConditionText(
  requiredHours: number,
  completedHours: number,
): string {
  const remaining = Math.max(0, requiredHours - completedHours);
  if (requiredHours <= 0) {
    return "継続教育の必須時間は設定されていません。更新期限までに事務局の案内に従ってください。";
  }
  if (remaining <= 0) {
    return `継続教育 ${requiredHours} 時間の要件を満たしています。更新申請が可能です。`;
  }
  return `更新までに継続教育 ${requiredHours} 時間の修了が必要です（残り ${remaining} 時間）。`;
}

export function resolveDisplayStatus(
  status: InstructorLicenseStatus,
  expiresAt: string,
): InstructorLicenseStatus {
  if (status === "suspended" || status === "pending") return status;
  const remaining = daysUntil(expiresAt);
  if (remaining < 0) return "expired";
  if (remaining <= EXPIRING_SOON_DAYS) return "expiring";
  if (status === "expired" || status === "expiring") {
    return remaining <= EXPIRING_SOON_DAYS ? "expiring" : "active";
  }
  return status;
}

export function appBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

export function licenseVerificationUrl(code: string): string {
  const base = appBaseUrl();
  const path = `/license/verify?code=${encodeURIComponent(code)}`;
  return base ? `${base}${path}` : path;
}

export function generateVerificationCode(): string {
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `SWIJ-${raw}`;
}
