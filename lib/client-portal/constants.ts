import type {
  ClientGoalCategory,
  ClientGoalStatus,
  ClientHomeworkCategory,
  ClientHomeworkMediaType,
  ClientNotificationKind,
} from "./types";

export const CLIENT_PORTAL_ROUTES = {
  home: "/client",
  morning: "/client/morning",
  sleep: "/client/sleep",
  advice: "/client/advice",
  coach: "/client/coach",
  homework: "/client/homework",
  journey: "/client/journey",
  reports: "/client/reports",
  chat: "/client/chat",
  goals: "/client/goals",
} as const;

export const CLIENT_NOTIFICATION_KINDS: readonly ClientNotificationKind[] = [
  "message",
  "homework",
  "report",
  "goal",
  "advice",
  "system",
] as const;

export const CLIENT_GOAL_CATEGORIES: readonly ClientGoalCategory[] = [
  "sleep",
  "homework",
  "lifestyle",
  "recovery",
  "other",
] as const;

export const CLIENT_GOAL_STATUSES: readonly ClientGoalStatus[] = [
  "active",
  "achieved",
  "paused",
  "archived",
] as const;

export const CLIENT_HOMEWORK_CATEGORIES: readonly ClientHomeworkCategory[] = [
  "homework",
  "breathing",
  "yoga",
  "other",
] as const;

export const CLIENT_HOMEWORK_MEDIA_TYPES: readonly ClientHomeworkMediaType[] = [
  "none",
  "video",
  "pdf",
] as const;

export const HOMEWORK_CATEGORY_LABELS: Record<ClientHomeworkCategory, string> =
  {
    homework: "宿題",
    breathing: "呼吸法",
    yoga: "メラトニンヨガ™",
    other: "その他",
  };

export const GOAL_CATEGORY_LABELS: Record<ClientGoalCategory, string> = {
  sleep: "睡眠",
  homework: "宿題",
  lifestyle: "生活習慣",
  recovery: "回復",
  other: "その他",
};

export const GOAL_STATUS_LABELS: Record<ClientGoalStatus, string> = {
  active: "進行中",
  achieved: "達成",
  paused: "一時停止",
  archived: "アーカイブ",
};

export function isClientNotificationKind(
  value: string,
): value is ClientNotificationKind {
  return (CLIENT_NOTIFICATION_KINDS as readonly string[]).includes(value);
}

export function isClientGoalCategory(
  value: string,
): value is ClientGoalCategory {
  return (CLIENT_GOAL_CATEGORIES as readonly string[]).includes(value);
}

export function isClientGoalStatus(value: string): value is ClientGoalStatus {
  return (CLIENT_GOAL_STATUSES as readonly string[]).includes(value);
}

export function isClientHomeworkCategory(
  value: string,
): value is ClientHomeworkCategory {
  return (CLIENT_HOMEWORK_CATEGORIES as readonly string[]).includes(value);
}

export function isClientHomeworkMediaType(
  value: string,
): value is ClientHomeworkMediaType {
  return (CLIENT_HOMEWORK_MEDIA_TYPES as readonly string[]).includes(value);
}
