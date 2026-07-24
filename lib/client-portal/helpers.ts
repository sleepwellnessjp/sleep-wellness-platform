import type { StoredAnalysis } from "@/lib/client-store";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import type {
  SleepRecordMetric,
  WeeklyScorePoint,
} from "./types";

function wellnessScoreOf(analysis: StoredAnalysis | null | undefined): number | null {
  if (!analysis) return null;
  if (
    typeof analysis.wellnessScore === "number" &&
    Number.isFinite(analysis.wellnessScore)
  ) {
    return analysis.wellnessScore;
  }
  if (
    typeof analysis.result?.score === "number" &&
    Number.isFinite(analysis.result.score)
  ) {
    return analysis.result.score;
  }
  return null;
}

export function clientWellnessScoreOf(
  analysis: StoredAnalysis | null | undefined,
): number | null {
  return wellnessScoreOf(analysis);
}

/** 直近7件（新しい順の配列から）のスコア推移（古い→新しい） */
export function buildWeeklyScoreTrend(
  analyses: StoredAnalysis[],
): WeeklyScorePoint[] {
  const recent = analyses.slice(0, 7).reverse();
  return recent.map((item) => {
    const date = item.analysisDate?.trim() || item.createdAt.slice(0, 10);
    const match = date.match(/^\d{4}-(\d{2})-(\d{2})/);
    const label = match
      ? `${Number(match[1])}/${Number(match[2])}`
      : date.slice(5, 10);
    return {
      date,
      label,
      score: wellnessScoreOf(item),
    };
  });
}

/**
 * 改善率: 初回スコアから最新スコアへの改善割合（0–100）。
 * 初回より悪化していれば 0。データ不足は null。
 */
export function computeImprovementRate(
  analyses: StoredAnalysis[],
): number | null {
  if (analyses.length < 2) return null;
  const latest = wellnessScoreOf(analyses[0]);
  const first = wellnessScoreOf(analyses[analyses.length - 1]);
  if (latest == null || first == null || first <= 0) return null;
  if (latest <= first) return 0;
  const rate = ((latest - first) / first) * 100;
  return Math.max(0, Math.min(100, Math.round(rate)));
}

export function computeGoalAchievementRate(
  currentScore: number | null,
  targetScore: number | null,
  baselineScore: number | null,
): number | null {
  if (currentScore == null || targetScore == null) return null;
  if (baselineScore == null || targetScore <= baselineScore) {
    return Math.max(0, Math.min(100, Math.round(currentScore)));
  }
  const progress =
    ((currentScore - baselineScore) / (targetScore - baselineScore)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function displayMetric(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || fallback;
}

export function buildSleepRecordMetrics(
  metrics: AnalysisMetrics | null | undefined,
): SleepRecordMetric[] {
  const m = metrics;
  return [
    {
      key: "sleepDuration",
      label: "睡眠時間",
      value: displayMetric(m?.sleepDuration),
    },
    {
      key: "sleepEfficiency",
      label: "睡眠効率",
      value: displayMetric(m?.sleepEfficiency),
    },
    {
      key: "hrv",
      label: "HRV",
      value: displayMetric(m?.hrv),
    },
    {
      key: "stress",
      label: "ストレス",
      value: displayMetric(m?.stress),
    },
    {
      key: "circadianRhythm",
      label: "体内時計",
      value: displayMetric(m?.circadianRhythm),
    },
    {
      key: "respiratoryRate",
      label: "呼吸数",
      value: displayMetric(m?.respiratoryRate),
    },
    {
      key: "restingHeartRate",
      label: "安静時心拍",
      value: displayMetric(m?.restingHeartRate),
    },
  ];
}

export function buildTodaysAdviceItems(
  recommendations: string[],
  goodPoints: string[],
  improvements: string[],
): string[] {
  const items: string[] = [];
  for (const item of recommendations) {
    const t = item.trim();
    if (t) items.push(t);
  }
  for (const item of goodPoints) {
    const t = item.trim();
    if (t) items.push(t);
  }
  for (const item of improvements) {
    const t = item.trim();
    if (t) items.push(t);
  }
  return items.slice(0, 6);
}

export function formatScoreDelta(delta: number | null): {
  label: string;
  color: string;
} {
  if (delta == null) {
    return { label: "比較データなし", color: "#8a6a2d" };
  }
  const rounded = Math.round(delta);
  if (rounded === 0) {
    return { label: "前回より ±0", color: "#8a6a2d" };
  }
  if (rounded > 0) {
    return { label: `前回より +${rounded}`, color: "#0f6b5c" };
  }
  return { label: `前回より ${rounded}`, color: "#a33a3a" };
}
