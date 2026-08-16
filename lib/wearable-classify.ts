/**
 * ウェアラブル画像の自動分類（Vision）用型・閾値・マッピング。
 * OCR ではなく画面種類の理解。既存 SOXAI/Oura 解析 API とは独立。
 */

import type {
  WearableDevice,
  WearableImageCategory,
} from "@/lib/wearable-analysis";

/**
 * AI が返す標準カテゴリ。
 * SOXAI の睡眠詳細・皮膚温を誤って概要へ寄せないよう独立カテゴリを持つ。
 */
export const CLASSIFY_IMAGE_CATEGORIES = [
  "sleep_summary",
  "sleep_detail",
  "sleep_stages",
  "heart_rate_hrv",
  "key_metrics",
  "daytime_stress",
  "skin_temperature",
  "resilience",
  "unknown",
] as const;

export type ClassifyImageCategory =
  (typeof CLASSIFY_IMAGE_CATEGORIES)[number];

export const CLASSIFY_CONFIDENCE_AUTO = 90;
export const CLASSIFY_CONFIDENCE_CANDIDATE = 70;

export type ClassifyAssignmentMode = "auto" | "candidate" | "manual";

export type WearableClassifyItemResult = {
  index: number;
  /** AI が推定した機種 */
  detectedDevice: WearableDevice | "unknown";
  imageCategory: ClassifyImageCategory;
  /** 0〜100 */
  confidence: number;
  analyzable: boolean;
  reason?: string;
};

export type WearableClassifyResponse = {
  results: WearableClassifyItemResult[];
  elapsedMs: number;
  successCount: number;
  totalCount: number;
  /** 0〜100 */
  successRate: number;
};

export function isClassifyImageCategory(
  value: unknown,
): value is ClassifyImageCategory {
  return (
    typeof value === "string" &&
    (CLASSIFY_IMAGE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function assignmentModeForConfidence(
  confidence: number,
  category: ClassifyImageCategory,
): ClassifyAssignmentMode {
  if (category === "unknown" || confidence < CLASSIFY_CONFIDENCE_CANDIDATE) {
    return "manual";
  }
  if (confidence >= CLASSIFY_CONFIDENCE_AUTO) return "auto";
  return "candidate";
}

/**
 * 標準カテゴリ → デバイス別スロット。
 * SOXAI UI は soxai_* を使うため写像する。
 */
export function mapClassifyCategoryForDevice(
  device: WearableDevice,
  category: ClassifyImageCategory,
): WearableImageCategory {
  if (device === "soxai") {
    switch (category) {
      case "key_metrics":
        return "soxai_home";
      case "daytime_stress":
        return "soxai_stress";
      case "sleep_summary":
        return "soxai_sleep_overview";
      case "sleep_detail":
        return "soxai_sleep_detail";
      case "sleep_stages":
        return "soxai_sleep_stages";
      case "heart_rate_hrv":
        return "soxai_heart_hrv";
      case "skin_temperature":
        return "soxai_skin_temp";
      case "resilience":
        return "unknown";
      default:
        return "unknown";
    }
  }

  // Oura など: 追加カテゴリは近い既存スロットへ寄せる
  switch (category) {
    case "sleep_detail":
      return "sleep_summary";
    case "skin_temperature":
      return "key_metrics";
    default:
      return category;
  }
}

export function formatConfidencePercent(confidence: number | null): string {
  if (confidence == null || !Number.isFinite(confidence)) return "—";
  return `${Math.round(confidence)}%`;
}

export function logWearableClassifySummary(args: {
  source: "api" | "client";
  deviceType?: WearableDevice;
  elapsedMs: number;
  successRate: number;
  totalCount: number;
  successCount: number;
  results: Array<{
    index: number;
    imageCategory: string;
    confidence: number;
    mode?: ClassifyAssignmentMode;
    analyzable?: boolean;
  }>;
}): void {
  console.info("[wearable-classify]", {
    source: args.source,
    deviceType: args.deviceType ?? null,
    分類時間ms: args.elapsedMs,
    分類成功率: `${args.successRate}%`,
    成功: args.successCount,
    合計: args.totalCount,
    分類結果: args.results,
  });
}

export const WEARABLE_CLASSIFY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "index",
          "detectedDevice",
          "imageCategory",
          "confidence",
          "analyzable",
          "reason",
        ],
        properties: {
          index: { type: "integer" },
          detectedDevice: {
            type: "string",
            enum: [
              "soxai",
              "oura",
              "apple_watch",
              "garmin",
              "fitbit",
              "other",
              "unknown",
            ],
          },
          imageCategory: {
            type: "string",
            enum: [...CLASSIFY_IMAGE_CATEGORIES],
          },
          confidence: { type: "number" },
          analyzable: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    },
  },
} as const;
