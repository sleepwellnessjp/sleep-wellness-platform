import type {
  HealthStatus,
  RoadmapHorizon,
  RoadmapStatus,
} from "./types";

export const CLOSED_BETA_VERSION = "1.0.0";
export const CLOSED_BETA_PHASE_LABEL =
  "Version 1.0 Beta · 第1期・第2期認定講師限定";

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  operational: "正常",
  degraded: "注意",
  outage: "障害",
  maintenance: "メンテナンス",
};

export const ROADMAP_HORIZON_LABELS: Record<RoadmapHorizon, string> = {
  v2_5: "Version 2.5",
  v3_0: "Version 3.0",
  coming_soon: "Coming Soon",
};

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  planned: "予定",
  in_progress: "進行中",
  shipped: "公開済",
  deferred: "保留",
};

export const FEEDBACK_PRIORITY_OPTIONS = [
  { value: "p0", label: "Critical" },
  { value: "p1", label: "High" },
  { value: "p2", label: "Medium" },
  { value: "p3", label: "Low" },
] as const;

export type FeedbackPriority = (typeof FEEDBACK_PRIORITY_OPTIONS)[number]["value"];

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> =
  Object.fromEntries(
    FEEDBACK_PRIORITY_OPTIONS.map((item) => [item.value, item.label]),
  ) as Record<FeedbackPriority, string>;

export function isFeedbackPriority(value: string): value is FeedbackPriority {
  return FEEDBACK_PRIORITY_OPTIONS.some((item) => item.value === value);
}

export function isHealthStatus(value: string): value is HealthStatus {
  return value in HEALTH_STATUS_LABELS;
}

export function isRoadmapHorizon(value: string): value is RoadmapHorizon {
  return value in ROADMAP_HORIZON_LABELS;
}

export function isRoadmapStatus(value: string): value is RoadmapStatus {
  return value in ROADMAP_STATUS_LABELS;
}
