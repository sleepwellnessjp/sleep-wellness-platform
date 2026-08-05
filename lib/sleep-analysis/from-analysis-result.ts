/**
 * 既存 AnalysisResult → SleepAnalysisData。
 * OCR / API は触らず、セッション保存済み結果から共通モデルへ変換する。
 */

import type { AnalysisResult } from "@/lib/analysis-session";
import { mapOuraToAnalysis } from "@/lib/sleep-analysis/map-oura-to-analysis";
import { mapSoxaiToAnalysis } from "@/lib/sleep-analysis/map-soxai-to-analysis";
import type { SleepAnalysisData } from "@/lib/sleep-analysis/sleep-analysis-model";
import { emptySleepAnalysisData } from "@/lib/sleep-analysis/sleep-analysis-model";
import { buildSleepWellnessReport } from "@/lib/sleep-analysis/sleep-wellness-report";
import type { SleepWellnessReport } from "@/lib/sleep-analysis/sleep-wellness-report";

export function analysisResultToSleepAnalysisData(
  result: AnalysisResult,
): SleepAnalysisData {
  const source = result.inputSource ?? "soxai";
  const warnings: string[] = [];
  if (result.caution?.trim()) warnings.push(result.caution.trim());

  if (source === "oura") {
    return mapOuraToAnalysis({
      visionMetrics: result.ouraVisionMetrics ?? null,
      metrics: result.metrics,
      ouraScores: result.ouraScores ?? null,
      deviceSpecificMetrics: result.deviceSpecificMetrics ?? null,
      warnings,
      confidence: null,
      measurementDate: result.measurementDate ?? null,
    });
  }

  if (source === "manual") {
    const mapped = mapSoxaiToAnalysis({
      metrics: result.metrics,
      warnings,
      ocrConfidence: result.ocrConfidence ?? null,
    });
    return { ...mapped, device: "manual" };
  }

  return mapSoxaiToAnalysis({
    metrics: result.metrics,
    warnings,
    ocrConfidence: result.ocrConfidence ?? null,
  });
}

export function buildSleepWellnessReportFromAnalysisResult(
  result: AnalysisResult,
): SleepWellnessReport {
  const data = analysisResultToSleepAnalysisData(result);
  return buildSleepWellnessReport({
    data,
    generatedAt: new Date().toISOString(),
  });
}

/** UI デモ用の充実したサンプルデータ */
export function buildDemoSleepAnalysisData(): SleepAnalysisData {
  const base = emptySleepAnalysisData("oura");
  return {
    ...base,
    sleepScore: 78,
    readinessScore: 72,
    activityScore: 80,
    totalSleepMinutes: 398,
    timeInBedMinutes: 468,
    sleepEfficiency: 78,
    sleepLatencyMinutes: 38,
    awakeMinutes: 52,
    remMinutes: 62,
    lightMinutes: 220,
    deepMinutes: 48,
    lowestHeartRate: 52,
    averageHeartRate: 58,
    restingHeartRate: 56,
    hrv: 32,
    respiratoryRate: 15.2,
    temperatureDeviation: 0.35,
    spo2: 96,
    stressMinutes: 140,
    recoveryMinutes: 45,
    resilienceScore: 58,
    sleepDebt: 55,
    warningMessages: [],
    rawMetrics: { demo: true },
    sourceImages: [],
    confidence: 88,
  };
}

export function buildDemoSleepWellnessReport(): SleepWellnessReport {
  return buildSleepWellnessReport({
    data: buildDemoSleepAnalysisData(),
    generatedAt: new Date().toISOString(),
  });
}
