/**
 * Sleep Wellness Priority Engine — 候補指標と理由テンプレート。
 * Score / Insight 本体は変更しない。
 */

import type { SleepWellnessScoreFactorKey } from "@/lib/sleep-analysis/sleep-wellness-weights";
import { SLEEP_WELLNESS_FACTOR_LABELS } from "@/lib/sleep-analysis/sleep-wellness-weights";

export const SLEEP_WELLNESS_PRIORITY_VERSION = "1.0.0";
export const SLEEP_WELLNESS_PRIORITY_MAX = 3;

/** Score 因子 + 入眠潜時（改善アクションとして独立扱い） */
export type SleepWellnessPriorityItemKey =
  | SleepWellnessScoreFactorKey
  | "sleepLatency";

export const SLEEP_WELLNESS_PRIORITY_LABELS: Record<
  SleepWellnessPriorityItemKey,
  string
> = {
  ...SLEEP_WELLNESS_FACTOR_LABELS,
  sleepLatency: "入眠潜時",
};

/** 改善候補として拾う弱さの閾値（項目スコア） */
export const PRIORITY_IMPROVE_SCORE = 70;
export const PRIORITY_URGENT_SCORE = 50;

/** 入眠潜時（分）の改善閾値 */
export const PRIORITY_LATENCY_MILD_MINUTES = 20;
export const PRIORITY_LATENCY_HIGH_MINUTES = 30;
export const PRIORITY_LATENCY_SEVERE_MINUTES = 45;

/** 優先度エンジン内のベース重要度（Score 重みとは別レイヤー） */
export const PRIORITY_BASE_IMPORTANCE: Record<
  SleepWellnessPriorityItemKey,
  number
> = {
  sleepEfficiency: 1.0,
  sleepDuration: 0.95,
  deepSleep: 0.92,
  rem: 0.78,
  hrv: 0.88,
  recovery: 0.85,
  stress: 0.8,
  restingHeartRate: 0.72,
  temperatureDeviation: 0.7,
  respiratoryRate: 0.65,
  sleepLatency: 0.9,
};

export function formatPriorityRankLabel(rank: 1 | 2 | 3): string {
  if (rank === 1) return "1位";
  if (rank === 2) return "2位";
  return "3位";
}
