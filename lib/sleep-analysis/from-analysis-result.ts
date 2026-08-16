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

/** 画面表示用：共通モデル + レポートをセットで返す */
export function buildSleepWellnessReportBundleFromAnalysisResult(
  result: AnalysisResult,
): { data: SleepAnalysisData; report: SleepWellnessReport } {
  const data = analysisResultToSleepAnalysisData(result);
  const report = buildSleepWellnessReport({
    data,
    generatedAt: new Date().toISOString(),
  });
  return { data, report };
}

/** UI デモ用サンプル — 金曜日デモ向けの自然なストーリー */
export function buildDemoSleepAnalysisData(): SleepAnalysisData {
  const base = emptySleepAnalysisData("oura");
  return {
    ...base,
    sleepScore: 72,
    readinessScore: 68,
    activityScore: 78,
    // 約6時間40分睡眠 / ベッド8時間 → 効率低下が主因
    totalSleepMinutes: 400,
    timeInBedMinutes: 480,
    sleepEfficiency: 67,
    // 入眠潜時は閾値未満にし、Priority を効率・HRV・深睡眠に集中
    sleepLatencyMinutes: 16,
    awakeMinutes: 64,
    remMinutes: 72,
    lightMinutes: 296,
    // 深睡眠やや不足（総睡眠の約8%）
    deepMinutes: 32,
    lowestHeartRate: 54,
    averageHeartRate: 60,
    restingHeartRate: 58,
    // HRV 低め → Priority 2
    hrv: 28,
    respiratoryRate: 14.8,
    temperatureDeviation: 0.22,
    spo2: 97,
    stressMinutes: 125,
    recoveryMinutes: 52,
    resilienceScore: 61,
    sleepDebt: 48,
    warningMessages: [],
    rawMetrics: { demo: true, story: "efficiency-hrv-deep" },
    sourceImages: [],
    confidence: 90,
  };
}

export function buildDemoSleepWellnessReport(): SleepWellnessReport {
  return buildSleepWellnessReport({
    data: buildDemoSleepAnalysisData(),
    generatedAt: new Date().toISOString(),
  });
}

export function buildDemoSleepWellnessReportBundle(): {
  data: SleepAnalysisData;
  report: SleepWellnessReport;
} {
  const data = buildDemoSleepAnalysisData();
  return {
    data,
    report: buildSleepWellnessReport({
      data,
      generatedAt: new Date().toISOString(),
    }),
  };
}
