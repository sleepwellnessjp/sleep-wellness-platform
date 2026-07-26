/**
 * Sleep Analysis ワークスペース用のデータ契約。
 * UI・確認画面・将来の Supabase 永続化を同じ形で扱う。
 */

import {
  hydrateAnalysisSession,
  normalizeAnalysisResult,
  type AnalysisResult,
} from "@/lib/analysis-session";
import {
  aiInputFromSoxaiAndLifestyle,
  generateAiSleepAnalysisSync,
  toAnalysisResultFields,
  type AiSleepAnalysisOutput,
} from "@/lib/ai-analysis";
import { emptyMetrics, type AnalysisMetrics } from "@/lib/soxai-metrics";

/** ① Client Information */
export type AnalysisClientInfo = {
  clientId?: string;
  name: string;
  age: string;
  gender: string;
  analysisDate: string;
  instructorName: string;
};

/** ② SOXAIメトリクス（画面表示キー） */
export type SoxaiWorkspaceMetrics = {
  sleepScore: string;
  sleepDuration: string;
  sleepEfficiency: string;
  deepSleep: string;
  remSleep: string;
  awakenings: string;
  hrv: string;
  stress: string;
  restingHeartRate: string;
  circadianRhythm: string;
};

export const SOXAI_WORKSPACE_FIELDS: Array<{
  key: keyof SoxaiWorkspaceMetrics;
  label: string;
  unit?: string;
  placeholder: string;
}> = [
  { key: "sleepScore", label: "睡眠スコア", placeholder: "78" },
  { key: "sleepDuration", label: "睡眠時間", placeholder: "6時間42分" },
  { key: "sleepEfficiency", label: "睡眠効率", unit: "%", placeholder: "87" },
  { key: "deepSleep", label: "深睡眠", placeholder: "1時間18分" },
  { key: "remSleep", label: "レム睡眠", placeholder: "1時間32分" },
  { key: "awakenings", label: "中途覚醒", placeholder: "2回" },
  { key: "hrv", label: "HRV", unit: "ms", placeholder: "48" },
  { key: "stress", label: "ストレス", placeholder: "42" },
  {
    key: "restingHeartRate",
    label: "安静時心拍",
    unit: "bpm",
    placeholder: "58",
  },
  { key: "circadianRhythm", label: "体内時計", placeholder: "やや遅れ" },
];

/** ③ Lifestyle */
export type AnalysisLifestyleInput = {
  breakfast: string;
  lunch: string;
  dinner: string;
  alcohol: string;
  caffeine: string;
  exercise: string;
  bathing: string;
  preBedBehavior: string;
  notes: string;
};

export const LIFESTYLE_FIELDS: Array<{
  key: keyof AnalysisLifestyleInput;
  label: string;
  placeholder: string;
  rows?: number;
}> = [
  { key: "breakfast", label: "朝食", placeholder: "例：ご飯、味噌汁、卵" },
  { key: "lunch", label: "昼食", placeholder: "例：そば、サラダ" },
  { key: "dinner", label: "夕食", placeholder: "例：焼き魚、野菜、ご飯" },
  { key: "alcohol", label: "飲酒量", placeholder: "例：なし / ビール500ml" },
  {
    key: "caffeine",
    label: "カフェイン",
    placeholder: "例：コーヒー1杯（15:00）",
  },
  {
    key: "exercise",
    label: "運動",
    placeholder: "例：ウォーキング40分（夕方）",
  },
  { key: "bathing", label: "入浴", placeholder: "例：湯船 / シャワー" },
  {
    key: "preBedBehavior",
    label: "就寝前行動",
    placeholder: "例：スマホ30分、読書",
  },
  {
    key: "notes",
    label: "自由メモ",
    placeholder: "本人の自覚、睡眠に関する気づきなど",
    rows: 4,
  },
];

/** ④ AI Analysis Preview */
export type AiAnalysisPreview = {
  score: number;
  headline: string;
  summary: string;
  goodPoints: string[];
  focusPoints: string[];
};

/** ⑤ Recommendation */
export type RecommendationCategory =
  | "sleep"
  | "exercise"
  | "meal"
  | "stress"
  | "lifestyle";

export type RecommendationCard = {
  category: RecommendationCategory;
  label: string;
  title: string;
  body: string;
};

/** 画面全体のワークスペース状態（Supabase row に近い形） */
export type SleepAnalysisWorkspace = {
  client: AnalysisClientInfo;
  soxai: SoxaiWorkspaceMetrics;
  lifestyle: AnalysisLifestyleInput;
  preview: AiAnalysisPreview;
  recommendations: RecommendationCard[];
};

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function emptyClientInfo(
  instructorName = "認定講師",
): AnalysisClientInfo {
  return {
    name: "",
    age: "",
    gender: "",
    analysisDate: todayIsoDate(),
    instructorName,
  };
}

export function emptyLifestyle(): AnalysisLifestyleInput {
  return {
    breakfast: "",
    lunch: "",
    dinner: "",
    alcohol: "",
    caffeine: "",
    exercise: "",
    bathing: "",
    preBedBehavior: "",
    notes: "",
  };
}

/** ワークスペース入力から AI Sleep Analysis Engine を実行 */
export function runWorkspaceAiAnalysis(args: {
  clientName?: string;
  measurementDate?: string;
  instructorName?: string;
  soxai: SoxaiWorkspaceMetrics;
  lifestyle: AnalysisLifestyleInput;
}): AiSleepAnalysisOutput {
  return generateAiSleepAnalysisSync(
    aiInputFromSoxaiAndLifestyle({
      clientName: args.clientName,
      measurementDate: args.measurementDate,
      instructorName: args.instructorName,
      soxai: args.soxai,
      lifestyle: args.lifestyle,
    }),
  );
}

function parseSleepScore(value: string): number | null {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function soxaiToAnalysisMetrics(
  soxai: SoxaiWorkspaceMetrics,
): AnalysisMetrics {
  return {
    ...emptyMetrics(),
    sleepScore: parseSleepScore(soxai.sleepScore),
    sleepDuration: soxai.sleepDuration.trim(),
    sleepEfficiency: soxai.sleepEfficiency.trim(),
    deepSleep: soxai.deepSleep.trim(),
    remSleep: soxai.remSleep.trim(),
    awakenings: soxai.awakenings.trim(),
    hrv: soxai.hrv.trim(),
    stress: soxai.stress.trim(),
    restingHeartRate: soxai.restingHeartRate.trim(),
    circadianRhythm: soxai.circadianRhythm.trim(),
  };
}

function composeLifestyleNotes(lifestyle: AnalysisLifestyleInput): string {
  const lines = [
    lifestyle.breakfast && `朝食: ${lifestyle.breakfast}`,
    lifestyle.lunch && `昼食: ${lifestyle.lunch}`,
    lifestyle.dinner && `夕食: ${lifestyle.dinner}`,
    lifestyle.alcohol && `飲酒: ${lifestyle.alcohol}`,
    lifestyle.caffeine && `カフェイン: ${lifestyle.caffeine}`,
    lifestyle.exercise && `運動: ${lifestyle.exercise}`,
    lifestyle.bathing && `入浴: ${lifestyle.bathing}`,
    lifestyle.preBedBehavior && `就寝前: ${lifestyle.preBedBehavior}`,
    lifestyle.notes && `メモ: ${lifestyle.notes}`,
  ].filter(Boolean);
  return lines.join("；");
}

/**
 * ワークスペース入力から Analysis Result 互換データを組み立てる。
 * AI Sleep Analysis Engine（ルールベース）を共通利用。将来 OpenAI 結果に差し替え可能。
 */
export function buildAnalysisResultFromWorkspace(
  workspace: SleepAnalysisWorkspace,
): AnalysisResult {
  const { client, soxai, lifestyle } = workspace;
  const input = aiInputFromSoxaiAndLifestyle({
    clientName: client.name,
    measurementDate: client.analysisDate,
    instructorName: client.instructorName,
    soxai,
    lifestyle,
  });
  const output = generateAiSleepAnalysisSync(input);
  const ai = toAnalysisResultFields(output, input);
  const score = ai.score || parseSleepScore(soxai.sleepScore) || 72;
  const profileRelation =
    composeLifestyleNotes(lifestyle) || ai.profileRelation;

  return normalizeAnalysisResult({
    summary: ai.summary,
    karteSummary: ai.karteSummary,
    goodPoints: ai.goodPoints,
    improvements: ai.improvements,
    profileRelation,
    scoreComment: ai.scoreComment,
    categoryScoreRationales: ai.categoryScoreRationales,
    todaysRecommendations: ai.todaysRecommendations,
    nextComparisonPoints: ai.nextComparisonPoints,
    recommendationsUntilNext: ai.recommendationsUntilNext,
    instructorSuggestions: ai.instructorSuggestions,
    instructorCounseling: ai.instructorCounseling,
    melatoninYogaPlan: ai.melatoninYogaPlan,
    comparisonNarrative: ai.comparisonNarrative,
    score,
    scoreBreakdown: {
      sleepDuration: 4,
      sleepEfficiency: 4,
      deepSleep: 3,
      hrv: 4,
      stress: 3,
      spo2: 4,
      recovery: 4,
    },
    categoryScores: {
      body: Math.max(55, score - 4),
      mind: Math.max(50, score - 8),
      lifestyle: Math.max(52, score - 6),
      environment: Math.max(58, score - 2),
    },
    metrics: soxaiToAnalysisMetrics(soxai),
    caution: "体調不良や強い眠気が続く場合は、医療機関への相談もご検討ください。",
    disclaimer:
      "本システムは睡眠ウェルネス支援を目的としており、医療診断・治療を行うものではありません。",
    clientId: client.clientId,
    clientName: client.name,
    measurementDate: client.analysisDate,
    age: client.age,
    gender: client.gender,
  });
}

/** Analysis Result 画面へ渡すため session を水和する */
export function commitWorkspaceToAnalysisResult(
  workspace: SleepAnalysisWorkspace,
): AnalysisResult {
  return hydrateAnalysisSession(buildAnalysisResultFromWorkspace(workspace));
}
