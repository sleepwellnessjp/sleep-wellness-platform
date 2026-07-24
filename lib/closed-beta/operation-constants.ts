import type {
  BacklogStatus,
  BugSeverity,
  BugStatus,
  FeatureRequestCategory,
  FeatureRequestPriority,
  FeatureRequestStatus,
} from "./operation-types";

export const CLOSED_BETA_OPERATION_VERSION = "1.0.0";
export const CLOSED_BETA_OPERATION_PHASE_LABEL =
  "Version 1.0 Beta · PDCA 改善サイクル";

export const FEATURE_REQUEST_CATEGORIES = [
  "ux",
  "analysis",
  "ai",
  "report",
  "journey",
  "homework",
  "other",
] as const satisfies readonly FeatureRequestCategory[];

export const FEATURE_REQUEST_CATEGORY_LABELS: Record<
  FeatureRequestCategory,
  string
> = {
  ux: "使いやすさ",
  analysis: "分析",
  ai: "AI",
  report: "レポート",
  journey: "Journey",
  homework: "Homework",
  other: "その他",
};

export const FEATURE_REQUEST_PRIORITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const satisfies readonly FeatureRequestPriority[];

export const FEATURE_REQUEST_PRIORITY_LABELS: Record<
  FeatureRequestPriority,
  string
> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const FEATURE_REQUEST_STATUSES = [
  "open",
  "planned",
  "in_progress",
  "completed",
  "deferred",
] as const satisfies readonly FeatureRequestStatus[];

export const FEATURE_REQUEST_STATUS_LABELS: Record<
  FeatureRequestStatus,
  string
> = {
  open: "受付",
  planned: "対応予定",
  in_progress: "対応中",
  completed: "完了",
  deferred: "保留",
};

export const BUG_SEVERITIES = [
  "critical",
  "high",
  "medium",
  "low",
] as const satisfies readonly BugSeverity[];

export const BUG_SEVERITY_LABELS: Record<BugSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const BUG_STATUSES = [
  "open",
  "investigating",
  "fixing",
  "resolved",
  "wontfix",
] as const satisfies readonly BugStatus[];

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  open: "未対応",
  investigating: "調査中",
  fixing: "修正中",
  resolved: "修正済",
  wontfix: "対応しない",
};

export const BACKLOG_STATUSES = [
  "todo",
  "in_progress",
  "done",
  "on_hold",
] as const satisfies readonly BacklogStatus[];

export const BACKLOG_STATUS_LABELS: Record<BacklogStatus, string> = {
  todo: "未着手",
  in_progress: "進行中",
  done: "完了",
  on_hold: "保留",
};

export function isFeatureRequestCategory(
  value: string,
): value is FeatureRequestCategory {
  return (FEATURE_REQUEST_CATEGORIES as readonly string[]).includes(value);
}

export function isFeatureRequestPriority(
  value: string,
): value is FeatureRequestPriority {
  return (FEATURE_REQUEST_PRIORITIES as readonly string[]).includes(value);
}

export function isFeatureRequestStatus(
  value: string,
): value is FeatureRequestStatus {
  return (FEATURE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isBugSeverity(value: string): value is BugSeverity {
  return (BUG_SEVERITIES as readonly string[]).includes(value);
}

export function isBugStatus(value: string): value is BugStatus {
  return (BUG_STATUSES as readonly string[]).includes(value);
}

export function isBacklogStatus(value: string): value is BacklogStatus {
  return (BACKLOG_STATUSES as readonly string[]).includes(value);
}

/** モジュール実装状況から運営準備率を算出 */
export function computeBetaOperationReadiness(params: {
  hasKpi: boolean;
  hasFeatureRequests: boolean;
  hasBugTracker: boolean;
  hasOutcomes: boolean;
  hasWeeklyReport: boolean;
  hasBacklog: boolean;
}): number {
  const weights = [
    params.hasKpi,
    params.hasFeatureRequests,
    params.hasBugTracker,
    params.hasOutcomes,
    params.hasWeeklyReport,
    params.hasBacklog,
  ];
  const done = weights.filter(Boolean).length;
  return Math.round((done / weights.length) * 100);
}
