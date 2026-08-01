/**
 * OCR で取得できなかった重点指標の原因を必ずログ出力する。
 * UI / レポートには影響させない（サーバ・クライアント console のみ）。
 */

import {
  isMetricPresent,
  metricDisplayValue,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";

/** 95% 精度目標の重点キー（睡眠ステージ・効率・HRV/心拍・呼吸・SpO₂・皮膚温） */
export const ACCURACY_METRIC_KEYS: readonly MetricFieldKey[] = [
  "sleepEfficiency",
  "awakenings",
  "awakeningRate",
  "remSleep",
  "remSleepRate",
  "lightSleep",
  "lightSleepRate",
  "deepSleep",
  "deepSleepRate",
  "respiratoryRate",
  "spo2",
  "restingHeartRate",
  "restingHeartRateMin",
  "restingHeartRateMax",
  "hrv",
  "hrvMax",
  "hrvMin",
  "skinTemperature",
] as const;

export type MissingMetricCause =
  | "vision_no_related_reading"
  | "mapped_but_empty_after_merge"
  | "shape_or_screen_rejected"
  | "not_labeled_on_screen"
  | "unknown";

export type MissingMetricDiagnosis = {
  key: MetricFieldKey;
  label: string;
  cause: MissingMetricCause;
  reason: string;
  relatedReadings: Array<{ label: string; value: string }>;
};

function labelForKey(key: MetricFieldKey): string {
  return SOXAI_METRIC_FIELDS.find((f) => f.key === key)?.label ?? key;
}

function relatedReadingRegex(key: MetricFieldKey): RegExp {
  switch (key) {
    case "sleepEfficiency":
      return /睡眠効率|効率|efficiency/i;
    case "awakenings":
    case "awakeningRate":
      return /覚醒|awake/i;
    case "remSleep":
    case "remSleepRate":
      return /レム|rem/i;
    case "lightSleep":
    case "lightSleepRate":
      return /浅い|light/i;
    case "deepSleep":
    case "deepSleepRate":
      return /深い|deep|ノンレム|nrem/i;
    case "respiratoryRate":
      return /呼吸速度|呼吸数|呼吸レート|respiratory|rpm|brpm/i;
    case "spo2":
      return /spo2|spo₂|酸素|状態レベル|状熊レベル/i;
    case "restingHeartRate":
      return /安静時心拍|平均|avg|mean|rhr/i;
    case "restingHeartRateMin":
      return /安静時心拍|最小|min/i;
    case "restingHeartRateMax":
      return /安静時心拍|最大|max/i;
    case "hrv":
      return /心拍変動|hrv|rmssd|平均/i;
    case "hrvMax":
      return /心拍変動|hrv|最大|max/i;
    case "hrvMin":
      return /心拍変動|hrv|最小|min/i;
    case "skinTemperature":
      return /皮膚|皮虜|skintemp|温度|最新の変化/i;
    default:
      return /.^/;
  }
}

/**
 * 画面上にラベルが出ないことが多い項目（欠落しても Vision 未検出とは限らない）。
 */
function oftenUnlabeledOnScreen(key: MetricFieldKey): boolean {
  return (
    key === "hrvMin" ||
    key === "restingHeartRateMax" ||
    key === "restingHeartRateMin"
  );
}

export function diagnoseMissingAccuracyMetrics(params: {
  metrics: AnalysisMetrics;
  readings: Array<{ label?: string; value?: string }>;
}): MissingMetricDiagnosis[] {
  const readings = params.readings
    .map((r) => ({
      label: String(r.label ?? "").trim(),
      value: String(r.value ?? "").trim(),
    }))
    .filter((r) => r.label || r.value);

  const out: MissingMetricDiagnosis[] = [];
  for (const key of ACCURACY_METRIC_KEYS) {
    if (isMetricPresent(params.metrics, key)) continue;
    const re = relatedReadingRegex(key);
    const related = readings.filter(
      (r) => re.test(r.label) || re.test(r.value),
    );
    let cause: MissingMetricCause;
    let reason: string;
    if (related.length === 0) {
      if (oftenUnlabeledOnScreen(key)) {
        cause = "not_labeled_on_screen";
        reason =
          "関連する OCR 読み取りが無く、当該スクショに明示ラベルが無い可能性が高い";
      } else {
        cause = "vision_no_related_reading";
        reason = "Vision OCR の visibleReadings に関連ラベル・値が無い";
      }
    } else if (
      key === "restingHeartRate" &&
      related.some((r) => /最小|min/i.test(r.label)) &&
      !related.some((r) => /平均|avg|mean/i.test(r.label))
    ) {
      cause = "shape_or_screen_rejected";
      reason =
        "安静時の「平均」行が OCR で取れておらず、最小値を平均に採用しないよう弾いた";
    } else {
      cause = "mapped_but_empty_after_merge";
      reason =
        "関連 reading はあるが、形状ゲート・画面親和・マージで最終 metrics に残らなかった";
    }
    out.push({
      key,
      label: labelForKey(key),
      cause,
      reason,
      relatedReadings: related.slice(0, 8),
    });
  }
  return out;
}

export function logMissingAccuracyMetrics(
  prefix: string,
  params: {
    metrics: AnalysisMetrics;
    readings: Array<{ label?: string; value?: string }>;
  },
): MissingMetricDiagnosis[] {
  const missing = diagnoseMissingAccuracyMetrics(params);
  if (missing.length === 0) {
    console.info(`${prefix} accuracy metrics complete`, {
      checked: ACCURACY_METRIC_KEYS.length,
    });
    return missing;
  }
  console.warn(`${prefix} missing accuracy metrics`, {
    count: missing.length,
    items: missing.map((item) => ({
      key: item.key,
      label: item.label,
      cause: item.cause,
      reason: item.reason,
      currentValue: metricDisplayValue(params.metrics, item.key) || null,
      relatedReadings: item.relatedReadings,
    })),
  });
  return missing;
}
