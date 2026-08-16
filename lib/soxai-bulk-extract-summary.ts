/**
 * 一括アップロード後の「データ取得結果」表示用。
 * 既存の Vision 抽出結果（AnalysisMetrics）を読み取り専用で要約する。
 * 個別アップロード経路には影響しない。
 */

import {
  isMetricPresent,
  SOXAI_UI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";

export type BulkExtractItemStatus = "confirmed" | "review" | "missing";

export type BulkExtractItem = {
  key: MetricFieldKey;
  label: string;
  status: BulkExtractItemStatus;
  displayValue: string | null;
};

export type BulkExtractSummary = {
  imageCount: number;
  confirmedCount: number;
  reviewCount: number;
  missingCount: number;
  items: BulkExtractItem[];
};

/** 主要項目を優先表示（ユーザーが確認しやすい順） */
const PRIORITY_KEYS: MetricFieldKey[] = [
  "sleepScore",
  "sleepDuration",
  "sleepEfficiency",
  "sleepLatency",
  "sleepDebt",
  "bedtime",
  "wakeTime",
  "awakenings",
  "remSleep",
  "lightSleep",
  "deepSleep",
  "hrv",
  "restingHeartRate",
  "respiratoryRate",
  "spo2",
  "stress",
  "skinTemperature",
];

function formatMetricValue(
  metrics: AnalysisMetrics,
  key: MetricFieldKey,
): string | null {
  if (!isMetricPresent(metrics, key)) return null;
  const raw = metrics[key];
  if (typeof raw === "number") return String(raw);
  const text = String(raw).trim();
  return text.length > 0 ? text : null;
}

/**
 * Vision 抽出結果から、確定 / 要確認 / 未取得の一覧を作る。
 * 現状 Vision は項目ごとの信頼度を返さないため、
 * 値が取れていれば confirmed、空なら missing。
 * （将来 conflicts を渡せる場合は review に振る）
 */
export function buildBulkExtractSummary(args: {
  metrics: AnalysisMetrics;
  imageCount: number;
  reviewKeys?: MetricFieldKey[];
}): BulkExtractSummary {
  const reviewSet = new Set(args.reviewKeys ?? []);
  const fieldByKey = new Map(
    SOXAI_UI_METRIC_FIELDS.map((field) => [field.key, field]),
  );

  const orderedKeys: MetricFieldKey[] = [
    ...PRIORITY_KEYS.filter((key) => fieldByKey.has(key)),
    ...SOXAI_UI_METRIC_FIELDS.map((f) => f.key).filter(
      (key) => !PRIORITY_KEYS.includes(key),
    ),
  ];

  const items: BulkExtractItem[] = orderedKeys.map((key) => {
    const field = fieldByKey.get(key)!;
    const displayValue = formatMetricValue(args.metrics, key);
    if (displayValue == null) {
      return {
        key,
        label: field.label,
        status: "missing" as const,
        displayValue: null,
      };
    }
    if (reviewSet.has(key)) {
      return {
        key,
        label: field.label,
        status: "review" as const,
        displayValue,
      };
    }
    return {
      key,
      label: field.label,
      status: "confirmed" as const,
      displayValue,
    };
  });

  return {
    imageCount: args.imageCount,
    confirmedCount: items.filter((i) => i.status === "confirmed").length,
    reviewCount: items.filter((i) => i.status === "review").length,
    missingCount: items.filter((i) => i.status === "missing").length,
    items,
  };
}
