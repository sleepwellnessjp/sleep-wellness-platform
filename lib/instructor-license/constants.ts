import type {
  InstructorLicenseStatus,
  InstructorRenewalStatus,
  PublicLicenseStatusLabel,
  PublicLicenseVerdict,
} from "./types";

/** 認定資格の正式名称（画面・認定証・公開検証で統一） */
export const SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME =
  "Sleep Wellness Instructor";

export const LICENSE_ISSUER_ORG = "Sleep Wellness Institute Japan";
export const LICENSE_ISSUER_FOUNDER_TITLE = "Founder";
export const LICENSE_ISSUER_FOUNDER_NAME = "TAKA Wakabayashi";

/** 更新残日数の警告色 */
export const EXPIRY_WARN_ORANGE = "#c2410c";
export const EXPIRY_WARN_RED = "#a33a3a";

export const INSTRUCTOR_LICENSE_STATUSES = [
  "active",
  "expiring",
  "expired",
  "suspended",
  "pending",
  "withdrawn",
] as const satisfies readonly InstructorLicenseStatus[];

/** DB 内部値 → 画面表示（分離） */
export const INSTRUCTOR_LICENSE_STATUS_LABELS: Record<
  InstructorLicenseStatus,
  string
> = {
  active: "有効",
  expiring: "更新期限間近",
  expired: "期限切れ",
  suspended: "停止中",
  pending: "審査中",
  withdrawn: "取消",
};

/** 公開認証ページの状態表記 */
export const PUBLIC_LICENSE_STATUS_LABELS: Record<
  PublicLicenseStatusLabel,
  string
> = {
  active: "有効",
  expired: "期限切れ",
  suspended: "停止",
  withdrawn: "取消",
};

/** @deprecated 互換: verdict → 簡易ラベル */
export const PUBLIC_LICENSE_VERDICT_LABELS: Record<
  PublicLicenseVerdict,
  string
> = {
  valid: "有効",
  invalid: "無効",
  expired: "期限切れ",
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

/**
 * 画面表示用ステータス。
 * suspended / pending / withdrawn は維持。
 * DB が active でも有効期限超過なら expired。
 */
export function resolveDisplayStatus(
  status: InstructorLicenseStatus,
  expiresAt: string,
): InstructorLicenseStatus {
  if (
    status === "suspended" ||
    status === "pending" ||
    status === "withdrawn"
  ) {
    return status;
  }
  const remaining = daysUntil(expiresAt);
  if (remaining < 0) return "expired";
  if (remaining <= EXPIRING_SOON_DAYS) return "expiring";
  if (status === "expired" || status === "expiring") {
    return remaining <= EXPIRING_SOON_DAYS ? "expiring" : "active";
  }
  return status;
}

/** 公開認証ページ用: 有効 / 期限切れ / 停止 / 取消 */
export function toPublicLicenseStatusLabel(
  status: InstructorLicenseStatus,
  expiresAt: string,
): PublicLicenseStatusLabel {
  const resolved = resolveDisplayStatus(status, expiresAt);
  if (resolved === "withdrawn") return "withdrawn";
  if (resolved === "suspended" || resolved === "pending") return "suspended";
  if (resolved === "expired") return "expired";
  return "active";
}

/** 短名・空欄・level ラベルのみの場合は正式名称へ揃える */
export function resolveCertificationName(
  certificationName: string | null | undefined,
  levelLabel?: string | null,
): string {
  const name = String(certificationName ?? "").trim();
  const level = String(levelLabel ?? "").trim();
  if (
    !name ||
    /^instructor$/i.test(name) ||
    (level && name === level && /^instructor$/i.test(level))
  ) {
    return SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME;
  }
  return name;
}

export function formatLegalNameDisplay(
  legalName: string | null | undefined,
): string {
  const value = String(legalName ?? "").trim();
  return value || "未登録";
}

/** 活動名: public_name → display_name（後方互換で public_display_name も許容） */
export function resolveActivityName(input: {
  publicName?: string | null;
  publicDisplayName?: string | null;
  displayName?: string | null;
}): string {
  return (
    String(input.publicName ?? "").trim() ||
    String(input.publicDisplayName ?? "").trim() ||
    String(input.displayName ?? "").trim() ||
    "—"
  );
}

/** 公開検証の判定（期限は日付ベースで再計算） */
export function toPublicLicenseVerdict(
  status: InstructorLicenseStatus,
  expiresAt: string,
): PublicLicenseVerdict {
  const publicStatus = toPublicLicenseStatusLabel(status, expiresAt);
  if (publicStatus === "expired") return "expired";
  if (publicStatus === "suspended" || publicStatus === "withdrawn") {
    return "invalid";
  }
  return "valid";
}

/** 残り日数の表示色（≤7 赤 / ≤30 オレンジ） */
export function daysUntilExpiryColor(
  days: number | null | undefined,
): string | null {
  if (days == null) return null;
  if (days <= 7) return EXPIRY_WARN_RED;
  if (days <= 30) return EXPIRY_WARN_ORANGE;
  return null;
}

export function educationProgressPercent(
  requiredHours: number,
  completedHours: number,
): number {
  if (requiredHours <= 0) return completedHours > 0 ? 100 : 0;
  return Math.min(
    100,
    Math.round((Math.max(0, completedHours) / requiredHours) * 100),
  );
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
