import type {
  FeedbackCategory,
  FeedbackPriority,
  FeedbackSeverity,
  FeedbackStatus,
  FeedbackTargetScreen,
} from "./types";

export const FEEDBACK_CATEGORIES: ReadonlyArray<{
  value: FeedbackCategory;
  label: string;
}> = [
  { value: "improvement", label: "改善要望" },
  { value: "bug", label: "不具合報告" },
  { value: "feature_request", label: "新機能提案" },
  { value: "confusing", label: "わかりにくい点" },
  { value: "positive", label: "良かった点" },
  { value: "other", label: "その他" },
];

/** Closed Beta 向けの主要カテゴリー（送信フォーム強調用） */
export const FEEDBACK_PRIMARY_CATEGORIES: ReadonlyArray<FeedbackCategory> = [
  "improvement",
  "bug",
  "feature_request",
];

export const FEEDBACK_PRIORITIES: ReadonlyArray<{
  value: FeedbackPriority;
  label: string;
}> = [
  { value: "p0", label: "Critical" },
  { value: "p1", label: "High" },
  { value: "p2", label: "Medium" },
  { value: "p3", label: "Low" },
];

export const FEEDBACK_TARGET_SCREENS: ReadonlyArray<{
  value: FeedbackTargetScreen;
  label: string;
}> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "clients", label: "Clients" },
  { value: "analysis", label: "Analysis" },
  { value: "report", label: "Report" },
  { value: "journey", label: "Journey" },
  { value: "homework", label: "Homework" },
  { value: "follow_up", label: "Follow Up" },
  { value: "ai_assistant", label: "AI Assistant" },
  { value: "demo_mode", label: "Demo Mode" },
  { value: "other", label: "その他" },
];

export const FEEDBACK_SEVERITIES: ReadonlyArray<{
  value: FeedbackSeverity;
  label: string;
}> = [
  { value: "urgent", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const FEEDBACK_STATUSES: ReadonlyArray<{
  value: FeedbackStatus;
  label: string;
}> = [
  { value: "unconfirmed", label: "受付" },
  { value: "reviewing", label: "対応中" },
  { value: "on_hold", label: "保留" },
  { value: "resolved", label: "完了" },
];

/** DB 互換用（旧 planned は UI 上「対応中」に寄せる） */
export const FEEDBACK_STATUS_LEGACY_PLANNED = "planned" as const;
export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> =
  Object.fromEntries(
    FEEDBACK_CATEGORIES.map((item) => [item.value, item.label]),
  ) as Record<FeedbackCategory, string>;

export const FEEDBACK_TARGET_SCREEN_LABELS: Record<
  FeedbackTargetScreen,
  string
> = Object.fromEntries(
  FEEDBACK_TARGET_SCREENS.map((item) => [item.value, item.label]),
) as Record<FeedbackTargetScreen, string>;

export const FEEDBACK_SEVERITY_LABELS: Record<FeedbackSeverity, string> =
  Object.fromEntries(
    FEEDBACK_SEVERITIES.map((item) => [item.value, item.label]),
  ) as Record<FeedbackSeverity, string>;

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  unconfirmed: "受付",
  reviewing: "対応中",
  planned: "対応中",
  resolved: "完了",
  on_hold: "保留",
};
export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> =
  Object.fromEntries(
    FEEDBACK_PRIORITIES.map((item) => [item.value, item.label]),
  ) as Record<FeedbackPriority, string>;

export function isFeedbackCategory(value: string): value is FeedbackCategory {
  return FEEDBACK_CATEGORIES.some((item) => item.value === value);
}

export function isFeedbackPriority(value: string): value is FeedbackPriority {
  return FEEDBACK_PRIORITIES.some((item) => item.value === value);
}

export function isUsabilityRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function isFeedbackTargetScreen(
  value: string,
): value is FeedbackTargetScreen {
  return FEEDBACK_TARGET_SCREENS.some((item) => item.value === value);
}

export function isFeedbackSeverity(value: string): value is FeedbackSeverity {
  return FEEDBACK_SEVERITIES.some((item) => item.value === value);
}

export function isFeedbackStatus(value: string): value is FeedbackStatus {
  return (
    FEEDBACK_STATUSES.some((item) => item.value === value) ||
    value === "planned"
  );
}
