import type {
  AnalysisResult,
  HomeworkAchievement,
  NextActionGoal,
} from "@/lib/analysis-session";
import {
  computeHomeworkAchievement,
  normalizeRecommendationsUntilNext,
} from "@/lib/analysis-session";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  parseDurationMinutes,
  parseLeadingNumber,
} from "@/lib/soxai-graphs";

export type PreviousComparisonTone = "improved" | "worsened" | "unchanged";

export type PreviousComparisonItem = {
  label: string;
  value: string;
  tone: PreviousComparisonTone;
};

export type PreviousComparisonSummary = {
  previousDate: string;
  items: PreviousComparisonItem[];
  profileNote: string;
};

/** 前回AI宿題の達成比較（次回分析結果で表示） */
export type PreviousHomeworkComparison = {
  previousDate: string;
  goals: NextActionGoal[];
  achievement: HomeworkAchievement;
};

const PROFILE_KEYS = [
  "age",
  "gender",
  "heightCm",
  "weightKg",
  "medications",
  "drinkingHabit",
  "exerciseHabit",
  "snoringNasal",
  "medicalHistory",
] as const;

/**
 * analyses は新しい順。currentId の1つ古い分析を返す。
 * 初回（比較対象なし）は null。
 */
export function findPreviousAnalysis(
  analyses: StoredAnalysis[],
  currentId?: string | null,
): StoredAnalysis | null {
  if (analyses.length < 2) return null;

  if (currentId?.trim()) {
    const index = analyses.findIndex((item) => item.id === currentId);
    if (index >= 0) {
      return analyses[index + 1] ?? null;
    }
  }

  // 保存直後など ID 未解決時は最新の次（前回）を使う
  return analyses[1] ?? null;
}

export function analysisResultToStoredShape(
  result: AnalysisResult,
): StoredAnalysis {
  return {
    id: result.analysisId?.trim() || "current",
    analysisDate: result.measurementDate?.trim() || "",
    createdAt: "",
    sleepScore: result.metrics.sleepScore,
    wellnessScore: result.score,
    metrics: result.metrics,
    result,
    pdfHistory: [],
  };
}

function resolveTrend(
  before: number | null,
  after: number | null,
  lowerIsBetter: boolean,
): { tone: PreviousComparisonTone; delta: number | null } {
  if (before == null || after == null) {
    return { tone: "unchanged", delta: null };
  }

  const delta = after - before;
  const threshold =
    Math.abs(before) >= 50 ? 1 : Math.max(0.5, Math.abs(before) * 0.02);

  if (Math.abs(delta) <= threshold) {
    return { tone: "unchanged", delta };
  }

  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return {
    tone: improved ? "improved" : "worsened",
    delta,
  };
}

function formatSignedMinutes(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return "±0分";
  const sign = rounded > 0 ? "+" : "";
  const abs = Math.abs(rounded);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (hours > 0 && minutes > 0) {
    return `${sign}${hours}時間${minutes}分`;
  }
  if (hours > 0) {
    return `${sign}${hours}時間`;
  }
  return `${sign}${minutes}分`;
}

function sleepScoreOf(analysis: StoredAnalysis): number | null {
  const fromField = analysis.sleepScore ?? analysis.metrics.sleepScore;
  if (typeof fromField === "number" && Number.isFinite(fromField)) {
    return fromField;
  }
  return null;
}

function deepSleepMinutes(analysis: StoredAnalysis): number | null {
  return parseDurationMinutes(analysis.metrics.deepSleep ?? "");
}

function stressValue(analysis: StoredAnalysis): number | null {
  const structured = analysis.structured?.stressAverage;
  if (structured?.trim()) {
    return parseLeadingNumber(structured);
  }
  return parseLeadingNumber(analysis.metrics.stress ?? "");
}

function sleepDebtMinutes(analysis: StoredAnalysis): number | null {
  return parseDurationMinutes(analysis.metrics.sleepDebt ?? "");
}

function profileChanged(
  before: AnalysisResult | undefined,
  after: AnalysisResult | undefined,
): boolean {
  if (!before || !after) return false;
  return PROFILE_KEYS.some((key) => {
    const a = String(before[key] ?? "").trim();
    const b = String(after[key] ?? "").trim();
    return a !== b;
  });
}

/**
 * 結果レポート用のコンパクトな前回比較。
 * 比較可能な指標が1つも無い場合は null。
 */
export function buildPreviousComparisonSummary(
  previous: StoredAnalysis,
  current: StoredAnalysis,
): PreviousComparisonSummary | null {
  const items: PreviousComparisonItem[] = [];

  const scoreTrend = resolveTrend(
    sleepScoreOf(previous),
    sleepScoreOf(current),
    false,
  );
  if (scoreTrend.delta != null) {
    const rounded = Math.round(scoreTrend.delta);
    items.push({
      label: "睡眠スコア",
      value:
        rounded > 0 ? `+${rounded}` : rounded < 0 ? String(rounded) : "±0",
      tone: scoreTrend.tone,
    });
  }

  const deepTrend = resolveTrend(
    deepSleepMinutes(previous),
    deepSleepMinutes(current),
    false,
  );
  if (deepTrend.delta != null) {
    items.push({
      label: "深い睡眠",
      value: formatSignedMinutes(deepTrend.delta),
      tone: deepTrend.tone,
    });
  }

  const stressTrend = resolveTrend(
    stressValue(previous),
    stressValue(current),
    true,
  );
  if (stressTrend.delta != null) {
    items.push({
      label: "ストレス",
      value:
        stressTrend.tone === "improved"
          ? "改善"
          : stressTrend.tone === "worsened"
            ? "悪化"
            : "変化なし",
      tone: stressTrend.tone,
    });
  }

  const debtTrend = resolveTrend(
    sleepDebtMinutes(previous),
    sleepDebtMinutes(current),
    true,
  );
  if (debtTrend.delta != null) {
    items.push({
      label: "睡眠負債",
      value:
        debtTrend.tone === "improved"
          ? "減少"
          : debtTrend.tone === "worsened"
            ? "増加"
            : "変化なし",
      tone: debtTrend.tone,
    });
  }

  if (items.length === 0) return null;

  return {
    previousDate: previous.analysisDate,
    items,
    profileNote: profileChanged(previous.result, current.result)
      ? "プロフィールに更新あり"
      : "プロフィールは変化なし",
  };
}

/**
 * 前回分析の AI宿題（行動目標）と達成率を比較表示用にまとめる。
 * 宿題が無い場合は null。
 */
export function buildPreviousHomeworkComparison(
  previous: StoredAnalysis,
): PreviousHomeworkComparison | null {
  const goals = normalizeRecommendationsUntilNext(
    previous.result?.recommendationsUntilNext,
  );
  if (goals.length === 0) return null;

  const stored = previous.result?.homeworkAchievement;
  const achievement =
    stored && stored.total === goals.length
      ? stored
      : computeHomeworkAchievement(goals);

  return {
    previousDate: previous.analysisDate,
    goals,
    achievement,
  };
}

export function previousComparisonToneColor(
  tone: PreviousComparisonTone,
): string {
  if (tone === "improved") return "#0f6b5c";
  if (tone === "worsened") return "#a33a3a";
  return "#8a6a2d";
}

function wellnessScoreOf(analysis: StoredAnalysis): number | null {
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

function sleepDurationMinutes(analysis: StoredAnalysis): number | null {
  return parseDurationMinutes(String(analysis.metrics.sleepDuration ?? ""));
}

function sleepEfficiencyPercent(analysis: StoredAnalysis): number | null {
  const raw = analysis.metrics.sleepEfficiency;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return parseLeadingNumber(String(raw ?? ""));
}

function formatSignedScore(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return "±0";
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function formatSignedPercent(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded) < 0.05) return "±0%";
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

/**
 * クライアントマイページ用の前回比較。
 * Sleep Wellness Score / 睡眠効率 / 睡眠時間。
 */
export function buildClientMypageComparison(
  previous: StoredAnalysis,
  current: StoredAnalysis,
): PreviousComparisonSummary | null {
  const items: PreviousComparisonItem[] = [];

  const scoreTrend = resolveTrend(
    wellnessScoreOf(previous),
    wellnessScoreOf(current),
    false,
  );
  if (scoreTrend.delta != null) {
    items.push({
      label: "Sleep Wellness Score",
      value: formatSignedScore(scoreTrend.delta),
      tone: scoreTrend.tone,
    });
  }

  const efficiencyTrend = resolveTrend(
    sleepEfficiencyPercent(previous),
    sleepEfficiencyPercent(current),
    false,
  );
  if (efficiencyTrend.delta != null) {
    items.push({
      label: "睡眠効率",
      value: formatSignedPercent(efficiencyTrend.delta),
      tone: efficiencyTrend.tone,
    });
  }

  const durationTrend = resolveTrend(
    sleepDurationMinutes(previous),
    sleepDurationMinutes(current),
    false,
  );
  if (durationTrend.delta != null) {
    items.push({
      label: "睡眠時間",
      value: formatSignedMinutes(durationTrend.delta),
      tone: durationTrend.tone,
    });
  }

  if (items.length === 0) return null;

  return {
    previousDate: previous.analysisDate,
    items,
    profileNote: profileChanged(previous.result, current.result)
      ? "プロフィールに更新あり"
      : "プロフィールは変化なし",
  };
}
