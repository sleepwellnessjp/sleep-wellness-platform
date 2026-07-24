/**
 * Closed Beta 配布ゲート（純関数）
 * 認定講師のみ / 有効アカウント / 利用開始日
 *
 * 「認定講師」の根拠はサービス層で解決する:
 * certified_instructors / active membership / accepted invitation / role=instructor
 */

import { todayTokyoDate } from "./beta-invitation-constants";

export type BetaAccessDenialReason =
  | "not_certified"
  | "account_disabled"
  | "before_start_date";

export type BetaAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: BetaAccessDenialReason;
      message: string;
      startDate?: string;
    };

export const BETA_ACCESS_MESSAGES: Record<BetaAccessDenialReason, string> = {
  not_certified: "Closed Beta は認定講師のみログインできます。",
  account_disabled:
    "この認定講師アカウントは無効です。本部にお問い合わせください。",
  before_start_date: "利用開始日までお待ちください。",
};

/** HQ・クライアント・認定校などは既存ログインを維持 */
export function isExemptFromClosedBetaGate(role: string): boolean {
  return (
    role === "admin" ||
    role === "super_admin" ||
    role === "client" ||
    role === "school" ||
    role === "enterprise"
  );
}

/** 講師ロール（未設定含む）に配布ゲートを適用 */
export function isClosedBetaGatedRole(role: string): boolean {
  return !role || role === "instructor";
}

export function isCertifiedInstructorLoginEnabled(status: string): boolean {
  return status === "active" || status === "renewal_pending";
}

export function evaluateClosedBetaInstructorAccess(input: {
  certified: { status: string; usageStartDate: string | null } | null;
  invitationStartDate: string | null;
  today?: string;
}): BetaAccessResult {
  if (!input.certified) {
    return {
      allowed: false,
      reason: "not_certified",
      message: BETA_ACCESS_MESSAGES.not_certified,
    };
  }

  if (!isCertifiedInstructorLoginEnabled(input.certified.status)) {
    return {
      allowed: false,
      reason: "account_disabled",
      message: BETA_ACCESS_MESSAGES.account_disabled,
    };
  }

  const startDate =
    (input.certified.usageStartDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.certified.usageStartDate)
      ? input.certified.usageStartDate
      : null) ||
    (input.invitationStartDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.invitationStartDate)
      ? input.invitationStartDate
      : null);

  const today = input.today ?? todayTokyoDate();
  if (startDate && startDate > today) {
    return {
      allowed: false,
      reason: "before_start_date",
      message: `利用開始日（${startDate}）以降にログインできます。`,
      startDate,
    };
  }

  return { allowed: true };
}
