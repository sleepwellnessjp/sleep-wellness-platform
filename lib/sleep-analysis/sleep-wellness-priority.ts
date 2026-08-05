/**
 * Sleep Wellness Priority Engine。
 *
 * 分析結果（SleepAnalysisData / Score / Insight）から
 * 改善優先順位を最大 3 項目、順位順で返す。
 *
 * Score・Insight は変更せず、上位レイヤーとして追加する。
 */

import type { SleepAnalysisData } from "@/lib/sleep-analysis/sleep-analysis-model";
import { computeSleepWellnessInsight } from "@/lib/sleep-analysis/sleep-wellness-insight";
import type { SleepWellnessInsight } from "@/lib/sleep-analysis/sleep-wellness-insight";
import { computeSleepWellnessScore } from "@/lib/sleep-analysis/sleep-wellness-score";
import type { SleepWellnessScore } from "@/lib/sleep-analysis/sleep-wellness-score";
import type { SleepWellnessScoreFactorKey } from "@/lib/sleep-analysis/sleep-wellness-weights";
import {
  PRIORITY_BASE_IMPORTANCE,
  PRIORITY_IMPROVE_SCORE,
  PRIORITY_LATENCY_HIGH_MINUTES,
  PRIORITY_LATENCY_MILD_MINUTES,
  PRIORITY_LATENCY_SEVERE_MINUTES,
  PRIORITY_URGENT_SCORE,
  SLEEP_WELLNESS_PRIORITY_LABELS,
  SLEEP_WELLNESS_PRIORITY_MAX,
  SLEEP_WELLNESS_PRIORITY_VERSION,
  formatPriorityRankLabel,
  type SleepWellnessPriorityItemKey,
} from "@/lib/sleep-analysis/sleep-wellness-priority-config";

export type {
  SleepWellnessPriorityItemKey,
} from "@/lib/sleep-analysis/sleep-wellness-priority-config";

export type SleepWellnessPriorityItem = {
  /** 1–3（配列順と一致） */
  rank: 1 | 2 | 3;
  /** 「1位」「2位」「3位」 */
  rankLabel: string;
  key: SleepWellnessPriorityItemKey;
  /** 例: 睡眠効率 */
  label: string;
  /** 優先理由 */
  reason: string;
  /** 内部スコア（高いほど優先）。デバッグ用 */
  urgency: number;
  /** 項目スコア 0–100。入眠潜時は換算スコア */
  metricScore: number | null;
  relatedInsightCauseIds: string[];
};

export type SleepWellnessPriorityPlan = {
  /** 必ず優先順位順（1位→3位）、最大3件 */
  items: SleepWellnessPriorityItem[];
  scoreTotal: number | null;
  meta: {
    version: string;
    maxItems: number;
    candidateCount: number;
  };
};

export type ComputeSleepWellnessPriorityInput = {
  data: SleepAnalysisData;
  score?: SleepWellnessScore | null;
  insight?: SleepWellnessInsight | null;
};

type Candidate = {
  key: SleepWellnessPriorityItemKey;
  label: string;
  metricScore: number | null;
  urgency: number;
  reason: string;
  relatedInsightCauseIds: string[];
};

function finiteOrNull(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Number.isFinite(n) ? n : null;
}

/** 入眠潜時（分）→ 0–100（短いほど高得点） */
function latencyToScore(minutes: number): number {
  if (minutes <= 10) return 100;
  if (minutes <= 15) return 90;
  if (minutes <= PRIORITY_LATENCY_MILD_MINUTES) return 75;
  if (minutes <= PRIORITY_LATENCY_HIGH_MINUTES) return 55;
  if (minutes <= PRIORITY_LATENCY_SEVERE_MINUTES) return 35;
  if (minutes <= 60) return 20;
  return 10;
}

function insightMentions(
  insight: SleepWellnessInsight | null,
  key: SleepWellnessPriorityItemKey,
): string[] {
  if (!insight) return [];
  const ids: string[] = [];
  for (const cause of insight.causes) {
    if (key === "sleepLatency") {
      // Insight の evidence に latency は無いが、効率系原因と併記されやすい
      if (
        cause.evidenceKeys.includes("sleepEfficiency") ||
        cause.id.includes("efficiency")
      ) {
        ids.push(cause.id);
      }
      continue;
    }
    if (cause.evidenceKeys.includes(key as SleepWellnessScoreFactorKey)) {
      ids.push(cause.id);
    }
  }
  for (const p of insight.priorities) {
    if (key === "sleepLatency") continue;
    if (
      p.targetKeys.includes(key as SleepWellnessScoreFactorKey) &&
      !ids.some((id) => p.relatedCauseIds.includes(id))
    ) {
      ids.push(...p.relatedCauseIds.filter((id) => !ids.includes(id)));
    }
  }
  return ids;
}

function factorMap(score: SleepWellnessScore) {
  return new Map(score.factors.map((f) => [f.key, f]));
}

function buildReason(args: {
  key: SleepWellnessPriorityItemKey;
  label: string;
  metricScore: number | null;
  inputValue: number | null;
  unit: string | null;
  companions: string[];
  insightBoosted: boolean;
}): string {
  const { key, label, metricScore, inputValue, unit, companions, insightBoosted } =
    args;

  const valuePart =
    inputValue != null && unit
      ? `現在値は ${formatValue(inputValue, unit)} です。`
      : inputValue != null
        ? `現在値は ${inputValue} です。`
        : "";

  const scorePart =
    metricScore != null
      ? `項目スコアは ${metricScore} 点で、改善余地が大きいです。`
      : "改善余地が大きいです。";

  const companionPart =
    companions.length > 0
      ? `あわせて ${companions.join("・")} も弱いため、単独指標ではなく複合的な優先課題です。`
      : "";

  const insightPart = insightBoosted
    ? "Insight でも関連する複合パターンが検出されています。"
    : "";

  if (key === "sleepLatency") {
    return [
      `${label}が長めです。${valuePart}`,
      "入眠の遅れは睡眠効率や総睡眠にも波及しやすいため、優先的に整えます。",
      companionPart,
      insightPart,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (key === "sleepEfficiency") {
    return [
      `${label}が低い状態です。${valuePart}${scorePart}`,
      "ベッド上の時間に対する実睡眠の比率が改善のてこになりやすいため優先します。",
      companionPart,
      insightPart,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (key === "deepSleep") {
    return [
      `${label}が不足気味です。${valuePart}${scorePart}`,
      "身体回復の中核指標のため、他の弱い項目より先に底上げ効果が見込めます。",
      companionPart,
      insightPart,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (key === "sleepDuration") {
    return [
      `${label}が足りていません。${valuePart}${scorePart}`,
      "量の不足は他指標（REM・効率・回復）をまとめて押し下げやすいため優先します。",
      companionPart,
      insightPart,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `${label}の評価が低めです。${valuePart}${scorePart}`,
    companionPart || "総合点への影響と改善余地から優先候補とします。",
    insightPart,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatValue(value: number, unit: string): string {
  if (unit === "min") {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    if (h > 0) return `${h}時間${m}分`;
    return `${Math.round(value)}分`;
  }
  if (unit === "%") return `${Math.round(value * 10) / 10}%`;
  if (unit === "ms") return `${Math.round(value)} ms`;
  if (unit === "bpm") return `${Math.round(value)} bpm`;
  if (unit === "rpm") return `${Math.round(value * 10) / 10} 回/分`;
  if (unit === "°C") return `${Math.round(value * 100) / 100} °C`;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function collectCandidates(
  data: SleepAnalysisData,
  score: SleepWellnessScore,
  insight: SleepWellnessInsight | null,
): Candidate[] {
  const factors = factorMap(score);
  const weakKeys: SleepWellnessPriorityItemKey[] = [];

  for (const f of score.factors) {
    if (!f.available || f.score == null) continue;
    if (f.score < PRIORITY_IMPROVE_SCORE) weakKeys.push(f.key);
  }

  const latencyMin = finiteOrNull(data.sleepLatencyMinutes);
  const latencyScore =
    latencyMin != null ? latencyToScore(latencyMin) : null;
  if (
    latencyScore != null &&
    latencyScore < PRIORITY_IMPROVE_SCORE
  ) {
    weakKeys.push("sleepLatency");
  }

  const candidates: Candidate[] = [];

  for (const key of new Set(weakKeys)) {
    const importance = PRIORITY_BASE_IMPORTANCE[key];
    const related = insightMentions(insight, key);

    let metricScore: number | null = null;
    let inputValue: number | null = null;
    let unit: string | null = null;

    if (key === "sleepLatency") {
      metricScore = latencyScore;
      inputValue = latencyMin;
      unit = "min";
    } else {
      const f = factors.get(key);
      if (!f || f.score == null) continue;
      metricScore = f.score;
      inputValue = f.inputValue;
      unit = f.unit;
    }

    const gap = metricScore != null ? 100 - metricScore : 30;
    let urgency = gap * importance;

    if (metricScore != null && metricScore < PRIORITY_URGENT_SCORE) {
      urgency *= 1.25;
    }
    if (related.length > 0) {
      urgency *= 1.2 + Math.min(related.length, 3) * 0.05;
    }

    // 複合ブースト: 効率が弱いとき入眠潜時を上げる / その逆
    if (
      key === "sleepLatency" &&
      weakKeys.includes("sleepEfficiency")
    ) {
      urgency *= 1.15;
    }
    if (
      key === "sleepEfficiency" &&
      weakKeys.includes("sleepLatency")
    ) {
      urgency *= 1.1;
    }
    if (
      key === "deepSleep" &&
      (weakKeys.includes("recovery") || weakKeys.includes("hrv"))
    ) {
      urgency *= 1.12;
    }
    if (
      key === "sleepDuration" &&
      (weakKeys.includes("rem") || weakKeys.includes("deepSleep"))
    ) {
      urgency *= 1.1;
    }

    const companions = weakKeys
      .filter((k) => k !== key)
      .slice(0, 2)
      .map((k) => SLEEP_WELLNESS_PRIORITY_LABELS[k]);

    candidates.push({
      key,
      label: SLEEP_WELLNESS_PRIORITY_LABELS[key],
      metricScore,
      urgency: Math.round(urgency * 10) / 10,
      relatedInsightCauseIds: related,
      reason: buildReason({
        key,
        label: SLEEP_WELLNESS_PRIORITY_LABELS[key],
        metricScore,
        inputValue,
        unit,
        companions,
        insightBoosted: related.length > 0,
      }),
    });
  }

  candidates.sort((a, b) => b.urgency - a.urgency);
  return candidates;
}

function isWrapped(
  input: ComputeSleepWellnessPriorityInput | SleepAnalysisData,
): input is ComputeSleepWellnessPriorityInput {
  return (
    typeof input === "object" &&
    input != null &&
    "data" in input &&
    (input as ComputeSleepWellnessPriorityInput).data != null &&
    typeof (input as ComputeSleepWellnessPriorityInput).data.device ===
      "string"
  );
}

/**
 * 改善優先順位を最大 3 項目、順位順で返す。
 */
export function computeSleepWellnessPriority(
  input: ComputeSleepWellnessPriorityInput | SleepAnalysisData,
): SleepWellnessPriorityPlan {
  const data = isWrapped(input) ? input.data : input;
  const score =
    isWrapped(input) && input.score
      ? input.score
      : computeSleepWellnessScore(data);
  const insight =
    isWrapped(input) && input.insight
      ? input.insight
      : computeSleepWellnessInsight({ data, score });

  const candidates = collectCandidates(data, score, insight);
  const top = candidates.slice(0, SLEEP_WELLNESS_PRIORITY_MAX);

  const items: SleepWellnessPriorityItem[] = top.map((c, index) => {
    const rank = (index + 1) as 1 | 2 | 3;
    return {
      rank,
      rankLabel: formatPriorityRankLabel(rank),
      key: c.key,
      label: c.label,
      reason: c.reason,
      urgency: c.urgency,
      metricScore: c.metricScore,
      relatedInsightCauseIds: c.relatedInsightCauseIds,
    };
  });

  return {
    items,
    scoreTotal: score.total,
    meta: {
      version: SLEEP_WELLNESS_PRIORITY_VERSION,
      maxItems: SLEEP_WELLNESS_PRIORITY_MAX,
      candidateCount: candidates.length,
    },
  };
}

/**
 * 画面・ログ向けの簡易テキスト（順位順）。
 * 例:
 * 1位：睡眠効率
 * 理由：...
 */
export function formatSleepWellnessPriorityPlan(
  plan: SleepWellnessPriorityPlan,
): string {
  if (plan.items.length === 0) {
    return "改善優先項目は検出されませんでした。";
  }
  return plan.items
    .map((item) => `${item.rankLabel}：${item.label}\n理由：${item.reason}`)
    .join("\n\n");
}
