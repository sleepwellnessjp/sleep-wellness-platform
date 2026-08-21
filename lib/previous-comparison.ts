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
 * analyses は新しい順。
 * 「前回」= 現在と異なる analysisDate を持つ直近（別日）の分析。
 * 同日の重複レコードはスキップする。該当なしは null。
 */
export function findPreviousAnalysis(
  analyses: StoredAnalysis[],
  currentId?: string | null,
): StoredAnalysis | null {
  if (analyses.length < 2) return null;

  let currentDate = "";
  let startIndex = 0;

  if (currentId?.trim()) {
    const index = analyses.findIndex((item) => item.id === currentId);
    if (index >= 0) {
      currentDate = analyses[index]!.analysisDate?.trim() ?? "";
      startIndex = index + 1;
    }
  }

  // ID 未解決時: 先頭を「今回」とみなし、その日付と異なる最初を返す
  if (!currentDate) {
    currentDate = analyses[0]?.analysisDate?.trim() ?? "";
    startIndex = 1;
  }

  if (!currentDate) return null;

  for (let i = startIndex; i < analyses.length; i += 1) {
    const candidate = analyses[i];
    if (!candidate) continue;
    const date = candidate.analysisDate?.trim() ?? "";
    if (date && date !== currentDate) {
      return candidate;
    }
  }

  return null;
}

/**
 * 「初回」= analysisDate が最も古いレコード。
 * 同日が複数ある場合は createdAt が最も古い1件。
 * 現在／前回と同じ場合は null（前回比較と重複させない）。
 */
export function findFirstAnalysis(
  analyses: StoredAnalysis[],
  currentId?: string | null,
  previous?: StoredAnalysis | null,
): StoredAnalysis | null {
  if (analyses.length < 2) return null;

  let currentIdResolved = currentId?.trim() || "";
  if (!currentIdResolved) {
    currentIdResolved = analyses[0]?.id ?? "";
  }

  let first: StoredAnalysis | null = null;
  for (const item of analyses) {
    const date = item.analysisDate?.trim() ?? "";
    if (!date) continue;
    if (!first) {
      first = item;
      continue;
    }
    const firstDate = first.analysisDate?.trim() ?? "";
    if (date < firstDate) {
      first = item;
      continue;
    }
    if (date === firstDate && item.createdAt < first.createdAt) {
      first = item;
    }
  }

  if (!first) return null;
  if (currentIdResolved && first.id === currentIdResolved) return null;

  const prev = previous ?? findPreviousAnalysis(analyses, currentId);
  if (prev && prev.id === first.id) return null;

  return first;
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

/** 増加が良い指標 / 増加が悪い（反転）指標 */
type ComparisonPolarity = "higherIsBetter" | "higherIsWorse";

/**
 * 差分・良し悪しを一括判定。
 * - 欠損（null）は比較しない（呼び出し側で非表示）
 * - tone が unchanged になるのは差分ちょうど 0 のときだけ（閾値なし）
 */
function resolveComparison(
  before: number | null,
  after: number | null,
  polarity: ComparisonPolarity,
): { tone: PreviousComparisonTone; delta: number } | null {
  if (before == null || after == null) return null;

  const delta = after - before;
  if (delta === 0) {
    return { tone: "unchanged", delta: 0 };
  }

  const improved =
    polarity === "higherIsBetter" ? delta > 0 : delta < 0;
  return {
    tone: improved ? "improved" : "worsened",
    delta,
  };
}

function formatSignedMinutes(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return "±0分";
  const sign = rounded > 0 ? "+" : "-";
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

/**
 * 矢印は数値の増減のみ（色＝tone が良し悪し）。
 * 差分 0 のときだけ →。小さな変化で → にしない。
 */
function comparisonArrow(delta: number): string {
  if (delta === 0) return "→";
  return delta > 0 ? "↑" : "↓";
}

function sleepScoreOf(analysis: StoredAnalysis): number | null {
  const fromField = analysis.sleepScore ?? analysis.metrics.sleepScore;
  if (typeof fromField === "number" && Number.isFinite(fromField)) {
    return fromField;
  }
  const fromResult = analysis.result?.metrics?.sleepScore;
  if (typeof fromResult === "number" && Number.isFinite(fromResult)) {
    return fromResult;
  }
  return null;
}

/** metrics → result.metrics の順。空 / "—" / "-" は欠損（null）。0 は有効値。 */
function metricDurationText(
  analysis: StoredAnalysis,
  key: "deepSleep" | "sleepDebt" | "sleepDuration",
): string {
  const fromMetrics = String(analysis.metrics?.[key] ?? "").trim();
  if (fromMetrics && fromMetrics !== "—" && fromMetrics !== "-") {
    return fromMetrics;
  }
  const fromResult = String(analysis.result?.metrics?.[key] ?? "").trim();
  if (fromResult && fromResult !== "—" && fromResult !== "-") {
    return fromResult;
  }
  return "";
}

function deepSleepMinutes(analysis: StoredAnalysis): number | null {
  const text = metricDurationText(analysis, "deepSleep");
  if (!text) return null;
  return parseDurationMinutes(text);
}

function stressValue(analysis: StoredAnalysis): number | null {
  const structured = analysis.structured?.stressAverage;
  if (structured?.trim()) {
    return parseLeadingNumber(structured);
  }
  const fromMetrics = String(analysis.metrics.stress ?? "").trim();
  if (fromMetrics && fromMetrics !== "—" && fromMetrics !== "-") {
    return parseLeadingNumber(fromMetrics);
  }
  const fromResult = String(analysis.result?.metrics?.stress ?? "").trim();
  if (fromResult && fromResult !== "—" && fromResult !== "-") {
    return parseLeadingNumber(fromResult);
  }
  return null;
}

function sleepDebtMinutes(analysis: StoredAnalysis): number | null {
  const text = metricDurationText(analysis, "sleepDebt");
  if (!text) return null;
  return parseDurationMinutes(text);
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

function hrvValue(analysis: StoredAnalysis): number | null {
  const fromMetrics = String(analysis.metrics.hrv ?? "").trim();
  if (fromMetrics && fromMetrics !== "—" && fromMetrics !== "-") {
    return parseLeadingNumber(fromMetrics);
  }
  const fromResult = String(analysis.result?.metrics?.hrv ?? "").trim();
  if (fromResult && fromResult !== "—" && fromResult !== "-") {
    return parseLeadingNumber(fromResult);
  }
  return null;
}

/**
 * 結果レポート用のコンパクトな前回比較。
 * 比較可能な指標が1つも無い場合は null。
 * 前回値が欠損の指標は行ごと非表示（現在値を差分として出さない）。
 */
export function buildPreviousComparisonSummary(
  previous: StoredAnalysis,
  current: StoredAnalysis,
): PreviousComparisonSummary | null {
  const items: PreviousComparisonItem[] = [];

  const wellnessTrend = resolveComparison(
    wellnessScoreOf(previous),
    wellnessScoreOf(current),
    "higherIsBetter",
  );
  if (wellnessTrend) {
    items.push({
      label: "Sleep Wellness Score",
      value: `${comparisonArrow(wellnessTrend.delta)}${formatSignedScore(wellnessTrend.delta)}`,
      tone: wellnessTrend.tone,
    });
  }

  const scoreTrend = resolveComparison(
    sleepScoreOf(previous),
    sleepScoreOf(current),
    "higherIsBetter",
  );
  if (scoreTrend) {
    const rounded = Math.round(scoreTrend.delta);
    const deltaText =
      rounded > 0 ? `+${rounded}` : rounded < 0 ? String(rounded) : "±0";
    items.push({
      label: "睡眠スコア",
      value: `${comparisonArrow(scoreTrend.delta)}${deltaText}`,
      tone: scoreTrend.tone,
    });
  }

  const efficiencyTrend = resolveComparison(
    sleepEfficiencyPercent(previous),
    sleepEfficiencyPercent(current),
    "higherIsBetter",
  );
  if (efficiencyTrend) {
    items.push({
      label: "睡眠効率",
      value: `${comparisonArrow(efficiencyTrend.delta)}${formatSignedPercent(efficiencyTrend.delta)}`,
      tone: efficiencyTrend.tone,
    });
  }

  const hrvTrend = resolveComparison(
    hrvValue(previous),
    hrvValue(current),
    "higherIsBetter",
  );
  if (hrvTrend) {
    const rounded = Math.round(hrvTrend.delta * 10) / 10;
    const deltaText =
      rounded > 0 ? `+${rounded}` : rounded < 0 ? String(rounded) : "±0";
    items.push({
      label: "HRV",
      value: `${comparisonArrow(hrvTrend.delta)}${deltaText}`,
      tone: hrvTrend.tone,
    });
  }

  const prevDeep = deepSleepMinutes(previous);
  const currDeep = deepSleepMinutes(current);
  if (process.env.NODE_ENV === "development") {
    console.debug("[previous-comparison] deepSleep", {
      previousDate: previous.analysisDate,
      previousRaw: metricDurationText(previous, "deepSleep") || null,
      currentRaw: metricDurationText(current, "deepSleep") || null,
      previousMinutes: prevDeep,
      currentMinutes: currDeep,
      delta:
        prevDeep != null && currDeep != null ? currDeep - prevDeep : null,
    });
  }
  const deepTrend = resolveComparison(prevDeep, currDeep, "higherIsBetter");
  if (deepTrend) {
    items.push({
      label: "深い睡眠",
      value: `${comparisonArrow(deepTrend.delta)}${formatSignedMinutes(deepTrend.delta)}`,
      tone: deepTrend.tone,
    });
  }

  const stressTrend = resolveComparison(
    stressValue(previous),
    stressValue(current),
    "higherIsWorse",
  );
  if (stressTrend) {
    const rounded = Math.round(stressTrend.delta * 10) / 10;
    const deltaText =
      rounded > 0 ? `+${rounded}` : rounded < 0 ? String(rounded) : "±0";
    items.push({
      label: "ストレス",
      value: `${comparisonArrow(stressTrend.delta)}${deltaText}`,
      tone: stressTrend.tone,
    });
  }

  const debtTrend = resolveComparison(
    sleepDebtMinutes(previous),
    sleepDebtMinutes(current),
    "higherIsWorse",
  );
  if (debtTrend) {
    const changeWord =
      debtTrend.delta > 0
        ? "増加"
        : debtTrend.delta < 0
          ? "減少"
          : "変化なし";
    items.push({
      label: "睡眠負債",
      value: `${comparisonArrow(debtTrend.delta)}${changeWord}`,
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
  if (tone === "improved") return "#2563eb";
  if (tone === "worsened") return "#dc2626";
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
  const text = metricDurationText(analysis, "sleepDuration");
  if (!text) return null;
  return parseDurationMinutes(text);
}

function sleepEfficiencyPercent(analysis: StoredAnalysis): number | null {
  const raw = analysis.metrics.sleepEfficiency;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const fromMetrics = String(raw ?? "").trim();
  if (fromMetrics && fromMetrics !== "—" && fromMetrics !== "-") {
    return parseLeadingNumber(fromMetrics);
  }
  const fromResult = analysis.result?.metrics?.sleepEfficiency;
  if (typeof fromResult === "number" && Number.isFinite(fromResult)) {
    return fromResult;
  }
  const fromResultText = String(fromResult ?? "").trim();
  if (fromResultText && fromResultText !== "—" && fromResultText !== "-") {
    return parseLeadingNumber(fromResultText);
  }
  return null;
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

  const scoreTrend = resolveComparison(
    wellnessScoreOf(previous),
    wellnessScoreOf(current),
    "higherIsBetter",
  );
  if (scoreTrend) {
    items.push({
      label: "Sleep Wellness Score",
      value: `${comparisonArrow(scoreTrend.delta)}${formatSignedScore(scoreTrend.delta)}`,
      tone: scoreTrend.tone,
    });
  }

  const efficiencyTrend = resolveComparison(
    sleepEfficiencyPercent(previous),
    sleepEfficiencyPercent(current),
    "higherIsBetter",
  );
  if (efficiencyTrend) {
    items.push({
      label: "睡眠効率",
      value: `${comparisonArrow(efficiencyTrend.delta)}${formatSignedPercent(efficiencyTrend.delta)}`,
      tone: efficiencyTrend.tone,
    });
  }

  const durationTrend = resolveComparison(
    sleepDurationMinutes(previous),
    sleepDurationMinutes(current),
    "higherIsBetter",
  );
  if (durationTrend) {
    items.push({
      label: "睡眠時間",
      value: `${comparisonArrow(durationTrend.delta)}${formatSignedMinutes(durationTrend.delta)}`,
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
