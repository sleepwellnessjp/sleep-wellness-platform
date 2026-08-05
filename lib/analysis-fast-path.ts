/**
 * Score-first 高速パス。
 * 「AI分析開始」直後に Sleep Wellness Score を確定表示し、
 * AIカルテ・宿題・コメントは後段で非同期マージする。
 */

import {
  ouraLifestyleForRules,
} from "@/lib/oura-analysis-input";
import {
  aiInputFromMetricsAndLifestyle,
  evaluateAllItems,
  generateGoodPoints,
  generateImprovementItems,
  generateRuleBasedAiSleepAnalysis,
  toInstructorCounseling,
  type AiAnalysisItem,
  type AiSleepAnalysisInput,
} from "@/lib/ai-analysis";
import {
  WELLNESS_CATEGORY_LABELS,
  mergeInstructorCounseling,
  normalizeAnalysisResult,
  normalizeCategoryScores,
  normalizeScoreBreakdown,
  type AnalysisRequest,
  type AnalysisResult,
  type CategoryScoreRationales,
  type ScoreBreakdown,
  type ScoreStars,
  type WellnessCategoryKey,
  type WellnessCategoryScores,
} from "@/lib/analysis-session";
import { emptyGraphBundle } from "@/lib/soxai-graphs";
import { normalizeMetrics, type AnalysisMetrics } from "@/lib/soxai-metrics";

export type AnalysisContentStatus = "pending" | "ready" | "error";

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const CATEGORY_KEYS = Object.keys(
  WELLNESS_CATEGORY_LABELS,
) as WellnessCategoryKey[];

/**
 * 説明文中の点数を、画面表示用の確定スコアへ強制整合する。
 * AI が独自に付けた点数表記を表示点数に置き換える。
 */
export function alignScoreNarrativesToLocked(args: {
  scoreComment: string;
  categoryScoreRationales?: CategoryScoreRationales;
  lockedScore: number;
  lockedCategories: WellnessCategoryScores;
}): {
  scoreComment: string;
  categoryScoreRationales?: CategoryScoreRationales;
} {
  const score = clamp100(args.lockedScore);
  const cats = args.lockedCategories;

  const alignCategoryMention = (text: string, label: string, value: number) =>
    text.replace(
      new RegExp(`${label}\\s*[はが：:・]?\\s*\\d{1,3}\\s*(?:点|/\\s*100)`, "g"),
      `${label}${value}点`,
    );

  let scoreComment = (args.scoreComment || "").trim();
  if (scoreComment) {
    scoreComment = scoreComment
      .replace(
        /(?:Sleep\s*Wellness\s*Score|睡眠ウェルネススコア|ウェルネススコア|総合(?:スコア|点)|スコア)\s*[はが：:]?\s*\d{1,3}\s*点/gi,
        `Sleep Wellness Score は${score}点`,
      )
      .replace(
        /(?:Sleep\s*Wellness\s*Score|睡眠ウェルネススコア)\s*[：:]?\s*\d{1,3}(?!\s*\/)/gi,
        `Sleep Wellness Score ${score}`,
      );
    for (const key of CATEGORY_KEYS) {
      scoreComment = alignCategoryMention(
        scoreComment,
        WELLNESS_CATEGORY_LABELS[key],
        cats[key],
      );
    }
    if (
      !new RegExp(`(?:Score|スコア|点).*${score}|${score}\\s*点`).test(
        scoreComment,
      )
    ) {
      scoreComment = `Sleep Wellness Score は${score}点。${scoreComment}`;
    }
  }

  const rawRationales = args.categoryScoreRationales;
  if (!rawRationales) {
    return { scoreComment, categoryScoreRationales: undefined };
  }

  const categoryScoreRationales = CATEGORY_KEYS.reduce((acc, key) => {
    const label = WELLNESS_CATEGORY_LABELS[key];
    const value = cats[key];
    let text = (rawRationales[key] || "").trim();
    if (!text) {
      acc[key] = `${label}${value}点。今回のデータに基づく参考評価です。`;
      return acc;
    }
    text = alignCategoryMention(text, label, value);
    text = text.replace(/^\d{1,3}\s*(?:点|\/\s*100)/, `${value}点`);
    if (
      !text.includes(`${value}点`) &&
      !text.includes(`${value}/100`) &&
      !new RegExp(`${label}\\s*${value}\\b`).test(text)
    ) {
      text = `${label}${value}点。${text}`;
    }
    acc[key] = text;
    return acc;
  }, {} as CategoryScoreRationales);

  return { scoreComment, categoryScoreRationales };
}

function starsFromNormalized(value: number | null | undefined): ScoreStars {
  if (value == null || !Number.isFinite(value)) return 3;
  if (value >= 90) return 5;
  if (value >= 75) return 4;
  if (value >= 55) return 3;
  if (value >= 40) return 2;
  return 1;
}

function averageNormalized(
  items: AiAnalysisItem[],
  keys: AiAnalysisItem["key"][],
): number | null {
  const values = keys
    .map((key) => items.find((item) => item.key === key)?.normalizedScore)
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildScoreBreakdownFromItems(
  items: AiAnalysisItem[],
  score: number,
): ScoreBreakdown {
  const byKey = (key: AiAnalysisItem["key"]) =>
    starsFromNormalized(items.find((item) => item.key === key)?.normalizedScore);

  const fallback = starsFromNormalized(score);
  return normalizeScoreBreakdown(
    {
      sleepDuration: byKey("sleepDuration") || fallback,
      sleepEfficiency: byKey("sleepEfficiency") || fallback,
      deepSleep: byKey("deepSleep") || fallback,
      hrv: byKey("hrv") || fallback,
      stress: byKey("stress") || fallback,
      spo2: byKey("spo2") || fallback,
      recovery: byKey("hrv") || byKey("restingHeartRate") || fallback,
    },
    score,
  );
}

export function buildCategoryScoresFromItems(
  items: AiAnalysisItem[],
  score: number,
  breakdown: ScoreBreakdown,
): WellnessCategoryScores {
  const body =
    averageNormalized(items, [
      "sleepDuration",
      "sleepEfficiency",
      "deepSleep",
      "remSleep",
      "awakenings",
      "restingHeartRate",
      "spo2",
      "sleepDebt",
      "sleepLatency",
    ]) ?? score;
  const mind =
    averageNormalized(items, [
      "hrv",
      "stress",
      "skinTemperature",
      "respiratoryRate",
    ]) ?? score;
  const lifestyle =
    averageNormalized(items, [
      "meals",
      "alcohol",
      "caffeine",
      "exercise",
      "bathing",
    ]) ?? score;
  const environment =
    averageNormalized(items, ["circadianRhythm", "preBedBehavior"]) ?? score;

  return normalizeCategoryScores(
    {
      body: clamp100(body),
      mind: clamp100(mind),
      lifestyle: clamp100(lifestyle),
      environment: clamp100(environment),
    },
    score,
    breakdown,
  );
}

function lifestyleForRules(
  lifestyle: AnalysisRequest["lifestyle"],
  inputSource?: AnalysisRequest["inputSource"],
): AiSleepAnalysisInput["lifestyle"] {
  if (inputSource === "oura") {
    return ouraLifestyleForRules(lifestyle);
  }
  const caffeineParts = [
    lifestyle.caffeine,
    lifestyle.caffeineDone,
    lifestyle.caffeineType,
    lifestyle.caffeineAmount,
    lifestyle.caffeineTime,
    lifestyle.caffeineNotes,
  ]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  const alcoholParts = [
    lifestyle.alcohol,
    lifestyle.alcoholDrank,
    lifestyle.alcoholType,
    lifestyle.alcoholAmount,
    lifestyle.alcoholEndTime,
    lifestyle.alcoholNotes,
  ]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  const dinnerParts = [
    lifestyle.dinnerContent,
    lifestyle.dinnerTime,
    lifestyle.dinnerEaten,
  ]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);
  const preBedParts = [
    lifestyle.condition,
    lifestyle.notes,
    lifestyle.stress,
  ]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);

  return {
    breakfast: lifestyle.breakfastContent || lifestyle.breakfastEaten || null,
    lunch: lifestyle.lunchContent || lifestyle.lunchEaten || null,
    dinner: dinnerParts.join(" ") || null,
    alcohol: alcoholParts.join(" ") || null,
    caffeine: caffeineParts.join(" ") || null,
    exercise:
      lifestyle.exercise ||
      lifestyle.yoga ||
      lifestyle.pilates ||
      lifestyle.otherExerciseName ||
      null,
    bathing: lifestyle.bathing || null,
    preBedBehavior: preBedParts.join(" ") || null,
    notes: lifestyle.notes || null,
  };
}

/**
 * 確認済みメトリクスから即時 Score を算出する（OpenAI 非依存）。
 */
export function computeFastSleepWellnessScore(args: {
  metrics: AnalysisMetrics;
  lifestyle: AnalysisRequest["lifestyle"];
  inputSource?: AnalysisRequest["inputSource"];
}): {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  categoryScores: WellnessCategoryScores;
  items: AiAnalysisItem[];
} {
  const input = aiInputFromMetricsAndLifestyle({
    clientName: args.lifestyle.clientName,
    measurementDate: args.lifestyle.measurementDate,
    metrics: args.metrics,
    lifestyle: lifestyleForRules(args.lifestyle, args.inputSource),
  });
  const items = evaluateAllItems(input);
  const ruleOutput = generateRuleBasedAiSleepAnalysis(input);
  const score = clamp100(ruleOutput.wellnessScore);
  const scoreBreakdown = buildScoreBreakdownFromItems(items, score);
  const categoryScores = buildCategoryScoresFromItems(
    items,
    score,
    scoreBreakdown,
  );
  return { score, scoreBreakdown, categoryScores, items };
}

/**
 * Score 先行の暫定 AnalysisResult。
 * AI本文（カルテ・宿題・コメント等）は空／pending のまま結果画面へ渡す。
 */
export function buildScoreFirstAnalysisResult(
  request: AnalysisRequest,
): AnalysisResult {
  const metrics = normalizeMetrics(
    request.metrics ?? request.extractedMetrics ?? {},
  );

  // 確認画面確定値をそのまま結果へ渡す（計算・推測・再取得・merge禁止）
  const confirmed = request.metrics;
  if (confirmed) {
    const sleepDuration = String(confirmed.sleepDuration ?? "").trim();
    if (sleepDuration) {
      metrics.sleepDuration = sleepDuration;
    }
    const hrv = String(confirmed.hrv ?? "").trim();
    if (hrv) {
      metrics.hrv = hrv;
    }
  }

  const { score, scoreBreakdown, categoryScores, items } =
    computeFastSleepWellnessScore({
      metrics,
      lifestyle: request.lifestyle,
      inputSource: request.inputSource,
    });

  const ruleInput = aiInputFromMetricsAndLifestyle({
    clientName: request.lifestyle.clientName,
    measurementDate: request.lifestyle.measurementDate,
    metrics,
    lifestyle: lifestyleForRules(request.lifestyle, request.inputSource),
  });
  const ruleOutput = generateRuleBasedAiSleepAnalysis(ruleInput);
  const instructorCounseling = toInstructorCounseling(ruleOutput, ruleInput);

  const hasAgeGender =
    Boolean(request.lifestyle.age?.trim()) &&
    Boolean(request.lifestyle.gender?.trim());

  const result = normalizeAnalysisResult({
    summary: "",
    karteSummary: "",
    goodPoints: generateGoodPoints(items),
    improvements: generateImprovementItems(items),
    profileRelation: "",
    scoreComment: "",
    todaysRecommendations: [],
    nextComparisonPoints: [],
    recommendationsUntilNext: [],
    instructorSuggestions: [],
    instructorCounseling,
    score,
    scoreBreakdown,
    categoryScores,
    metrics,
    graphs: request.graphs ?? emptyGraphBundle(),
    extractedMetrics: request.extractedMetrics
      ? normalizeMetrics(request.extractedMetrics)
      : undefined,
    caution: hasAgeGender
      ? "単日データに基づく参考評価です。数日〜2週間の推移もあわせてご確認ください。"
      : "年齢・性別を考慮していない参考分析です。単日データのため数日〜2週間の推移もあわせてご確認ください。",
    disclaimer:
      "本レポートは睡眠ウェルネス支援であり、医療診断・治療を代替するものではありません。",
    ocrConfidence: request.ocrConfidence,
    contentStatus: "pending",
    inputSource: request.inputSource,
    deviceSpecificMetrics: request.deviceSpecificMetrics,
    ouraScores: request.ouraScores,
    ouraVisionMetrics: request.ouraVisionMetrics,
    clientId: request.lifestyle.clientId,
    clientName: request.lifestyle.clientName,
    measurementDate: request.lifestyle.measurementDate,
    age: request.lifestyle.age,
    gender: request.lifestyle.gender,
    heightCm: request.lifestyle.heightCm,
    weightKg: request.lifestyle.weightKg,
    medications: request.lifestyle.medications,
    drinkingHabit: request.lifestyle.drinkingHabit,
    exerciseHabit: request.lifestyle.exerciseHabit,
    snoringNasal: request.lifestyle.snoringNasal,
    medicalHistory: request.lifestyle.medicalHistory,
  });

  // normalizeAnalysisResult 後も確認済み sleepDuration / hrv を再固定
  if (confirmed) {
    const sleepDuration = String(confirmed.sleepDuration ?? "").trim();
    if (sleepDuration) {
      result.metrics.sleepDuration = sleepDuration;
    }
    const hrv = String(confirmed.hrv ?? "").trim();
    if (hrv) {
      result.metrics.hrv = hrv;
    }
  }

  return result;
}

/**
 * AI分析結果を Score 先行結果へマージ。
 * Score / breakdown / category / metrics は先行確定値を維持する。
 * 説明文の点数表記も表示スコアへ強制整合する。
 */
export function mergeAiNarrativeIntoScoreFirstResult(
  preliminary: AnalysisResult,
  aiRaw: AnalysisResult,
): AnalysisResult {
  const ai = normalizeAnalysisResult(aiRaw);
  const aligned = alignScoreNarrativesToLocked({
    scoreComment: ai.scoreComment || preliminary.scoreComment,
    categoryScoreRationales:
      ai.categoryScoreRationales ?? preliminary.categoryScoreRationales,
    lockedScore: preliminary.score,
    lockedCategories: preliminary.categoryScores,
  });

  return normalizeAnalysisResult({
    ...preliminary,
    summary: ai.summary || preliminary.summary,
    karteSummary: ai.karteSummary || preliminary.karteSummary,
    // Good Points / 改善提案は metrics ルール確定を優先（GPT固定文で上書きしない）
    goodPoints:
      preliminary.goodPoints.length > 0
        ? preliminary.goodPoints
        : ai.goodPoints,
    improvements:
      preliminary.improvements.length > 0
        ? preliminary.improvements
        : ai.improvements,
    profileRelation: ai.profileRelation || preliminary.profileRelation,
    scoreComment: aligned.scoreComment,
    todaysRecommendations:
      ai.todaysRecommendations.length > 0
        ? ai.todaysRecommendations
        : preliminary.todaysRecommendations,
    nextComparisonPoints:
      ai.nextComparisonPoints.length > 0
        ? ai.nextComparisonPoints
        : preliminary.nextComparisonPoints,
    recommendationsUntilNext:
      ai.recommendationsUntilNext.length > 0
        ? ai.recommendationsUntilNext
        : preliminary.recommendationsUntilNext,
    instructorSuggestions:
      ai.instructorSuggestions.length > 0
        ? ai.instructorSuggestions
        : preliminary.instructorSuggestions,
    instructorCounseling: mergeInstructorCounseling(
      ai.instructorCounseling,
      preliminary.instructorCounseling,
    ),
    categoryScoreRationales: aligned.categoryScoreRationales,
    melatoninYogaPlan: ai.melatoninYogaPlan ?? preliminary.melatoninYogaPlan,
    comparisonNarrative:
      ai.comparisonNarrative ?? preliminary.comparisonNarrative,
    homeworkAchievement: ai.homeworkAchievement,
    // Score 系は先行表示値をロック（画面ジャンプ防止）
    score: preliminary.score,
    scoreBreakdown: preliminary.scoreBreakdown,
    categoryScores: preliminary.categoryScores,
    metrics: preliminary.metrics,
    graphs: preliminary.graphs ?? ai.graphs,
    extractedMetrics: preliminary.extractedMetrics ?? ai.extractedMetrics,
    caution: ai.caution || preliminary.caution,
    disclaimer: ai.disclaimer || preliminary.disclaimer,
    ocrConfidence: preliminary.ocrConfidence ?? ai.ocrConfidence,
    contentStatus: "ready",
    analysisId: preliminary.analysisId ?? ai.analysisId,
    clientId: preliminary.clientId ?? ai.clientId,
    clientName: preliminary.clientName ?? ai.clientName,
    measurementDate: preliminary.measurementDate ?? ai.measurementDate,
    inputSource: preliminary.inputSource ?? ai.inputSource,
    deviceSpecificMetrics:
      preliminary.deviceSpecificMetrics ?? ai.deviceSpecificMetrics,
    ouraScores: preliminary.ouraScores ?? ai.ouraScores,
    ouraVisionMetrics:
      preliminary.ouraVisionMetrics ?? ai.ouraVisionMetrics,
  });
}
