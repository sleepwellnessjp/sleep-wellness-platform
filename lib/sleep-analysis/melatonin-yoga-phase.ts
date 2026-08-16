/**
 * メラトニンヨガ推奨 Phase のルールベース判定。
 * UI には直接書かず、この関数だけを参照する。
 */

import type { SleepAnalysisData } from "@/lib/sleep-analysis/sleep-analysis-model";
import type { SleepWellnessInsight } from "@/lib/sleep-analysis/sleep-wellness-insight";
import type { SleepWellnessPriorityPlan } from "@/lib/sleep-analysis/sleep-wellness-priority";
import type { SleepWellnessScore } from "@/lib/sleep-analysis/sleep-wellness-score";

export type MelatoninYogaPhase = 1 | 2 | 3;

export type MelatoninYogaPhaseResult = {
  phase: MelatoninYogaPhase;
  label: string;
  focus: string;
  reason: string;
};

const PHASE_META: Record<
  MelatoninYogaPhase,
  { label: string; focus: string }
> = {
  1: {
    label: "Phase 1",
    focus: "緊張が強い・入眠準備",
  },
  2: {
    label: "Phase 2",
    focus: "回復不足・自律神経調整",
  },
  3: {
    label: "Phase 3",
    focus: "深い休息・睡眠前の鎮静",
  },
};

function factorScore(
  score: SleepWellnessScore,
  key: string,
): number | null {
  const f = score.factors.find((x) => x.key === key);
  return f?.available && f.score != null ? f.score : null;
}

/**
 * Priority / Insight / 生データからメラトニンヨガ Phase を選ぶ。
 */
export function resolveMelatoninYogaPhase(input: {
  data: SleepAnalysisData;
  score: SleepWellnessScore;
  insight: SleepWellnessInsight;
  priority: SleepWellnessPriorityPlan;
}): MelatoninYogaPhaseResult {
  const { data, score, insight, priority } = input;
  const topKeys = new Set(priority.items.map((i) => i.key));
  const matched = new Set(insight.matchedRuleIds);

  const latency = data.sleepLatencyMinutes;
  const stress = factorScore(score, "stress");
  const efficiency = factorScore(score, "sleepEfficiency");
  const hrv = factorScore(score, "hrv");
  const recovery = factorScore(score, "recovery");
  const deep = factorScore(score, "deepSleep");
  const rhr = factorScore(score, "restingHeartRate");

  let phase1 = 0;
  let phase2 = 0;
  let phase3 = 0;

  if (topKeys.has("sleepLatency") || topKeys.has("sleepEfficiency")) {
    phase1 += 2;
  }
  if (topKeys.has("stress")) phase1 += 2;
  if (latency != null && latency >= 30) phase1 += 2;
  if (stress != null && stress < 55) phase1 += 1;
  if (efficiency != null && efficiency < 60) phase1 += 1;
  if (
    matched.has("efficiency_stress_arousal") ||
    matched.has("short_sleep_low_efficiency")
  ) {
    phase1 += 2;
  }

  if (topKeys.has("hrv") || topKeys.has("recovery")) phase2 += 2;
  if (topKeys.has("restingHeartRate")) phase2 += 1;
  if (hrv != null && hrv < 55) phase2 += 2;
  if (recovery != null && recovery < 55) phase2 += 2;
  if (rhr != null && rhr < 55) phase2 += 1;
  if (
    matched.has("autonomic_stress_load") ||
    matched.has("stress_blocks_recovery") ||
    matched.has("low_hrv_poor_deep_sleep") ||
    matched.has("deep_sleep_recovery_deficit")
  ) {
    phase2 += 2;
  }

  if (topKeys.has("deepSleep") || topKeys.has("rem")) phase3 += 2;
  if (topKeys.has("temperatureDeviation")) phase3 += 1;
  if (deep != null && deep < 55) phase3 += 2;
  if (
    matched.has("thermoregulation_sleep_disruption") ||
    matched.has("architecture_imbalance_with_duration")
  ) {
    phase3 += 2;
  }

  let phase: MelatoninYogaPhase = 1;
  if (phase2 >= phase1 && phase2 >= phase3) phase = 2;
  else if (phase3 >= phase1 && phase3 >= phase2) phase = 3;
  else phase = 1;

  // 同点時は Priority 先頭で微調整
  const first = priority.items[0]?.key;
  if (phase1 === phase2 && phase1 === phase3 && first) {
    if (first === "hrv" || first === "recovery" || first === "restingHeartRate") {
      phase = 2;
    } else if (first === "deepSleep" || first === "rem") {
      phase = 3;
    } else {
      phase = 1;
    }
  }

  const meta = PHASE_META[phase];
  const reason =
    phase === 1
      ? "入眠の遅れや緊張・睡眠効率の弱さが見られるため、入眠準備を整える Phase 1 を優先します。"
      : phase === 2
        ? "HRV・回復・心拍まわりに改善余地があるため、自律神経と回復を整える Phase 2 を優先します。"
        : "深い休息や睡眠構造に改善余地があるため、睡眠前の鎮静を促す Phase 3 を優先します。";

  return {
    phase,
    label: meta.label,
    focus: meta.focus,
    reason,
  };
}
