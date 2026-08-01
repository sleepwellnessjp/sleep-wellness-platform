import {
  detectMetricConsistencyWarnings,
  consistencyWarningKeys,
  type MetricConsistencyWarning,
} from "@/lib/soxai-consistency";
import {
  OCR_LOW_CONFIDENCE_THRESHOLD,
  type MetricConfidenceMap,
  type MergedMetricConflict,
} from "@/lib/soxai-merge";
import {
  isMetricPresent,
  metricDisplayValue,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";

export type FieldStatus =
  | "from_image"
  | "needs_review"
  | "conflict"
  | "no_explicit"
  | "manual_needed";

export type FieldReviewReason =
  | "conflict"
  | "consistency"
  | "low_confidence"
  | null;

export type FieldReviewDiagnosis = {
  key: MetricFieldKey;
  label: string;
  value: string;
  status: FieldStatus;
  reason: FieldReviewReason;
  fromImage: boolean;
  present: boolean;
  confidence: number | null;
  confidenceThreshold: number;
  hasConflict: boolean;
  consistencyHit: boolean;
  consistencyMessages: string[];
};

export function fieldStatus(
  fromImage: boolean,
  conflict: MergedMetricConflict | MetricConflictLike | undefined,
  confidence: number | undefined,
  present: boolean,
  consistencyHit: boolean,
): FieldStatus {
  if (conflict) return "conflict";
  if (consistencyHit && fromImage && present) return "needs_review";
  if (fromImage && present) {
    if (
      typeof confidence === "number" &&
      confidence < OCR_LOW_CONFIDENCE_THRESHOLD
    ) {
      return "needs_review";
    }
    return "from_image";
  }
  if (!present) return "no_explicit";
  return "manual_needed";
}

type MetricConflictLike = { key: MetricFieldKey };

function reviewReason(
  status: FieldStatus,
  conflict: boolean,
  consistencyHit: boolean,
  confidence: number | undefined,
): FieldReviewReason {
  if (status === "conflict" || conflict) return "conflict";
  if (status !== "needs_review") return null;
  if (consistencyHit) return "consistency";
  if (
    typeof confidence === "number" &&
    confidence < OCR_LOW_CONFIDENCE_THRESHOLD
  ) {
    return "low_confidence";
  }
  return "consistency";
}

/**
 * 確認画面の「要確認」判定と同じ条件で、項目ごとの理由を返す。
 */
export function diagnoseNeedsReview(params: {
  metrics: AnalysisMetrics;
  imageKeys: Iterable<MetricFieldKey> | MetricFieldKey[];
  conflicts?: Array<MergedMetricConflict | MetricConflictLike>;
  confidence?: MetricConfidenceMap;
  consistencyWarnings?: MetricConsistencyWarning[];
}): {
  threshold: number;
  needsReviewCount: number;
  items: FieldReviewDiagnosis[];
  consistencyWarnings: MetricConsistencyWarning[];
} {
  const imageKeySet = new Set(params.imageKeys);
  const conflictByKey = new Map<MetricFieldKey, MergedMetricConflict | MetricConflictLike>();
  for (const conflict of params.conflicts ?? []) {
    conflictByKey.set(conflict.key, conflict);
  }
  const consistencyWarnings =
    params.consistencyWarnings ??
    detectMetricConsistencyWarnings(params.metrics);
  const consistencyKeySet = consistencyWarningKeys(consistencyWarnings);
  const messagesByKey = new Map<MetricFieldKey, string[]>();
  for (const warning of consistencyWarnings) {
    for (const key of warning.keys) {
      const list = messagesByKey.get(key) ?? [];
      list.push(warning.message);
      messagesByKey.set(key, list);
    }
  }

  const items: FieldReviewDiagnosis[] = [];
  for (const field of SOXAI_METRIC_FIELDS) {
    const key = field.key;
    const fromImage = imageKeySet.has(key);
    const present = isMetricPresent(params.metrics, key);
    const conflict = conflictByKey.get(key);
    const confidence = params.confidence?.[key];
    const consistencyHit = consistencyKeySet.has(key);
    const status = fieldStatus(
      fromImage,
      conflict,
      confidence,
      present,
      consistencyHit,
    );
    items.push({
      key,
      label: field.label,
      value: metricDisplayValue(params.metrics, key),
      status,
      reason: reviewReason(status, Boolean(conflict), consistencyHit, confidence),
      fromImage,
      present,
      confidence: typeof confidence === "number" ? confidence : null,
      confidenceThreshold: OCR_LOW_CONFIDENCE_THRESHOLD,
      hasConflict: Boolean(conflict),
      consistencyHit,
      consistencyMessages: messagesByKey.get(key) ?? [],
    });
  }

  const flagged = items.filter(
    (item) => item.status === "needs_review" || item.status === "conflict",
  );
  return {
    threshold: OCR_LOW_CONFIDENCE_THRESHOLD,
    needsReviewCount: flagged.length,
    items: flagged,
    consistencyWarnings,
  };
}

export function logNeedsReviewDiagnosis(
  prefix: string,
  diagnosis: ReturnType<typeof diagnoseNeedsReview>,
): void {
  console.info(prefix, {
    needsReviewCount: diagnosis.needsReviewCount,
    threshold: diagnosis.threshold,
    consistencyWarningCount: diagnosis.consistencyWarnings.length,
    consistencyWarnings: diagnosis.consistencyWarnings.map((w) => ({
      keys: w.keys,
      severity: w.severity,
      message: w.message,
    })),
    items: diagnosis.items.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      status: item.status,
      reason: item.reason,
      confidence: item.confidence,
      threshold: item.confidenceThreshold,
      hasConflict: item.hasConflict,
      consistencyHit: item.consistencyHit,
      consistencyMessages: item.consistencyMessages,
      rule:
        item.reason === "conflict"
          ? "複数画像で値が競合"
          : item.reason === "consistency"
            ? "整合性警告に含まれる"
            : item.reason === "low_confidence"
              ? `信頼度 ${item.confidence} < 閾値 ${item.confidenceThreshold}`
              : null,
    })),
  });
}
