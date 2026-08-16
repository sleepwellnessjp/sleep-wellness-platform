/**
 * Oura 解析結果 → SleepAnalysisData
 * 既存 Oura Vision / AnalysisMetrics 変換は変更しない。
 */

import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import type {
  OuraDeviceSpecificMetrics,
  OuraVisionMetrics,
} from "@/lib/oura-vision-schema";
import type { OuraMappedExtraction } from "@/lib/oura-metrics";
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

export type MapOuraToAnalysisInput = {
  /** Vision 生メトリクス（優先） */
  visionMetrics?: OuraVisionMetrics | null;
  /** 既存共通 metrics（vision が無い場合のフォールバック） */
  metrics?: AnalysisMetrics | null;
  ouraScores?: {
    sleepScore?: number | null;
    readinessScore?: number | null;
    activityScore?: number | null;
  } | null;
  deviceSpecificMetrics?: OuraDeviceSpecificMetrics | null;
  warnings?: string[] | null;
  sourceImages?: SleepAnalysisSourceImage[] | null;
  confidence?: number | null;
  measurementDate?: string | null;
};

function fromVision(vision: OuraVisionMetrics): Partial<SleepAnalysisData> {
  return {
    sleepScore: vision.sleepScore,
    readinessScore: vision.readinessScore,
    activityScore: vision.activityScore,
    totalSleepMinutes: vision.totalSleep,
    timeInBedMinutes: vision.timeInBed,
    sleepEfficiency: vision.sleepEfficiency,
    sleepLatencyMinutes: vision.sleepLatency,
    awakeMinutes: vision.awakeDuration,
    remMinutes: vision.remDuration,
    lightMinutes: vision.lightSleepDuration,
    deepMinutes: vision.deepSleepDuration,
    lowestHeartRate: vision.lowestHeartRate,
    averageHeartRate: vision.averageHeartRate,
    restingHeartRate: vision.restingHeartRate,
    hrv: vision.averageHrv,
    respiratoryRate: vision.respiratoryRate,
    temperatureDeviation: vision.bodyTemperatureDeviation,
    spo2: vision.averageSpO2,
    recoveryMinutes: (() => {
      if (
        vision.daytimeRecoveryMinutes != null &&
        Number.isFinite(vision.daytimeRecoveryMinutes)
      ) {
        return Math.round(vision.daytimeRecoveryMinutes);
      }
      const raw = vision.recoveryTime?.trim();
      if (!raw) return null;
      return parseMetricMinutes(raw);
    })(),
    sleepDebt:
      vision.sleepDebtMinutes != null && Number.isFinite(vision.sleepDebtMinutes)
        ? Math.round(vision.sleepDebtMinutes)
        : null,
    stressMinutes:
      vision.daytimeStressMinutes != null &&
      Number.isFinite(vision.daytimeStressMinutes)
        ? Math.round(vision.daytimeStressMinutes)
        : null,
    resilienceScore: null,
  };
}

function fromAnalysisMetrics(
  metrics: AnalysisMetrics,
): Partial<SleepAnalysisData> {
  return {
    sleepScore: metrics.sleepScore,
    totalSleepMinutes: parseMetricMinutes(metrics.sleepDuration),
    sleepEfficiency: parseMetricPercent(metrics.sleepEfficiency),
    sleepLatencyMinutes: parseMetricMinutes(metrics.sleepLatency),
    awakeMinutes: parseMetricMinutes(metrics.awakenings),
    remMinutes: parseMetricMinutes(metrics.remSleep),
    lightMinutes: parseMetricMinutes(metrics.lightSleep),
    deepMinutes: parseMetricMinutes(metrics.deepSleep),
    lowestHeartRate: parseMetricWithUnit(metrics.restingHeartRateMin),
    restingHeartRate: parseMetricWithUnit(metrics.restingHeartRate),
    hrv: parseMetricWithUnit(metrics.hrv),
    respiratoryRate: parseMetricWithUnit(metrics.respiratoryRate),
    temperatureDeviation: parseMetricWithUnit(metrics.skinTemperature),
    spo2: parseMetricPercent(metrics.spo2),
    sleepDebt: parseMetricMinutes(metrics.sleepDebt),
    stressMinutes: parseMetricWithUnit(metrics.stress),
  };
}

/**
 * Oura の Vision / confirm 済み metrics を共通モデルへ変換する。
 * 推測で埋めず、取得済みのみ反映する。
 */
export function mapOuraToAnalysis(
  input: MapOuraToAnalysisInput | OuraMappedExtraction,
): SleepAnalysisData {
  const base = emptySleepAnalysisData("oura");

  const isMapped =
    "visionMetrics" in input &&
    "metrics" in input &&
    "ouraScores" in input &&
    "deviceSpecificMetrics" in input;

  const vision = isMapped
    ? (input as OuraMappedExtraction).visionMetrics
    : (input as MapOuraToAnalysisInput).visionMetrics ?? null;
  const metrics = isMapped
    ? (input as OuraMappedExtraction).metrics
    : (input as MapOuraToAnalysisInput).metrics ?? null;
  const ouraScores = isMapped
    ? (input as OuraMappedExtraction).ouraScores
    : (input as MapOuraToAnalysisInput).ouraScores ?? null;
  const deviceSpecific = isMapped
    ? (input as OuraMappedExtraction).deviceSpecificMetrics
    : (input as MapOuraToAnalysisInput).deviceSpecificMetrics ?? null;
  const warnings = isMapped
    ? (input as OuraMappedExtraction).warnings
    : (input as MapOuraToAnalysisInput).warnings ?? [];
  const sourceImages = isMapped
    ? []
    : (input as MapOuraToAnalysisInput).sourceImages ?? [];
  const confidence = isMapped
    ? null
    : (input as MapOuraToAnalysisInput).confidence ?? null;
  const measurementDate = isMapped
    ? (input as OuraMappedExtraction).measurementDate
    : (input as MapOuraToAnalysisInput).measurementDate ?? null;

  const fromMetrics = metrics ? fromAnalysisMetrics(metrics) : {};
  const fromV = vision ? fromVision(vision) : {};

  function pickNum(
    preferred: number | null | undefined,
    fallback: number | null | undefined,
  ): number | null {
    if (preferred != null && Number.isFinite(preferred)) return preferred;
    if (fallback != null && Number.isFinite(fallback)) return fallback;
    return null;
  }

  // Vision 数値を優先し、無い項目だけ AnalysisMetrics から補完
  const merged: SleepAnalysisData = {
    ...base,
    device: "oura",
    sleepScore: pickNum(
      ouraScores?.sleepScore,
      pickNum(fromV.sleepScore, fromMetrics.sleepScore),
    ),
    readinessScore: pickNum(
      ouraScores?.readinessScore,
      fromV.readinessScore,
    ),
    activityScore: pickNum(ouraScores?.activityScore, fromV.activityScore),
    totalSleepMinutes: pickNum(
      fromV.totalSleepMinutes,
      fromMetrics.totalSleepMinutes,
    ),
    timeInBedMinutes: pickNum(
      fromV.timeInBedMinutes,
      fromMetrics.timeInBedMinutes,
    ),
    sleepEfficiency: pickNum(
      fromV.sleepEfficiency,
      fromMetrics.sleepEfficiency,
    ),
    sleepLatencyMinutes: pickNum(
      fromV.sleepLatencyMinutes,
      fromMetrics.sleepLatencyMinutes,
    ),
    awakeMinutes: pickNum(fromV.awakeMinutes, fromMetrics.awakeMinutes),
    remMinutes: pickNum(fromV.remMinutes, fromMetrics.remMinutes),
    lightMinutes: pickNum(fromV.lightMinutes, fromMetrics.lightMinutes),
    deepMinutes: pickNum(fromV.deepMinutes, fromMetrics.deepMinutes),
    lowestHeartRate: pickNum(
      fromV.lowestHeartRate,
      fromMetrics.lowestHeartRate,
    ),
    averageHeartRate: pickNum(
      fromV.averageHeartRate,
      fromMetrics.averageHeartRate,
    ),
    restingHeartRate: pickNum(
      fromV.restingHeartRate,
      fromMetrics.restingHeartRate,
    ),
    hrv: pickNum(fromV.hrv, fromMetrics.hrv),
    respiratoryRate: pickNum(
      fromV.respiratoryRate,
      fromMetrics.respiratoryRate,
    ),
    temperatureDeviation: pickNum(
      fromV.temperatureDeviation,
      fromMetrics.temperatureDeviation,
    ),
    spo2: pickNum(fromV.spo2, fromMetrics.spo2),
    stressMinutes: pickNum(fromV.stressMinutes, fromMetrics.stressMinutes),
    recoveryMinutes: pickNum(
      fromV.recoveryMinutes,
      fromMetrics.recoveryMinutes,
    ),
    resilienceScore: pickNum(
      fromV.resilienceScore,
      fromMetrics.resilienceScore,
    ),
    cardiovascularAge: pickNum(
      fromV.cardiovascularAge,
      fromMetrics.cardiovascularAge,
    ),
    sleepDebt: pickNum(fromV.sleepDebt, fromMetrics.sleepDebt),
    warningMessages: Array.isArray(warnings)
      ? warnings.filter((w) => typeof w === "string" && w.trim())
      : [],
    rawMetrics: {
      visionMetrics: vision ?? undefined,
      analysisMetrics: metrics ?? undefined,
      deviceSpecificMetrics: deviceSpecific ?? undefined,
      ouraScores: ouraScores ?? undefined,
      measurementDate: measurementDate ?? undefined,
    },
    sourceImages: sourceImages ?? [],
    confidence:
      confidence != null && Number.isFinite(confidence)
        ? Math.max(0, Math.min(100, Math.round(confidence)))
        : null,
  };

  if (merged.sleepScore == null && metrics?.sleepScore != null) {
    merged.sleepScore = parseMetricScore(metrics.sleepScore);
  }

  return merged;
}
