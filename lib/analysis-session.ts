import {
  collectedMetricKeys,
  emptyMetrics,
  normalizeMetrics,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import {
  emptyGraphBundle,
  graphPanelCount,
  type SoxaiGraphBundle,
} from "@/lib/soxai-graphs";
import {
  mergeMetricsFromVisibleReadings,
  normalizeVisibleReadings,
} from "@/lib/soxai-reading-map";
import type { MetricConfidenceMap } from "@/lib/soxai-merge";
import type {
  AnalysisDayContext,
  ClientProfileSections,
} from "@/lib/client-profiles/types";
import type { AnalysisAiInput } from "@/lib/client-profiles/ai-input";
import {
  improvementTexts,
  normalizeImprovements,
  type ImprovementItem,
} from "@/lib/improvement-priority";

export type { AnalysisMetrics };
export type { SoxaiGraphBundle };
export type { MetricConfidenceMap };
export type { ImprovementItem };
export { normalizeMetrics };
export {
  formatImprovementStars,
  improvementPriorityLabel,
  normalizeImprovements,
  improvementTexts,
} from "@/lib/improvement-priority";

type LifestyleData = {
  /** 既存クライアントから開始した場合の ID（Supabase / ローカル保存用） */
  clientId?: string;
  clientName: string;
  measurementDate: string;
  /** クライアント基本情報 */
  age?: string;
  gender?: string;
  heightCm?: string;
  weightKg?: string;
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  snoringNasal?: string;
  medicalHistory?: string;
  bedtime: string;
  wakeTime: string;
  exercise: string;
  yoga: string;
  yogaDone?: string;
  yogaDuration?: string;
  yogaTime?: string;
  yogaNotes?: string;
  pilates?: string;
  pilatesDone?: string;
  pilatesDuration?: string;
  pilatesTime?: string;
  pilatesNotes?: string;
  otherExerciseDone?: string;
  otherExerciseName?: string;
  otherExerciseDuration?: string;
  otherExerciseTime?: string;
  otherExerciseNotes?: string;
  bathing: string;
  alcohol: string;
  alcoholDrank: string;
  alcoholType: string;
  alcoholAmount: string;
  alcoholEndTime: string;
  alcoholNotes: string;
  caffeine: string;
  caffeineDone?: string;
  caffeineType?: string;
  caffeineAmount?: string;
  caffeineTime?: string;
  caffeineNotes?: string;
  stress: string;
  meals: string;
  breakfastEaten?: string;
  breakfastTime: string;
  breakfastContent: string;
  lunchEaten?: string;
  lunchTime: string;
  lunchContent: string;
  dinnerEaten?: string;
  dinnerTime: string;
  dinnerContent: string;
  work: string;
  condition: string;
  nasalCongestion: string;
  notes: string;
};

export type AnalysisRequest = {
  lifestyle: LifestyleData;
  images: string[];
  /** 確認画面で確定したメトリクス（画像優先＋不足分の手入力） */
  metrics?: AnalysisMetrics;
  /** OCR生データ（確認前）。保存用 */
  extractedMetrics?: AnalysisMetrics;
  /** OCRで抽出したグラフデータ（Visual Report 用） */
  graphs?: SoxaiGraphBundle;
  /** 項目別 OCR 信頼度 0–1 */
  ocrConfidence?: MetricConfidenceMap;
  /**
   * 選択クライアントの固定プロフィール（client_profiles）
   * 当日情報と混在させない。未選択時は undefined
   */
  fixedProfile?: ClientProfileSections;
  /**
   * 分析日ごとの当日情報（将来フォーム用。今回は通常未設定）
   */
  dayContext?: AnalysisDayContext;
  /**
   * AI分析用の構造化入力（SOXAI + 当日 + 固定プロフィール）
   * Medical / Visual / PDF が同じ分析結果を使うための準備
   */
  aiInput?: AnalysisAiInput;
};

/** 複数画像で同一項目に異なる値があった場合の競合情報 */
export type MetricConflict = {
  key: MetricFieldKey;
  label: string;
  adopted: string;
  alternatives: string[];
};

/** 入力 → 画像抽出確認までの下書き */
export type ExtractionDraft = {
  lifestyle: LifestyleData;
  images: string[];
  extractedMetrics: AnalysisMetrics;
  /** 画像から取得できたキー */
  imageKeys: MetricFieldKey[];
  /** 複数画像間で値が食い違った項目 */
  conflicts?: MetricConflict[];
  /** 項目別 OCR 信頼度 0–1 */
  ocrConfidence?: MetricConfidenceMap;
  /** OCRで抽出したグラフ（Visual / PDF 共通） */
  graphs: SoxaiGraphBundle;
  /** 選択クライアントの固定プロフィール（あれば） */
  fixedProfile?: ClientProfileSections;
  /** 当日情報（将来用。今回は通常未設定） */
  dayContext?: AnalysisDayContext;
};

/** 1〜5の星評価。Score 内訳用 */
export type ScoreStars = 1 | 2 | 3 | 4 | 5;

export type ScoreBreakdown = {
  sleepDuration: ScoreStars;
  sleepEfficiency: ScoreStars;
  deepSleep: ScoreStars;
  hrv: ScoreStars;
  stress: ScoreStars;
  spo2: ScoreStars;
  recovery: ScoreStars;
};

/**
 * Sleep Wellness Platform 独自のカテゴリースコア（各 0〜100）。
 * SOXAI 睡眠スコアとは別指標。総合の睡眠ウェルネススコアを4軸で可視化する。
 */
export type WellnessCategoryScores = {
  /** 身体：睡眠ステージ・回復・SpO₂・運動・健康など */
  body: number;
  /** 心：HRV・ストレス・自律神経など */
  mind: number;
  /** 生活：飲酒・カフェイン・食事・勤務リズム・運動タイミングなど */
  lifestyle: number;
  /** 環境：寝室・室温湿度・寝具・職場環境など */
  environment: number;
};

export const WELLNESS_CATEGORY_LABELS = {
  body: "身体",
  mind: "心",
  lifestyle: "生活",
  environment: "環境",
} as const satisfies Record<keyof WellnessCategoryScores, string>;

export type WellnessCategoryKey = keyof WellnessCategoryScores;

/** 睡眠へ影響している要因ランキング（推定・断定ではない） */
export type SleepFactorRankingItem = {
  /** 短い要因名（例: 飲酒、勤務時間、睡眠負債） */
  factor: string;
  /** 今回の睡眠への影響度の可能性（1〜5） */
  stars: ScoreStars;
};

/**
 * 改善効果予測（Wellness Score への予測インパクト）。
 * 絶対値ではなく予測レンジ。生活改善の参考であり医療診断ではない。
 */
export type ImprovementEffectPrediction = {
  /** 短い改善アクション（例: 飲酒量を減らす、鼻づまり改善） */
  action: string;
  /** 予測レンジ下限（点） */
  minPoints: number;
  /** 予測レンジ上限（点）。必ず minPoints より大きい */
  maxPoints: number;
};

/** ⑧AI宿題（次回までの行動目標）。チェック状態を次回比較に使う */
export type NextActionGoal = {
  id: string;
  text: string;
  checked: boolean;
};

/** AI宿題の達成率スナップショット（カルテ・次回比較用） */
export type HomeworkAchievement = {
  /** 達成件数 */
  checked: number;
  /** 目標件数（3〜5） */
  total: number;
  /** 0〜100（整数）。total が 0 のときは 0 */
  rate: number;
};

export type AnalysisResult = {
  /** ③総合評価（短段落・100〜200文字）。必ず良かった点から書き始める */
  summary: string;
  /**
   * Sleep Wellness Institute Japan 独自 AIカルテ（クライアントの変化・100〜200文字）。
   * 分析履歴に時系列保存する。summary（今回評価）とは別役割。
   */
  karteSummary: string;
  /** ①今回の睡眠で良かった点（2〜4件の短文）。必須・省略禁止 */
  goodPoints: string[];
  /** ②改善が期待できるポイント（重要度順・最大5件） */
  improvements: ImprovementItem[];
  /** ④プロフィールとの関連（短段落。普段の傾向と今回データのつながり） */
  profileRelation: string;
  /**
   * ⑤睡眠ウェルネススコアの解説（短段落）。
   * 数値そのものは score / categoryScores で保持。
   */
  scoreComment: string;
  /**
   * ⑥今日のおすすめ（必ず3件・優先順位順）。
   * 今日実践できる短文アクションのみ。
   */
  todaysRecommendations: string[];
  /** ⑦次回比較ポイント（2〜4件。次回分析で見るべき観点） */
  nextComparisonPoints: string[];
  /**
   * ⑧AI宿題（次回までの行動目標・3〜5件）。
   * 認定講師がチェック・編集でき、達成率とともにカルテへ保存し、次回分析時に比較表示する。
   */
  recommendationsUntilNext: NextActionGoal[];
  /**
   * AI宿題の達成率。goals のチェックから算出して保存する。
   * 未設定時は normalize 時に goals から再計算する。
   */
  homeworkAchievement?: HomeworkAchievement;
  /** Sleep Wellness Platform 独自の総合スコア（0〜100）。SOXAI睡眠スコアとは別 */
  score: number;
  scoreBreakdown: ScoreBreakdown;
  /** 身体 / 心 / 生活 / 環境（各 0〜100）。レーダーチャート用 */
  categoryScores: WellnessCategoryScores;
  metrics: AnalysisMetrics;
  /** OCRグラフ（Medical / Visual / PDF 共通） */
  graphs?: SoxaiGraphBundle;
  /** OCR抽出時点の値（保存・履歴用。分析本文には使わない） */
  extractedMetrics?: AnalysisMetrics;
  caution: string;
  disclaimer: string;
  clientId?: string;
  clientName?: string;
  measurementDate?: string;
  /** クライアント基本情報（Medical Report 用） */
  age?: string;
  gender?: string;
  heightCm?: string;
  weightKg?: string;
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  snoringNasal?: string;
  medicalHistory?: string;
  /** 保存済み分析の再表示用 ID */
  analysisId?: string;
  /** 項目別 OCR 信頼度（保存用） */
  ocrConfidence?: MetricConfidenceMap;
  /** @deprecated 旧スキーマ互換 → 本文には使わない */
  sleepAnalysis?: string;
  /** @deprecated 旧スキーマ互換 */
  autonomicAssessment?: string;
  /** @deprecated 旧スキーマ互換 */
  recoveryAssessment?: string;
  /** @deprecated 旧スキーマ互換 */
  evidenceTitle?: string;
  /** @deprecated 旧スキーマ互換 */
  evidence?: string[];
  /** @deprecated 旧スキーマ互換 */
  sleepFactorRanking?: SleepFactorRankingItem[];
  /** @deprecated 旧スキーマ互換 */
  improvementEffectPredictions?: ImprovementEffectPrediction[];
  /** @deprecated 旧スキーマ互換 */
  melatoninYoga?: string;
  /** @deprecated 旧スキーマ互換 → sleepAnalysis */
  sleepCharacteristics?: string;
  /** @deprecated 旧スキーマ互換 */
  actionPlan?: string[];
  /** @deprecated 旧スキーマ互換 → sleepAnalysis */
  dataInsight?: string;
  /** @deprecated 旧スキーマ互換 → profileRelation */
  lifestyleRelation?: string;
  /** @deprecated 旧スキーマ互換 → nextComparisonPoints */
  tomorrowPlan?: string[];
};

const RESULT_KEY = "swij-analysis-result";
const IMAGES_KEY = "swij-analysis-images";
const GRAPHS_KEY = "swij-analysis-graphs";
const MAX_STORED_IMAGES = 10;

let pendingRequest: AnalysisRequest | null = null;
let extractionDraft: ExtractionDraft | null = null;
let inFlightAnalysis: Promise<AnalysisResult> | null = null;

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function clampStars(value: unknown, fallback: ScoreStars): ScoreStars {
  const n = typeof value === "number" ? Math.round(value) : fallback;
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 5;
}

function starsFromOverall(score: number): ScoreStars {
  if (score >= 90) return 5;
  if (score >= 78) return 4;
  if (score >= 62) return 3;
  if (score >= 45) return 2;
  return 1;
}

export function normalizeScoreBreakdown(
  breakdown: Partial<ScoreBreakdown> | undefined,
  score: number,
): ScoreBreakdown {
  const base = starsFromOverall(score);
  return {
    sleepDuration: clampStars(breakdown?.sleepDuration, base),
    sleepEfficiency: clampStars(breakdown?.sleepEfficiency, base),
    deepSleep: clampStars(breakdown?.deepSleep, base),
    hrv: clampStars(breakdown?.hrv, base),
    stress: clampStars(breakdown?.stress, base),
    spo2: clampStars(breakdown?.spo2, base),
    recovery: clampStars(breakdown?.recovery, base),
  };
}

function clampScore100(value: unknown, fallback: number): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  return Math.max(0, Math.min(100, n));
}

function starsToScore100(stars: ScoreStars): number {
  return Math.round((stars / 5) * 100);
}

function averageScore100(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

/**
 * カテゴリースコアを正規化。未提供時は scoreBreakdown / 総合スコアから補完
 *（旧保存結果・デモデータ互換）。
 */
export function normalizeCategoryScores(
  raw: Partial<WellnessCategoryScores> | undefined,
  score: number,
  breakdown: ScoreBreakdown,
): WellnessCategoryScores {
  const fallbackBody = averageScore100([
    starsToScore100(breakdown.sleepDuration),
    starsToScore100(breakdown.sleepEfficiency),
    starsToScore100(breakdown.deepSleep),
    starsToScore100(breakdown.spo2),
    starsToScore100(breakdown.recovery),
  ]);
  const fallbackMind = averageScore100([
    starsToScore100(breakdown.hrv),
    starsToScore100(breakdown.stress),
    starsToScore100(breakdown.recovery),
  ]);

  return {
    body: clampScore100(raw?.body, fallbackBody || score),
    mind: clampScore100(raw?.mind, fallbackMind || score),
    lifestyle: clampScore100(raw?.lifestyle, score),
    environment: clampScore100(raw?.environment, score),
  };
}

function normalizeStringList(items: unknown, max: number): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

const RANKING_CIRCLED = ["①", "②", "③", "④", "⑤"] as const;

/** ★★★★☆ 形式（1〜5すべて表示） */
export function formatSleepFactorStars(stars: ScoreStars): string {
  const filled = Math.max(1, Math.min(5, Math.round(stars))) as ScoreStars;
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function formatSleepFactorRankingLine(
  item: SleepFactorRankingItem,
  index: number,
): string {
  const mark = RANKING_CIRCLED[index] ?? `${index + 1}.`;
  return `${mark}${item.factor} ${formatSleepFactorStars(item.stars)}`;
}

export function normalizeSleepFactorRanking(
  raw: unknown,
): SleepFactorRankingItem[] {
  if (!Array.isArray(raw)) return [];
  const items: SleepFactorRankingItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as { factor?: unknown; stars?: unknown };
    const factor = asString(record.factor).trim().slice(0, 40);
    if (!factor) continue;
    items.push({
      factor,
      stars: clampStars(record.stars, 3),
    });
    if (items.length >= 5) break;
  }
  return items;
}

function clampPointDelta(value: unknown, fallback: number): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  return Math.max(1, Math.min(30, n));
}

/** 「＋4〜8点」形式 */
export function formatImprovementEffectRange(
  item: ImprovementEffectPrediction,
): string {
  return `＋${item.minPoints}〜${item.maxPoints}点`;
}

export function normalizeImprovementEffectPredictions(
  raw: unknown,
): ImprovementEffectPrediction[] {
  if (!Array.isArray(raw)) return [];
  const items: ImprovementEffectPrediction[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as {
      action?: unknown;
      minPoints?: unknown;
      maxPoints?: unknown;
    };
    const action = asString(record.action).trim().slice(0, 40);
    if (!action) continue;
    const minPoints = clampPointDelta(record.minPoints, 2);
    let maxPoints = clampPointDelta(record.maxPoints, minPoints + 2);
    if (maxPoints <= minPoints) {
      maxPoints = Math.min(30, minPoints + 2);
    }
    items.push({ action, minPoints, maxPoints });
    if (items.length >= 5) break;
  }
  return items;
}

type LegacyAnalysisFields = {
  possibleFactors?: unknown;
  actions?: unknown;
  yoga?: unknown;
  closingSummary?: unknown;
  sleepAnalysis?: unknown;
  sleepCharacteristics?: unknown;
  autonomicAssessment?: unknown;
  recoveryAssessment?: unknown;
  actionPlan?: unknown;
  melatoninYoga?: unknown;
  goodPoints?: unknown;
  profileRelation?: unknown;
  lifestyleRelation?: unknown;
  scoreComment?: unknown;
  nextComparisonPoints?: unknown;
  tomorrowPlan?: unknown;
  evidence?: unknown;
  evidenceTitle?: unknown;
  sleepFactorRanking?: unknown;
  improvementEffectPredictions?: unknown;
  todaysRecommendations?: unknown;
  recommendationsUntilNext?: unknown;
  improvements?: unknown;
  karteSummary?: unknown;
  homeworkAchievement?: unknown;
  /** 旧フィールド互換 */
  achievementRate?: unknown;
};

function createNextActionGoalId(): string {
  try {
    return `goal-${crypto.randomUUID()}`;
  } catch {
    return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function trimActionGoalText(text: string): string {
  const cleaned = text
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[\.．、:：\s]*/, "")
    .trim();
  if (cleaned.length <= 60) return cleaned;
  return `${cleaned.slice(0, 59).trimEnd()}…`;
}

/** 次回までのおすすめ（3〜5件）を正規化。string[] / オブジェクト両対応 */
export function normalizeRecommendationsUntilNext(
  raw: unknown,
): NextActionGoal[] {
  if (!Array.isArray(raw)) return [];
  const items: NextActionGoal[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const text = trimActionGoalText(entry);
      if (!text) continue;
      items.push({
        id: createNextActionGoalId(),
        text,
        checked: false,
      });
    } else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const record = entry as {
        id?: unknown;
        text?: unknown;
        checked?: unknown;
      };
      const text = trimActionGoalText(asString(record.text));
      if (!text) continue;
      const id =
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : createNextActionGoalId();
      items.push({
        id,
        text,
        checked: record.checked === true,
      });
    }
    if (items.length >= 5) break;
  }
  return items;
}

/** AI宿題の達成率を goals から算出 */
export function computeHomeworkAchievement(
  goals: NextActionGoal[] | unknown,
): HomeworkAchievement {
  const list = normalizeRecommendationsUntilNext(goals);
  const total = list.length;
  const checked = list.filter((item) => item.checked).length;
  const rate =
    total > 0 ? Math.round((checked / total) * 100) : 0;
  return { checked, total, rate };
}

function normalizeHomeworkAchievement(
  raw: unknown,
  goals: NextActionGoal[],
): HomeworkAchievement {
  const fromGoals = computeHomeworkAchievement(goals);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    // 旧フィールド: achievementRate が number のみの場合
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return {
        ...fromGoals,
        rate: Math.max(0, Math.min(100, Math.round(raw))),
      };
    }
    return fromGoals;
  }
  const record = raw as {
    checked?: unknown;
    total?: unknown;
    rate?: unknown;
  };
  const total =
    typeof record.total === "number" && Number.isFinite(record.total)
      ? Math.max(0, Math.round(record.total))
      : fromGoals.total;
  const checked =
    typeof record.checked === "number" && Number.isFinite(record.checked)
      ? Math.max(0, Math.min(total, Math.round(record.checked)))
      : fromGoals.checked;
  const rate =
    typeof record.rate === "number" && Number.isFinite(record.rate)
      ? Math.max(0, Math.min(100, Math.round(record.rate)))
      : total > 0
        ? Math.round((checked / total) * 100)
        : 0;
  // goals があるときは常に最新チェックから再計算（保存ズレ防止）
  if (goals.length > 0) return fromGoals;
  return { checked, total, rate };
}

/** 総合評価を 100〜200 文字に整える（短すぎる場合はそのまま） */
function normalizeSummaryLength(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 200) return trimmed;
  // 文末付近で切る
  const slice = trimmed.slice(0, 200);
  const lastPunct = Math.max(
    slice.lastIndexOf("。"),
    slice.lastIndexOf("！"),
    slice.lastIndexOf("？"),
    slice.lastIndexOf("."),
  );
  if (lastPunct >= 100) return slice.slice(0, lastPunct + 1);
  return `${slice.trimEnd()}…`;
}

export function normalizeAnalysisResult(
  raw: Omit<AnalysisResult, "categoryScores" | "goodPoints"> & {
    categoryScores?: Partial<WellnessCategoryScores>;
    goodPoints?: string[];
  } & LegacyAnalysisFields,
  extras?: {
    clientId?: string;
    clientName?: string;
    measurementDate?: string;
    age?: string;
    gender?: string;
    heightCm?: string;
    weightKg?: string;
    medications?: string;
    drinkingHabit?: string;
    exerciseHabit?: string;
    snoringNasal?: string;
    medicalHistory?: string;
  },
): AnalysisResult {
  const score =
    typeof raw.score === "number" && Number.isFinite(raw.score)
      ? Math.max(0, Math.min(100, Math.round(raw.score)))
      : 0;

  const sleepAnalysis = (() => {
    if (typeof raw.sleepAnalysis === "string" && raw.sleepAnalysis.trim()) {
      return raw.sleepAnalysis.trim();
    }
    if (
      typeof raw.sleepCharacteristics === "string" &&
      raw.sleepCharacteristics.trim()
    ) {
      return raw.sleepCharacteristics.trim();
    }
    if (typeof raw.dataInsight === "string" && raw.dataInsight.trim()) {
      return raw.dataInsight.trim();
    }
    if (typeof raw.closingSummary === "string" && raw.closingSummary.trim()) {
      return raw.closingSummary.trim();
    }
    return "";
  })();

  const autonomicAssessment =
    typeof raw.autonomicAssessment === "string"
      ? raw.autonomicAssessment.trim()
      : "";

  const recoveryAssessment =
    typeof raw.recoveryAssessment === "string"
      ? raw.recoveryAssessment.trim()
      : "";

  const actionPlan = (() => {
    const plan = normalizeStringList(raw.actionPlan, 5);
    if (plan.length > 0) return plan;
    const legacy = normalizeStringList(raw.tomorrowPlan, 5);
    if (legacy.length > 0) return legacy;
    return normalizeStringList(raw.actions, 5);
  })();

  const melatoninYoga = (() => {
    if (typeof raw.melatoninYoga === "string" && raw.melatoninYoga.trim()) {
      return raw.melatoninYoga.trim();
    }
    if (typeof raw.yoga === "string" && raw.yoga.trim()) {
      return raw.yoga.trim();
    }
    return "";
  })();

  const improvements = (() => {
    const list = normalizeImprovements(raw.improvements, 5);
    if (list.length >= 1) return list;
    if (actionPlan.length > 0) {
      return normalizeImprovements(actionPlan, 5);
    }
    return [];
  })();
  const improvementTextList = improvementTexts(improvements);

  const goodPoints = (() => {
    const list = normalizeStringList(raw.goodPoints, 4);
    if (list.length > 0) return list;
    // 旧結果互換: evidence / sleepAnalysis から補完しにくいため空でも可
    return [];
  })();

  const profileRelation = (() => {
    if (typeof raw.profileRelation === "string" && raw.profileRelation.trim()) {
      return raw.profileRelation.trim();
    }
    if (
      typeof raw.lifestyleRelation === "string" &&
      raw.lifestyleRelation.trim()
    ) {
      return raw.lifestyleRelation.trim();
    }
    const factors = normalizeStringList(raw.possibleFactors, 3).join(" ");
    return factors;
  })();

  const scoreComment = (() => {
    if (typeof raw.scoreComment === "string" && raw.scoreComment.trim()) {
      return raw.scoreComment.trim();
    }
    return "";
  })();

  const nextComparisonPoints = (() => {
    const list = normalizeStringList(raw.nextComparisonPoints, 4);
    if (list.length > 0) return list;
    const fromTomorrow = normalizeStringList(raw.tomorrowPlan, 4);
    if (fromTomorrow.length > 0) return fromTomorrow;
    return improvementTextList.slice(0, 3);
  })();

  const evidence = normalizeStringList(raw.evidence, 6);
  const evidenceTitle = (() => {
    const title = asString(raw.evidenceTitle).trim();
    if (title) return title;
    if (evidence.length > 0) return "今回の睡眠に影響した可能性がある要因";
    return "";
  })();

  const sleepFactorRanking = (() => {
    const normalized = normalizeSleepFactorRanking(raw.sleepFactorRanking);
    if (normalized.length > 0) return normalized;
    return evidence.slice(0, 5).map((factor, index) => ({
      factor: factor.replace(/^(優先\d+[:：]\s*)/, "").slice(0, 40),
      stars: clampStars(5 - index, 3),
    }));
  })();

  const improvementEffectPredictions = normalizeImprovementEffectPredictions(
    raw.improvementEffectPredictions,
  );

  const todaysRecommendations = (() => {
    const list = normalizeStringList(raw.todaysRecommendations, 3)
      .map((item) =>
        item
          .replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[\.．、:：\s]*/, "")
          .trim(),
      )
      .map((item) =>
        item.length > 48 ? `${item.slice(0, 47).trimEnd()}…` : item,
      )
      .filter(Boolean);
    if (list.length >= 3) return list.slice(0, 3);
    const fromImprovements = improvementTextList
      .map((item) =>
        item.length > 48 ? `${item.slice(0, 47).trimEnd()}…` : item,
      )
      .filter(Boolean);
    return [...list, ...fromImprovements].slice(0, 3);
  })();

  const recommendationsUntilNext = (() => {
    const list = normalizeRecommendationsUntilNext(
      raw.recommendationsUntilNext,
    );
    if (list.length >= 3) return list.slice(0, 5);
    // 旧結果互換: 空のまま（今日のおすすめとは役割が異なるため補完しない）
    return list;
  })();

  const homeworkAchievement = normalizeHomeworkAchievement(
    raw.homeworkAchievement ?? raw.achievementRate,
    recommendationsUntilNext,
  );

  const summary = normalizeSummaryLength(
    typeof raw.summary === "string" ? raw.summary : "",
  );

  const karteSummary = normalizeSummaryLength(
    typeof raw.karteSummary === "string" ? raw.karteSummary : "",
  );

  const scoreBreakdown = normalizeScoreBreakdown(raw.scoreBreakdown, score);

  return {
    summary,
    karteSummary,
    goodPoints,
    improvements,
    profileRelation,
    scoreComment,
    todaysRecommendations,
    nextComparisonPoints,
    recommendationsUntilNext,
    homeworkAchievement,
    score,
    scoreBreakdown,
    categoryScores: normalizeCategoryScores(
      raw.categoryScores,
      score,
      scoreBreakdown,
    ),
    metrics: normalizeMetrics(raw.metrics),
    graphs: normalizeGraphBundle(raw.graphs ?? emptyGraphBundle()),
    extractedMetrics: raw.extractedMetrics
      ? normalizeMetrics(raw.extractedMetrics)
      : undefined,
    caution: typeof raw.caution === "string" ? raw.caution.trim() : "",
    disclaimer: typeof raw.disclaimer === "string" ? raw.disclaimer.trim() : "",
    clientId: extras?.clientId ?? raw.clientId,
    clientName: extras?.clientName ?? raw.clientName,
    measurementDate: extras?.measurementDate ?? raw.measurementDate,
    age: extras?.age ?? raw.age,
    gender: extras?.gender ?? raw.gender,
    heightCm: extras?.heightCm ?? raw.heightCm,
    weightKg: extras?.weightKg ?? raw.weightKg,
    medications: extras?.medications ?? raw.medications,
    drinkingHabit: extras?.drinkingHabit ?? raw.drinkingHabit,
    exerciseHabit: extras?.exerciseHabit ?? raw.exerciseHabit,
    snoringNasal: extras?.snoringNasal ?? raw.snoringNasal,
    medicalHistory: extras?.medicalHistory ?? raw.medicalHistory,
    analysisId: typeof raw.analysisId === "string" ? raw.analysisId : undefined,
    // 旧UI・保存互換
    sleepAnalysis,
    autonomicAssessment,
    recoveryAssessment,
    evidenceTitle,
    evidence,
    sleepFactorRanking,
    improvementEffectPredictions,
    melatoninYoga,
    sleepCharacteristics: sleepAnalysis,
    actionPlan:
      actionPlan.length > 0 ? actionPlan : improvementTextList.slice(0, 3),
    dataInsight: sleepAnalysis,
    lifestyleRelation: profileRelation,
    tomorrowPlan:
      nextComparisonPoints.length > 0
        ? nextComparisonPoints
        : actionPlan.length > 0
          ? actionPlan
          : improvementTextList.slice(0, 3),
  };
}

function storeImages(images: string[]) {
  const limited = images.slice(0, MAX_STORED_IMAGES);

  try {
    sessionStorage.setItem(IMAGES_KEY, JSON.stringify(limited));
  } catch {
    for (let count = limited.length - 1; count >= 1; count -= 1) {
      try {
        sessionStorage.setItem(
          IMAGES_KEY,
          JSON.stringify(limited.slice(0, count)),
        );
        return;
      } catch {
        // continue
      }
    }
    sessionStorage.removeItem(IMAGES_KEY);
  }
}

function normalizeGraphBundle(raw: unknown): SoxaiGraphBundle {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyGraphBundle();
  }
  return raw as SoxaiGraphBundle;
}

function storeGraphs(graphs: SoxaiGraphBundle) {
  try {
    sessionStorage.setItem(GRAPHS_KEY, JSON.stringify(graphs));
  } catch {
    sessionStorage.removeItem(GRAPHS_KEY);
  }
}

export function setExtractionDraft(draft: ExtractionDraft) {
  const extractedMetrics = normalizeMetrics(draft.extractedMetrics);
  extractionDraft = {
    ...draft,
    extractedMetrics,
    imageKeys: collectedMetricKeys(extractedMetrics),
    conflicts: draft.conflicts ? [...draft.conflicts] : [],
    ocrConfidence: draft.ocrConfidence
      ? { ...draft.ocrConfidence }
      : undefined,
    graphs: normalizeGraphBundle(draft.graphs),
    fixedProfile: draft.fixedProfile,
    dayContext: draft.dayContext,
  };
}

export function getExtractionDraft(): ExtractionDraft | null {
  return extractionDraft;
}

export function clearExtractionDraft() {
  extractionDraft = null;
}

export function setPendingAnalysisRequest(request: AnalysisRequest) {
  pendingRequest = {
    ...request,
    metrics: request.metrics
      ? normalizeMetrics(request.metrics)
      : undefined,
    extractedMetrics: request.extractedMetrics
      ? normalizeMetrics(request.extractedMetrics)
      : undefined,
    graphs: normalizeGraphBundle(request.graphs),
    ocrConfidence: request.ocrConfidence
      ? { ...request.ocrConfidence }
      : undefined,
    fixedProfile: request.fixedProfile,
    dayContext: request.dayContext,
    aiInput: request.aiInput,
  };
  inFlightAnalysis = null;
}

export class AnalysisError extends Error {
  status?: number;
  errorType?: string;
  details?: string;

  constructor(
    message: string,
    options?: { status?: number; errorType?: string; details?: string },
  ) {
    super(message);
    this.name = "AnalysisError";
    this.status = options?.status;
    this.errorType = options?.errorType;
    this.details = options?.details;
  }
}

/** 画面表示用。APIキー等の秘密情報は含めない */
export function formatExtractErrorMessage(err: unknown): string {
  if (err instanceof AnalysisError) {
    const type = err.errorType ?? "";
    if (
      type === "Config Error" ||
      err.message.includes("設定が完了していません")
    ) {
      return "画像解析APIの設定が完了していません。.env.local に OPENAI_API_KEY を設定し、開発サーバーを再起動してください。";
    }
    if (type === "Fetch Error") {
      return "画像の送信に失敗しました。ネットワーク接続を確認して、もう一度お試しください。";
    }
    if (type === "Validation Error") {
      return (
        err.message ||
        "画像形式が正しくありません。JPG / JPEG / PNG / WEBP で送信してください。"
      );
    }
    if (type === "JSON Parse Error") {
      return "画像解析結果のJSON解析に失敗しました。もう一度お試しください。";
    }
    if (type === "Empty Extraction") {
      return err.message;
    }
    if (type === "OpenAI Error") {
      return (
        err.message ||
        "画像解析サービスでエラーが発生しました。しばらくしてから再度お試しください。"
      );
    }
    return err.message || "画像の自動解析に失敗しました。";
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return "画像の自動解析に失敗しました。もう一度お試しください。";
}

export type ExtractSoxaiResult = {
  metrics: AnalysisMetrics;
  conflicts: MetricConflict[];
  graphs: SoxaiGraphBundle;
  confidence: MetricConfidenceMap;
};

export async function extractSoxaiMetrics(
  images: string[],
): Promise<AnalysisMetrics> {
  const result = await extractSoxaiMetricsDetailed(images);
  return result.metrics;
}

export async function extractSoxaiMetricsDetailed(
  images: string[],
): Promise<ExtractSoxaiResult> {
  if (!Array.isArray(images) || images.length === 0) {
    throw new AnalysisError("睡眠データ画像が不足しています。", {
      errorType: "Validation Error",
    });
  }

  const payloadBytes = images.reduce((sum, image) => sum + image.length, 0);
  console.info("[extract] sending images to /api/extract", {
    count: images.length,
    approxBytes: payloadBytes,
    mimeHints: images.map((image) => {
      const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
      return match?.[1] ?? "unknown";
    }),
  });

  let response: Response;
  try {
    response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });
  } catch (fetchError) {
    console.error("Extract fetch failed:", fetchError);
    throw new AnalysisError(
      "画像の送信に失敗しました。ネットワークエラーが発生しました。",
      {
        errorType: "Fetch Error",
        details:
          fetchError instanceof Error
            ? fetchError.message
            : String(fetchError),
      },
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error("Extract response JSON parse failed:", parseError, {
      status: response.status,
    });
    throw new AnalysisError(
      "画像解析結果のJSON解析に失敗しました。",
      {
        status: response.status,
        errorType: "JSON Parse Error",
        details:
          parseError instanceof Error
            ? parseError.message
            : String(parseError),
      },
    );
  }

  if (!response.ok) {
    const errorPayload =
      data && typeof data === "object"
        ? (data as {
            error?: unknown;
            errorType?: unknown;
            details?: unknown;
          })
        : {};

    const message =
      typeof errorPayload.error === "string"
        ? errorPayload.error
        : "画像の自動解析に失敗しました。";
    const errorType =
      typeof errorPayload.errorType === "string"
        ? errorPayload.errorType
        : "OpenAI Error";
    const details =
      typeof errorPayload.details === "string"
        ? errorPayload.details
        : undefined;

    console.error("Extract API error:", {
      status: response.status,
      errorType,
      message,
      details,
    });

    throw new AnalysisError(message, {
      status: response.status,
      errorType,
      details,
    });
  }

  const metricsRaw =
    data && typeof data === "object" && "metrics" in data
      ? (data as { metrics: Partial<AnalysisMetrics> }).metrics
      : (data as Partial<AnalysisMetrics>);

  if (!metricsRaw || typeof metricsRaw !== "object") {
    console.error("Extract API returned invalid metrics payload:", data);
    throw new AnalysisError(
      "画像解析結果の形式が不正です。もう一度お試しください。",
      { errorType: "JSON Parse Error", status: response.status },
    );
  }

  const visibleReadings = normalizeVisibleReadings(
    data && typeof data === "object" && "visibleReadings" in data
      ? (data as { visibleReadings: unknown }).visibleReadings
      : [],
  );

  // visibleReadings がある場合は必ず再マッピングして metrics に反映
  const normalized = mergeMetricsFromVisibleReadings(
    metricsRaw,
    visibleReadings,
  );
  const conflicts = normalizeExtractConflicts(
    data && typeof data === "object" && "conflicts" in data
      ? (data as { conflicts: unknown }).conflicts
      : undefined,
  );

  const graphs = normalizeGraphBundle(
    data && typeof data === "object" && "graphs" in data
      ? (data as { graphs: unknown }).graphs
      : emptyGraphBundle(),
  );

  const confidence = normalizeConfidenceMap(
    data && typeof data === "object" && "confidence" in data
      ? (data as { confidence: unknown }).confidence
      : undefined,
  );

  console.info("[extract] metrics received", {
    collected: collectedMetricKeys(normalized).length,
    keys: collectedMetricKeys(normalized),
    visibleReadingCount: visibleReadings.length,
    visibleLabels: visibleReadings.map((reading) => reading.label),
    graphPanelCount: graphPanelCount(graphs),
    conflicts: conflicts.length,
    critical: {
      bedtime: normalized.bedtime,
      wakeTime: normalized.wakeTime,
      skinTemperature: normalized.skinTemperature,
      stress: normalized.stress,
    },
  });

  return { metrics: normalized, conflicts, graphs, confidence };
}

function normalizeConfidenceMap(raw: unknown): MetricConfidenceMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: MetricConfidenceMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key as MetricFieldKey] = Math.min(1, Math.max(0, value));
    }
  }
  return out;
}

function normalizeExtractConflicts(raw: unknown): MetricConflict[] {
  if (!Array.isArray(raw)) return [];

  const labelByKey = new Map(
    SOXAI_METRIC_FIELDS.map((field) => [field.key, field.label] as const),
  );
  const validKeys = new Set(SOXAI_METRIC_FIELDS.map((field) => field.key));

  return raw
    .map((item): MetricConflict | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as {
        key?: unknown;
        adopted?: unknown;
        adoptedValue?: unknown;
        alternatives?: unknown;
        otherValues?: unknown;
      };
      const key =
        typeof record.key === "string" && validKeys.has(record.key as MetricFieldKey)
          ? (record.key as MetricFieldKey)
          : null;
      if (!key) return null;

      const adopted = asString(record.adopted || record.adoptedValue).trim();
      const altSource = Array.isArray(record.alternatives)
        ? record.alternatives
        : Array.isArray(record.otherValues)
          ? record.otherValues
          : [];
      const alternatives = altSource
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value && value !== adopted);

      if (!adopted || alternatives.length === 0) return null;

      return {
        key,
        label: labelByKey.get(key) ?? key,
        adopted,
        alternatives: [...new Set(alternatives)],
      };
    })
    .filter((item): item is MetricConflict => item !== null);
}

/** 抽出結果と任意の手入力をマージ（画像で取れた値を優先） */
export function mergeMetricsPreferImage(
  extracted: AnalysisMetrics,
  manual: Partial<AnalysisMetrics>,
): AnalysisMetrics {
  const imageKeys = new Set(collectedMetricKeys(extracted));
  const base = emptyMetrics();

  for (const key of Object.keys(base) as MetricFieldKey[]) {
    if (key === "sleepScore") {
      if (imageKeys.has("sleepScore")) {
        base.sleepScore = extracted.sleepScore;
      } else if (
        typeof manual.sleepScore === "number" &&
        Number.isFinite(manual.sleepScore)
      ) {
        base.sleepScore = manual.sleepScore;
      } else {
        base.sleepScore = null;
      }
      continue;
    }

    if (imageKeys.has(key)) {
      base[key] = extracted[key];
    } else {
      const manualValue = asString(manual[key]).trim();
      base[key] = manualValue || "";
    }
  }

  return base;
}

export function runPendingAnalysis(): Promise<AnalysisResult> {
  if (inFlightAnalysis) {
    return inFlightAnalysis;
  }

  const payload = pendingRequest;
  if (!payload) {
    return Promise.reject(
      new Error("分析データが見つかりません。最初から入力してください。"),
    );
  }

  inFlightAnalysis = (async () => {
    let response: Response;
    try {
      response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (fetchError) {
      console.error("Analysis fetch failed:", fetchError);
      throw new AnalysisError(
        "AI分析に失敗しました。ネットワークエラーが発生しました。",
        {
          errorType: "Fetch Error",
          details:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
        },
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Analysis response JSON parse failed:", parseError, {
        status: response.status,
      });
      throw new AnalysisError("AI分析に失敗しました。", {
        status: response.status,
        errorType: "JSON Parse Error",
        details:
          parseError instanceof Error
            ? parseError.message
            : String(parseError),
      });
    }

    if (!response.ok) {
      const errorPayload =
        data && typeof data === "object"
          ? (data as {
              error?: unknown;
              errorType?: unknown;
              details?: unknown;
            })
          : {};

      const message =
        typeof errorPayload.error === "string"
          ? errorPayload.error
          : "AI分析に失敗しました。";
      const errorType =
        typeof errorPayload.errorType === "string"
          ? errorPayload.errorType
          : "OpenAI Error";
      const details =
        typeof errorPayload.details === "string"
          ? errorPayload.details
          : undefined;

      console.error("Analysis API error:", {
        status: response.status,
        errorType,
        message,
        details,
        data,
      });

      throw new AnalysisError(message, {
        status: response.status,
        errorType,
        details,
      });
    }

    const raw = data as AnalysisResult;
    const result = normalizeAnalysisResult(raw, {
      clientId: payload.lifestyle.clientId,
      clientName: payload.lifestyle.clientName,
      measurementDate: payload.lifestyle.measurementDate,
      age: payload.lifestyle.age,
      gender: payload.lifestyle.gender,
      heightCm: payload.lifestyle.heightCm,
      weightKg: payload.lifestyle.weightKg,
      medications: payload.lifestyle.medications,
      drinkingHabit: payload.lifestyle.drinkingHabit,
      exerciseHabit: payload.lifestyle.exerciseHabit,
      snoringNasal: payload.lifestyle.snoringNasal,
      medicalHistory: payload.lifestyle.medicalHistory,
    });

    // OCR→確認で確定した confirmedMetrics / graphs を単一の数値根拠として強制採用
    if (payload.metrics) {
      result.metrics = normalizeMetrics(payload.metrics);
    }
    if (payload.extractedMetrics) {
      result.extractedMetrics = normalizeMetrics(payload.extractedMetrics);
    } else if (extractionDraft?.extractedMetrics) {
      result.extractedMetrics = normalizeMetrics(
        extractionDraft.extractedMetrics,
      );
    }
    if (payload.graphs) {
      result.graphs = normalizeGraphBundle(payload.graphs);
    } else if (extractionDraft?.graphs) {
      result.graphs = normalizeGraphBundle(extractionDraft.graphs);
    } else {
      result.graphs = emptyGraphBundle();
    }

    result.ocrConfidence =
      payload.ocrConfidence ??
      extractionDraft?.ocrConfidence ??
      undefined;

    pendingRequest = null;
    clearExtractionDraft();
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
    storeImages(payload.images);
    storeGraphs(result.graphs);
    return result;
  })();

  inFlightAnalysis.catch((error) => {
    console.error("Pending analysis failed:", error);
    inFlightAnalysis = null;
  });

  return inFlightAnalysis;
}

export function loadAnalysisResult(): AnalysisResult | null {
  const raw = sessionStorage.getItem(RESULT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AnalysisResult;
    return normalizeAnalysisResult(parsed);
  } catch {
    return null;
  }
}

export function loadAnalysisGraphs(): SoxaiGraphBundle {
  const raw = sessionStorage.getItem(GRAPHS_KEY);
  if (!raw) return emptyGraphBundle();
  try {
    return normalizeGraphBundle(JSON.parse(raw));
  } catch {
    return emptyGraphBundle();
  }
}

export function loadAnalysisImages(): string[] {
  const raw = sessionStorage.getItem(IMAGES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string =>
        typeof item === "string" && item.startsWith("data:image/"),
    );
  } catch {
    return [];
  }
}

/** 保存済み分析を結果画面で再表示できるよう sessionStorage に書き戻す */
export function hydrateAnalysisSession(
  result: AnalysisResult,
  options?: { images?: string[] },
): AnalysisResult {
  const normalized = normalizeAnalysisResult(result);
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(normalized));
  storeGraphs(normalizeGraphBundle(normalized.graphs));
  if (options?.images && options.images.length > 0) {
    storeImages(options.images);
  } else {
    sessionStorage.removeItem(IMAGES_KEY);
  }
  return normalized;
}
