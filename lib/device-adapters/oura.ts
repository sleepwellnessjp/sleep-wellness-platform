import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import type { RecoveryIndexInput } from "@/lib/recovery-index";
import type {
  OuraDeviceSpecificMetrics,
  OuraVisionMetrics,
} from "@/lib/oura-vision-schema";
import { formatOuraConfirmFieldValue } from "@/lib/oura-metrics";

export type OuraAnalysisContext = {
  metrics: AnalysisMetrics;
  deviceSpecificMetrics?: OuraDeviceSpecificMetrics | null;
  visionMetrics?: OuraVisionMetrics | null;
  readinessScore?: number | null;
  activityScore?: number | null;
  sleepScore?: number | null;
};

/** Recovery Index 用入力。Oura Readiness は参考として optional で渡す */
export function toRecoveryIndexInputFromOura(
  ctx: OuraAnalysisContext,
): RecoveryIndexInput {
  return {
    sleepDuration: ctx.metrics.sleepDuration,
    deepSleep: ctx.metrics.deepSleep,
    sleepEfficiency: ctx.metrics.sleepEfficiency,
    hrv: ctx.metrics.hrv,
    stress: ctx.metrics.stress,
    restingHeartRate: ctx.metrics.restingHeartRate,
    spo2: ctx.metrics.spo2,
    respiratoryRate: ctx.metrics.respiratoryRate,
    readinessScore: ctx.readinessScore ?? null,
  };
}

export function formatOuraDeviceLabel(): string {
  return "Oura Ring";
}

export function formatOuraDataHeading(): string {
  return "Ouraデータ";
}

/** AI プロンプト用の Oura 固有サマリ（空なら空文字） */
export function formatOuraSpecificForAi(ctx: OuraAnalysisContext): string {
  const lines: string[] = [];
  if (ctx.sleepScore != null) lines.push(`Oura Sleep Score: ${ctx.sleepScore}`);
  if (ctx.readinessScore != null) {
    lines.push(
      `Oura Readiness Score: ${ctx.readinessScore}（参考。SWIJスコアへコピー禁止）`,
    );
  }
  if (ctx.activityScore != null) {
    lines.push(`Oura Activity Score: ${ctx.activityScore}`);
  }

  const vision = ctx.visionMetrics;
  if (vision) {
    const extras: Array<[string, string]> = [
      ["Time in Bed", formatOuraConfirmFieldValue("timeInBed", vision)],
      ["Awake Time", formatOuraConfirmFieldValue("awakeTime", vision)],
      [
        "Breathing Regularity",
        formatOuraConfirmFieldValue("breathingRegularity", vision),
      ],
      [
        "Body Temperature Deviation",
        formatOuraConfirmFieldValue("bodyTemperatureDeviation", vision),
      ],
      ["Sleep Timing", formatOuraConfirmFieldValue("sleepTiming", vision)],
      ["Sleep Balance", formatOuraConfirmFieldValue("sleepBalance", vision)],
      [
        "Activity Balance",
        formatOuraConfirmFieldValue("activityBalance", vision),
      ],
      ["Recovery Index", formatOuraConfirmFieldValue("recoveryIndex", vision)],
      ["Recovery Time", formatOuraConfirmFieldValue("recoveryTime", vision)],
    ];
    for (const [label, value] of extras) {
      if (value.trim()) lines.push(`${label}: ${value}`);
    }
  }

  const sleep = ctx.deviceSpecificMetrics?.sleepContributors;
  if (sleep && Object.keys(sleep).length > 0) {
    lines.push(`Sleep Contributors: ${JSON.stringify(sleep)}`);
  }
  const ready = ctx.deviceSpecificMetrics?.readinessContributors;
  if (ready && Object.keys(ready).length > 0) {
    lines.push(`Readiness Contributors: ${JSON.stringify(ready)}`);
  }
  const tags = ctx.deviceSpecificMetrics?.tags ?? [];
  if (tags.length > 0) lines.push(`Tags: ${tags.join(", ")}`);
  const notes = ctx.deviceSpecificMetrics?.notes ?? [];
  if (notes.length > 0) lines.push(`Notes: ${notes.join(" / ")}`);
  if (lines.length === 0) return "";
  return `【Oura固有指標（参考・推測禁止）】\n${lines.join("\n")}`;
}
