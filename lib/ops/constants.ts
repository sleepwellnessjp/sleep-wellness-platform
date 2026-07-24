import type {
  InstructorOpsStatus,
  OpsNotificationKind,
  SchoolStatus,
} from "@/lib/ops/types";

export const SCHOOL_STATUS_LABELS: Record<SchoolStatus, string> = {
  active: "活動中",
  suspended: "停止中",
  closed: "閉校",
};

export const INSTRUCTOR_OPS_STATUS_LABELS: Record<InstructorOpsStatus, string> = {
  active: "有効",
  renewal_pending: "更新待ち",
  suspended: "停止",
  withdrawn: "退会",
  expired: "期限切れ",
};

export const OPS_NOTIFICATION_KIND_LABELS: Record<OpsNotificationKind, string> = {
  hq_announcement: "本部からのお知らせ",
  certification_renewal: "認定更新通知",
  event: "イベント案内",
  material_update: "教材更新",
  ai_notice: "AIからのお知らせ",
};

export const OPS_NOTIFICATION_KINDS: OpsNotificationKind[] = [
  "hq_announcement",
  "certification_renewal",
  "event",
  "material_update",
  "ai_notice",
];

export function daysUntil(dateIso: string | null | undefined, now = new Date()): number | null {
  if (!dateIso) return null;
  const target = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("ja-JP");
}
