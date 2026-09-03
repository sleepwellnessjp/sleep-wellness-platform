/**
 * SOXAI 解析結果 → SleepAnalysisData
 * 既存 SOXAI Vision / OCR / AnalysisMetrics は変更しない。
 */

import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import {
  emptySleepAnalysisData,
  type SleepAnalysisData,
  type SleepAnalysisSourceImage,
} from "@/lib/sleep-analysis/sleep-analysis-model";
import {
  parseMetricMinutes,
  parseMetricPercent,
  parseMetricScore,
  parseMetricWithUnit,
} from "@/lib/sleep-analysis/parse-metric-value";

export type MapSoxaiToAnalysisInput = {
  metrics: AnalysisMetrics;
  /** デバイス固有の追加値（QoL など） */
  extra?: Record<string, unknown> | null;
  warnings?: string[] | null;
  sourceImages?: SleepAnalysisSourceImage[] | null;
  confidence?: number | null;
  /** セクション別信頼度など（任意） */
  ocrConfidence?: Record<string, number> | null;
};

/**
 * SOXAI の確認済み metrics を共通モデルへ変換する。
 * 推測で埋めず、取得済みのみ反映する。
 */
export function mapSoxaiToAnalysis(
  input: MapSoxaiToAnalysisInput | AnalysisMetrics,
): SleepAnalysisData {
  const isWrapped =
    input &&
    typeof input === "object" &&
    "metrics" in input &&
    (input as MapSoxaiToAnalysisInput).metrics != null;

  const metrics = isWrapped
    ? (input as MapSoxaiToAnalysisInput).metrics
    : (input as AnalysisMetrics);
  const wrapped = isWrapped ? (input as MapSoxaiToAnalysisInput) : null;

  const base = emptySleepAnalysisData("soxai");

  const ocrConfidence = wrapped?.ocrConfidence ?? null;
  let confidence = wrapped?.confidence ?? null;
  if (
    confidence == null &&
    ocrConfidence &&
    typeof ocrConfidence === "object"
  ) {
    const values = Object.values(ocrConfidence).filter(
      (n) => typeof n === "number" && Number.isFinite(n),
    );
    if (values.length > 0) {
      confidence = Math.round(
        values.reduce((sum, n) => sum + n, 0) / values.length,
      );
      // 0〜1 で来る場合は 0〜100 へ
      if (confidence > 0 && confidence <= 1) {
        confidence = Math.round(confidence * 100);
      }
    }
  }

  return {
    ...base,
    device: "soxai",
    sleepScore: parseMetricScore(metrics.sleepScore),
    readinessScore: null,
    activityScore: null,
    totalSleepMinutes: parseMetricMinutes(metrics.sleepDuration),
    timeInBedMinutes: parseMetricMinutes(metrics.timeInBed),
    sleepEfficiency: parseMetricPercent(metrics.sleepEfficiency),
    sleepLatencyMinutes: parseMetricMinutes(metrics.sleepLatency),
    awakeMinutes: parseMetricMinutes(metrics.awakenings),
    remMinutes: parseMetricMinutes(metrics.remSleep),
    lightMinutes: parseMetricMinutes(metrics.lightSleep),
    deepMinutes: parseMetricMinutes(metrics.deepSleep),
    lowestHeartRate: parseMetricWithUnit(metrics.restingHeartRateMin),
    averageHeartRate: null,
    restingHeartRate: parseMetricWithUnit(metrics.restingHeartRate),
    hrv: parseMetricWithUnit(metrics.hrv),
    respiratoryRate: parseMetricWithUnit(metrics.respiratoryRate),
    temperatureDeviation: parseMetricWithUnit(metrics.skinTemperature),
    spo2: parseMetricPercent(metrics.spo2),
    stressMinutes: parseMetricWithUnit(metrics.stress),
    recoveryMinutes: null,
    resilienceScore: null,
    cardiovascularAge: null,
    sleepDebt: parseMetricMinutes(metrics.sleepDebt),
    warningMessages: Array.isArray(wrapped?.warnings)
      ? wrapped!.warnings!.filter((w) => typeof w === "string" && w.trim())
      : [],
    rawMetrics: {
      analysisMetrics: metrics,
      qol: metrics.qol || undefined,
      yesterdayQol: metrics.yesterdayQol || undefined,
      conditionScore: metrics.conditionScore || undefined,
      bedtime: metrics.bedtime || undefined,
      wakeTime: metrics.wakeTime || undefined,
      circadianRhythm: metrics.circadianRhythm || undefined,
      hrvMax: metrics.hrvMax || undefined,
      hrvMin: metrics.hrvMin || undefined,
      restingHeartRateMax: metrics.restingHeartRateMax || undefined,
      extra: wrapped?.extra ?? undefined,
      ocrConfidence: ocrConfidence ?? undefined,
    },
    sourceImages: wrapped?.sourceImages ?? [],
    confidence:
      confidence != null && Number.isFinite(confidence)
        ? Math.max(0, Math.min(100, Math.round(confidence)))
        : null,
  };
}
