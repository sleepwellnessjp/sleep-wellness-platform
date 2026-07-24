import type {
  CertificationLevel,
  LicenseHistoryAction,
  LicenseStatus,
  PaymentStatus,
  SubscriptionStatus,
} from "./types";

export const CERTIFICATION_LEVELS = [
  "foundation",
  "practitioner",
  "instructor",
  "navigator",
  "producer",
] as const satisfies readonly CertificationLevel[];

export const CERTIFICATION_LEVEL_LABELS: Record<CertificationLevel, string> = {
  foundation: "Foundation",
  practitioner: "Practitioner",
  instructor: "Instructor",
  navigator: "Navigator",
  producer: "Producer",
};

export const LICENSE_STATUSES = [
  "active",
  "renewal_pending",
  "expired",
  "suspended",
] as const satisfies readonly LicenseStatus[];

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  active: "有効",
  renewal_pending: "更新待ち",
  expired: "失効",
  suspended: "停止",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "有効",
  past_due: "支払い遅延",
  canceled: "解約",
  paused: "一時停止",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "支払済",
  refunded: "返金",
  failed: "失敗",
};

export const LICENSE_HISTORY_ACTION_LABELS: Record<
  LicenseHistoryAction,
  string
> = {
  issued: "発行",
  renewed: "更新",
  suspended: "停止",
  revoked: "失効",
  reactivated: "再開",
  updated: "更新（編集）",
};

/** 月額・年額（円） */
export const PLAN_PRICING: Record<
  CertificationLevel,
  { monthly: number; yearly: number }
> = {
  foundation: { monthly: 3_000, yearly: 30_000 },
  practitioner: { monthly: 5_000, yearly: 50_000 },
  instructor: { monthly: 8_000, yearly: 80_000 },
  navigator: { monthly: 10_000, yearly: 100_000 },
  producer: { monthly: 15_000, yearly: 150_000 },
};

/** 更新に必要な継続教育時間（時間） */
export const CE_REQUIRED_HOURS: Record<CertificationLevel, number> = {
  foundation: 6,
  practitioner: 8,
  instructor: 10,
  navigator: 12,
  producer: 15,
};

export function isCertificationLevel(
  value: string,
): value is CertificationLevel {
  return (CERTIFICATION_LEVELS as readonly string[]).includes(value);
}

export function isLicenseStatus(value: string): value is LicenseStatus {
  return (LICENSE_STATUSES as readonly string[]).includes(value);
}

export function daysUntil(dateIso: string, now = new Date()): number {
  const target = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const diff = target.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatYen(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatJaDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function addYearsIso(dateIso: string, years: number): string {
  const date = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateLicenseNumber(level: CertificationLevel): string {
  const prefix: Record<CertificationLevel, string> = {
    foundation: "FDN",
    practitioner: "PRC",
    instructor: "INS",
    navigator: "NAV",
    producer: "PRD",
  };
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SWIJ-${prefix[level]}-${year}-${rand}`;
}

export function generateCertificateNumber(licenseNumber: string): string {
  return `CERT-${licenseNumber.replace(/^SWIJ-/, "")}`;
}

export function generateVerificationCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SWIJ-${part()}-${part()}`;
}

export function ceRequirementText(level: CertificationLevel): string {
  const hours = CE_REQUIRED_HOURS[level];
  return `認定更新までに継続教育 ${hours} 時間以上の受講が必要です。`;
}
