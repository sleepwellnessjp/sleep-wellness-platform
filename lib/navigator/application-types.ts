export const NAVIGATOR_COHORTS = [
  { value: "cohort_1", label: "第1期" },
  { value: "cohort_2", label: "第2期" },
  { value: "other", label: "その他" },
] as const;

export type NavigatorCohort = (typeof NAVIGATOR_COHORTS)[number]["value"];

export const NAVIGATOR_APPLICATION_STATUSES = [
  { value: "submitted", label: "申請中" },
  { value: "awaiting_payment", label: "入金待ち" },
  { value: "approved", label: "承認済み" },
  { value: "rejected", label: "却下" },
] as const;

export type NavigatorApplicationStatus =
  (typeof NAVIGATOR_APPLICATION_STATUSES)[number]["value"];

export const NAVIGATOR_INVITE_STATUSES = [
  "sending",
  "sent",
  "existing_account",
  "failed",
] as const;

export type NavigatorInviteStatus = (typeof NAVIGATOR_INVITE_STATUSES)[number];

export type NavigatorInviteAttempt =
  | "sent"
  | "existing_account"
  | "failed"
  | "skipped";

export type NavigatorApplicationInput = {
  nameKanji: string;
  nameKana: string;
  email: string;
  phone: string;
  cohort: NavigatorCohort;
  completionDate: string;
  region: string;
  teachingStatus: string;
  motivation: string;
  activityPlan: string;
  payerNameKana: string;
  feeAgreed: boolean;
  note: string;
};

export type NavigatorApplicationRecord = {
  id: string;
  nameKanji: string;
  nameKana: string;
  email: string;
  phone: string;
  cohort: NavigatorCohort;
  completionDate: string;
  region: string;
  teachingStatus: string;
  motivation: string;
  activityPlan: string;
  payerNameKana: string;
  feeAgreed: boolean;
  note: string;
  status: NavigatorApplicationStatus;
  submittedAt: string;
  paymentConfirmedAt: string | null;
  approvedAt: string | null;
  reviewMemo: string;
  inviteStatus: NavigatorInviteStatus | null;
  inviteError: string;
  invitedAt: string | null;
  authUserId: string | null;
};

export function navigatorCohortLabel(cohort: NavigatorCohort): string {
  return (
    NAVIGATOR_COHORTS.find((item) => item.value === cohort)?.label ?? cohort
  );
}

export function navigatorStatusLabel(
  status: NavigatorApplicationStatus,
): string {
  return (
    NAVIGATOR_APPLICATION_STATUSES.find((item) => item.value === status)
      ?.label ?? status
  );
}

export function isNavigatorCohort(value: string): value is NavigatorCohort {
  return NAVIGATOR_COHORTS.some((item) => item.value === value);
}

export function isNavigatorApplicationStatus(
  value: string,
): value is NavigatorApplicationStatus {
  return NAVIGATOR_APPLICATION_STATUSES.some((item) => item.value === value);
}

export function isNavigatorInviteStatus(
  value: string,
): value is NavigatorInviteStatus {
  return (NAVIGATOR_INVITE_STATUSES as readonly string[]).includes(value);
}

export function navigatorInviteLabel(
  status: NavigatorInviteStatus | null,
  inviteError: string,
): string | null {
  if (status === "existing_account") return "既存アカウント";
  if (status === "sent") return "招待メールを送信しました";
  if (status === "sending") return "招待メールを送信しています";
  if (status === "failed") {
    return inviteError
      ? `招待メールを送れませんでした。${inviteError}`
      : "招待メールを送れませんでした";
  }
  return null;
}
