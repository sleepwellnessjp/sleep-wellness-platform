/**
 * Oura Vision JSON → 既存 AnalysisMetrics への変換。
 * SOXAI metrics 変換ロジックは変更しない（本ファイルは Oura 専用）。
 */

import { formatDurationDisplay } from "@/lib/soxai-display-normalize";
import {
  emptyMetrics,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import type {
  OuraDeviceSpecificMetrics,
  OuraVisionMetrics,
  OuraVisionResult,
} from "@/lib/oura-vision-schema";
import { normalizeOuraVisionResult } from "@/lib/oura-vision-schema";

function minutesToDisplay(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return "";
  return formatDurationDisplay(`${Math.round(minutes)}分`);
}

function percentToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value * 10) / 10}%`;
}

function bpmToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value)} bpm`;
}

function msToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value)} ms`;
}

function rpmToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value * 10) / 10} 回/分`;
}

function tempDevToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value * 100) / 100}℃`;
}

function scoreToNumber(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value);
}

/**
 * Oura Vision 結果を共通 AnalysisMetrics へ変換。
 * Light/Deep は個別保持。Non-REM は両方あるときだけ Light+Deep 合算。
 */
export function ouraVisionToAnalysisMetrics(
  vision: OuraVisionResult | OuraVisionMetrics,
): AnalysisMetrics {
  const metrics: OuraVisionMetrics =
    "metrics" in vision && vision.metrics
      ? vision.metrics
      : (vision as OuraVisionMetrics);

  const out = emptyMetrics();
  out.sleepScore = scoreToNumber(metrics.sleepScore);
  out.sleepDuration = minutesToDisplay(metrics.totalSleep);
  out.sleepEfficiency = percentToDisplay(metrics.sleepEfficiency);
  out.sleepLatency = minutesToDisplay(metrics.sleepLatency);
  out.bedtime = metrics.bedtime?.trim() || "";
  out.wakeTime = metrics.wakeTime?.trim() || "";
  out.awakenings = minutesToDisplay(metrics.awakeDuration);
  out.awakeningRate = percentToDisplay(metrics.awakePercent);
  out.remSleep = minutesToDisplay(metrics.remDuration);
  out.remSleepRate = percentToDisplay(metrics.remPercent);
  out.lightSleep = minutesToDisplay(metrics.lightSleepDuration);
  out.lightSleepRate = percentToDisplay(metrics.lightSleepPercent);
  out.deepSleep = minutesToDisplay(metrics.deepSleepDuration);
  out.deepSleepRate = percentToDisplay(metrics.deepSleepPercent);

  // 内部用 Non-REM = Light + Deep（両方あるときだけ。表示では使わない）
  if (
    metrics.lightSleepDuration != null &&
    metrics.deepSleepDuration != null &&
    Number.isFinite(metrics.lightSleepDuration) &&
    Number.isFinite(metrics.deepSleepDuration)
  ) {
    out.nonRemSleep = minutesToDisplay(
      metrics.lightSleepDuration + metrics.deepSleepDuration,
    );
  }
  if (
    metrics.lightSleepPercent != null &&
    metrics.deepSleepPercent != null &&
    Number.isFinite(metrics.lightSleepPercent) &&
    Number.isFinite(metrics.deepSleepPercent)
  ) {
    out.nonRemSleepRate = percentToDisplay(
      metrics.lightSleepPercent + metrics.deepSleepPercent,
    );
  }

  out.restingHeartRate = bpmToDisplay(metrics.restingHeartRate);
  out.restingHeartRateMin = bpmToDisplay(metrics.lowestHeartRate);
  out.hrv = msToDisplay(metrics.averageHrv);
  out.hrvMax = msToDisplay(metrics.maximumHrv);
  out.hrvMin = msToDisplay(metrics.minimumHrv);
  out.respiratoryRate = rpmToDisplay(metrics.respiratoryRate);
  out.spo2 = percentToDisplay(metrics.averageSpO2);
  out.skinTemperature = tempDevToDisplay(metrics.bodyTemperatureDeviation);

  // Oura にストレス数値がない場合は空のまま（推測禁止）
  return out;
}

export type OuraMappedExtraction = {
  metrics: AnalysisMetrics;
  imageKeys: MetricFieldKey[];
  deviceSpecificMetrics: OuraDeviceSpecificMetrics;
  ouraScores: {
    sleepScore: number | null;
    readinessScore: number | null;
    activityScore: number | null;
  };
  warnings: string[];
  measurementDate: string | null;
};

function collectedKeys(metrics: AnalysisMetrics): MetricFieldKey[] {
  const keys: MetricFieldKey[] = [];
  const entries = Object.entries(metrics) as Array<
    [MetricFieldKey, string | number | null]
  >;
  for (const [key, value] of entries) {
    if (key === "nonRemSleep" || key === "nonRemSleepRate") continue;
    if (value == null) continue;
    if (typeof value === "number") {
      keys.push(key);
      continue;
    }
    if (String(value).trim()) keys.push(key);
  }
  return keys;
}

export function mapOuraVisionToExtraction(
  raw: unknown,
): OuraMappedExtraction {
  const vision = normalizeOuraVisionResult(raw);
  const metrics = ouraVisionToAnalysisMetrics(vision);
  return {
    metrics,
    imageKeys: collectedKeys(metrics),
    deviceSpecificMetrics: vision.deviceSpecificMetrics,
    ouraScores: {
      sleepScore: vision.metrics.sleepScore,
      readinessScore: vision.metrics.readinessScore,
      activityScore: vision.metrics.activityScore,
    },
    warnings: vision.warnings,
    measurementDate: vision.measurementDate,
  };
}

/** confirm / result 表示用の Oura 固有行 */
export type OuraDisplayRow = {
  key: string;
  label: string;
  value: string;
  present: boolean;
};

export function buildOuraSpecificDisplayRows(
  scores: OuraMappedExtraction["ouraScores"],
  specific: OuraDeviceSpecificMetrics,
  visionMetrics?: OuraVisionMetrics | null,
): OuraDisplayRow[] {
  const rows: OuraDisplayRow[] = [
    {
      key: "readinessScore",
      label: "Readiness Score",
      value:
        scores.readinessScore != null ? String(scores.readinessScore) : "",
      present: scores.readinessScore != null,
    },
    {
      key: "activityScore",
      label: "Activity Score",
      value: scores.activityScore != null ? String(scores.activityScore) : "",
      present: scores.activityScore != null,
    },
  ];

  if (visionMetrics) {
    const extras: Array<[string, string, string | number | null]> = [
      ["timeInBed", "就床時間（Time in bed）", minutesToDisplay(visionMetrics.timeInBed)],
      ["recoveryIndex", "Recovery Index（Oura）", visionMetrics.recoveryIndex != null ? String(visionMetrics.recoveryIndex) : ""],
      ["recoveryTime", "Recovery Time", visionMetrics.recoveryTime ?? ""],
      ["sleepTiming", "Sleep Timing", visionMetrics.sleepTiming ?? ""],
      ["sleepBalance", "Sleep Balance", visionMetrics.sleepBalance ?? ""],
      ["activityBalance", "Activity Balance", visionMetrics.activityBalance ?? ""],
      ["restfulness", "Restfulness", visionMetrics.restfulness ?? ""],
      ["breathingRegularity", "Breathing Regularity", visionMetrics.breathingRegularity ?? ""],
      ["breathingDisturbances", "Breathing Disturbances", visionMetrics.breathingDisturbances ?? ""],
    ];
    for (const [key, label, value] of extras) {
      const text = String(value ?? "").trim();
      rows.push({ key, label, value: text, present: Boolean(text) });
    }
  }

  const sleepContrib = Object.entries(specific.sleepContributors ?? {});
  for (const [k, v] of sleepContrib.slice(0, 12)) {
    const text = v == null ? "" : String(v).trim();
    rows.push({
      key: `sleepContributor:${k}`,
      label: `Sleep · ${k}`,
      value: text,
      present: Boolean(text),
    });
  }
  const readyContrib = Object.entries(specific.readinessContributors ?? {});
  for (const [k, v] of readyContrib.slice(0, 12)) {
    const text = v == null ? "" : String(v).trim();
    rows.push({
      key: `readinessContributor:${k}`,
      label: `Readiness · ${k}`,
      value: text,
      present: Boolean(text),
    });
  }

  return rows;
}
