/**
 * AI Sleep Analysis Engine Version 1.0
 *
 * Sleep Wellness Platform のコア分析ロジック。
 * 現時点はルールベース。将来 OpenAI API に差し替える場合は
 * `AiSleepAnalysisGenerator` を実装して `generateAiSleepAnalysis` に渡す。
 *
 * Analysis Result / Sleep Journey / Report / Homework から共通利用する。
 */

import {
  parseDurationMinutes,
  parseLeadingNumber,
} from "@/lib/soxai-graphs";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import type { ImprovementItem } from "@/lib/improvement-priority";
import type { NextActionGoal } from "@/lib/analysis-session";
import {
  buildCounselingSupport,
  flattenCounselingSupport,
} from "@/lib/counseling-support";

export const AI_SLEEP_ANALYSIS_VERSION = "1.0" as const;

export type AiAnalysisSource = "rules" | "openai";

/** 分析対象項目（Sleep Wellness Score 用 + 生活習慣参考） */
export type AiAnalysisItemKey =
  | "sleepScore"
  | "sleepDuration"
  | "sleepEfficiency"
  | "sleepDebt"
  | "sleepLatency"
  | "deepSleep"
  | "remSleep"
  | "awakenings"
  | "hrv"
  | "stress"
  | "restingHeartRate"
  | "spo2"
  | "respiratoryRate"
  | "circadianRhythm"
  | "skinTemperature"
  | "meals"
  | "alcohol"
  | "caffeine"
  | "exercise"
  | "bathing"
  | "preBedBehavior";

export type AiAnalysisItemStatus =
  | "good"
  | "fair"
  | "needs_attention"
  | "unknown";

export type AiAnalysisItem = {
  key: AiAnalysisItemKey;
  label: string;
  /** 表示用の生値 */
  rawValue: string | number | null;
  /** 0–100 に正規化した評価（不明時は null） */
  normalizedScore: number | null;
  status: AiAnalysisItemStatus;
  /** 内部シグナル（プロンプト・デバッグ用） */
  signal: string;
  note: string;
};

/** エンジン入力（画面・API・永続化から共通で渡せる形） */
export type AiSleepAnalysisInput = {
  clientName?: string;
  measurementDate?: string;
  instructorName?: string;
  metrics: {
    sleepScore?: number | null;
    sleepDuration?: string | null;
    sleepEfficiency?: string | null;
    deepSleep?: string | null;
    remSleep?: string | null;
    awakenings?: string | null;
    hrv?: string | null;
    stress?: string | null;
    restingHeartRate?: string | null;
    circadianRhythm?: string | null;
    sleepLatency?: string | null;
    sleepDebt?: string | null;
    spo2?: string | null;
    respiratoryRate?: string | null;
    skinTemperature?: string | null;
  };
  lifestyle: {
    breakfast?: string | null;
    lunch?: string | null;
    dinner?: string | null;
    alcohol?: string | null;
    caffeine?: string | null;
    exercise?: string | null;
    bathing?: string | null;
    preBedBehavior?: string | null;
    notes?: string | null;
  };
};

/**
 * エンジン出力 JSON。
 * OpenAI response_format / function calling のスキーマ雛形としても使える。
 */
export type AiSleepAnalysisOutput = {
  version: typeof AI_SLEEP_ANALYSIS_VERSION;
  source: AiAnalysisSource;
  analyzedAt: string;
  clientName: string;
  measurementDate: string | null;
  /** 総合ウェルネススコア（0–100）。ルール時は項目評価の加重平均 */
  wellnessScore: number;
  items: AiAnalysisItem[];
  /** ① 総合評価 */
  overallEvaluation: string;
  /** ② 良い点 */
  goodPoints: string[];
  /** ③ 改善ポイント */
  improvementPoints: string[];
  /** ④ 今日の課題 */
  todaysChallenge: string;
  /** ⑤ 来週までの目標 */
  weeklyGoals: string[];
  /** ⑥ 認定講師へのアドバイス */
  instructorAdvice: string;
  /** ⑦ クライアント向けメッセージ */
  clientMessage: string;
  /**
   * OpenAI 接続時にそのまま messages / tools へ載せやすい構造化ペイロード。
   * ルールベース実行時も同一形で返す。
   */
  openaiReady: AiAnalysisOpenAiReadyPayload;
};

export type AiAnalysisOpenAiReadyPayload = {
  modelHint: "gpt-4o" | "gpt-4.1" | "o3-mini";
  systemRole: string;
  userContent: {
    clientName: string;
    measurementDate: string | null;
    items: Array<{
      key: AiAnalysisItemKey;
      label: string;
      value: string | number | null;
      status: AiAnalysisItemStatus;
      note: string;
    }>;
    lifestyleNotes: string | null;
  };
  /** response_format.json_schema 相当の必須キー */
  expectedOutputKeys: readonly [
    "overallEvaluation",
    "goodPoints",
    "improvementPoints",
    "todaysChallenge",
    "weeklyGoals",
    "instructorAdvice",
    "clientMessage",
  ];
};

export type AiSleepAnalysisGenerator = (
  input: AiSleepAnalysisInput,
) => AiSleepAnalysisOutput | Promise<AiSleepAnalysisOutput>;

const ITEM_LABELS: Record<AiAnalysisItemKey, string> = {
  sleepScore: "睡眠スコア（参考）",
  sleepDuration: "睡眠時間",
  sleepEfficiency: "睡眠効率",
  sleepDebt: "睡眠負債",
  sleepLatency: "入眠潜時",
  deepSleep: "深い睡眠",
  remSleep: "レム睡眠",
  awakenings: "覚醒時間",
  hrv: "HRV",
  stress: "ストレス",
  restingHeartRate: "安静時心拍",
  spo2: "SpO₂",
  respiratoryRate: "呼吸数",
  circadianRhythm: "体内時計",
  skinTemperature: "皮膚温",
  meals: "食事",
  alcohol: "飲酒",
  caffeine: "カフェイン",
  exercise: "運動",
  bathing: "入浴",
  preBedBehavior: "就寝前行動",
};

const EXPECTED_OUTPUT_KEYS = [
  "overallEvaluation",
  "goodPoints",
  "improvementPoints",
  "todaysChallenge",
  "weeklyGoals",
  "instructorAdvice",
  "clientMessage",
] as const;

const SYSTEM_ROLE =
  "あなたは Sleep Wellness Institute Japan 認定講師向けの睡眠ウェルネス分析エンジンです。" +
  "医療診断は行わず、データ根拠に基づく睡眠ウェルネス支援として日本語で返します。" +
  "複数指標を関連づけ、良い点から触れ、定型文と病名診断は避けてください。" +
  "可能性があります・考えられます・参考として・改善が期待できます、を用いてください。";

/** —— 閾値（SWIJ 独自 Sleep Wellness Score） —— */
const THRESH = {
  sleepScoreGood: 80,
  sleepScoreFair: 65,
  durationGoodMin: 7 * 60,
  durationFairMin: 6 * 60,
  durationSoftMin: 5 * 60 + 30,
  durationMaxMin: 9 * 60,
  efficiencyGood: 90,
  efficiencyFair: 85,
  efficiencySoft: 75,
  deepGoodMin: 75,
  deepFairMin: 55,
  remGoodMin: 90,
  remFairMin: 70,
  remSoftMin: 25,
  awakeningsGoodMaxMin: 20,
  awakeningsFairMaxMin: 60,
  awakeningsSoftMaxMin: 90,
  awakeningsGoodMax: 1,
  awakeningsFairMax: 3,
  latencyGoodMax: 15,
  latencyFairMax: 25,
  latencySoftMax: 40,
  debtGoodMaxMin: 20,
  debtFairMaxMin: 45,
  debtSoftMaxMin: 90,
  hrvGood: 50,
  hrvFair: 35,
  stressGoodMax: 35,
  stressFairMax: 50,
  rhrGoodMax: 60,
  rhrFairMax: 72,
  spo2Good: 96,
  spo2Fair: 94,
  /** ★3「やや低い」の下限。93未満はリスク判定の境界と揃える */
  spo2Soft: 93,
  /** ★2「低め・確認推奨」の下限 */
  spo2Watch: 90,
  circadianGoodMaxMin: 20,
  circadianFairMaxMin: 40,
  circadianSoftMaxMin: 60,
  skinGoodAbs: 0.3,
  skinFairAbs: 0.6,
  skinSoftAbs: 1.0,
} as const;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusFromScore(score: number | null): AiAnalysisItemStatus {
  if (score == null) return "unknown";
  if (score >= 75) return "good";
  if (score >= 55) return "fair";
  return "needs_attention";
}

function textOrNull(value: string | null | undefined): string | null {
  const t = (value ?? "").trim();
  return t ? t : null;
}

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function isNegativeLifestyle(text: string): boolean {
  return includesAny(text, [
    "なし",
    "無し",
    "ない",
    "しません",
    "しなかった",
    "未実施",
    "no",
    "none",
    "0",
  ]);
}

function isLateMarker(text: string): boolean {
  return includesAny(text, [
    "遅",
    "夜遅く",
    "深夜",
    "22:",
    "23:",
    "0:",
    "1:",
    "24:",
  ]);
}

function isPhoneHeavy(text: string): boolean {
  return includesAny(text, [
    "スマホ",
    "スマートフォン",
    "画面",
    "SNS",
    "動画",
    "テレビ",
    "ゲーム",
  ]);
}

function emptyItem(
  key: AiAnalysisItemKey,
  rawValue: string | number | null,
  signal: string,
  note: string,
): AiAnalysisItem {
  return {
    key,
    label: ITEM_LABELS[key],
    rawValue,
    normalizedScore: null,
    status: "unknown",
    signal,
    note,
  };
}

function scoredItem(
  key: AiAnalysisItemKey,
  rawValue: string | number | null,
  normalizedScore: number,
  signal: string,
  note: string,
): AiAnalysisItem {
  const score = clamp100(normalizedScore);
  return {
    key,
    label: ITEM_LABELS[key],
    rawValue,
    normalizedScore: score,
    status: statusFromScore(score),
    signal,
    note,
  };
}

/** —— 個別評価関数 —— */

export function evaluateSleepScore(
  value: number | null | undefined,
): AiAnalysisItem {
  if (value == null || !Number.isFinite(value)) {
    return emptyItem("sleepScore", null, "missing", "睡眠スコア未入力");
  }
  // SOXAIスコアは参考値。生値をなだらかに正規化し、総合への寄与は重みで抑える
  const v = clamp100(value);
  const score = Math.round(40 + v * 0.55);
  let signal: string;
  let note: string;
  if (v >= THRESH.sleepScoreGood) {
    signal = "strong";
    note = "SOXAI睡眠スコアは良好帯です（参考）";
  } else if (v >= THRESH.sleepScoreFair) {
    signal = "moderate";
    note = "SOXAI睡眠スコアはまずまずです（参考）";
  } else {
    signal = "low";
    note = "SOXAI睡眠スコアは低めです（参考・総合では重み小）";
  }
  return scoredItem("sleepScore", v, score, signal, note);
}

export function evaluateSleepDuration(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const minutes = raw ? parseDurationMinutes(raw) : null;
  if (minutes == null) {
    return emptyItem("sleepDuration", raw, "missing", "睡眠時間未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (minutes >= THRESH.durationGoodMin && minutes <= THRESH.durationMaxMin) {
    score = 90;
    signal = "adequate";
    note = "睡眠時間は推奨レンジ内です";
  } else if (minutes >= THRESH.durationFairMin) {
    // 6h〜7h: 68〜88
    score =
      68 +
      ((minutes - THRESH.durationFairMin) /
        (THRESH.durationGoodMin - THRESH.durationFairMin)) *
        20;
    signal = "slightly_short";
    note = "睡眠時間がやや短めです";
  } else if (minutes >= THRESH.durationSoftMin) {
    // 5.5h〜6h: 58〜68
    score =
      58 +
      ((minutes - THRESH.durationSoftMin) /
        (THRESH.durationFairMin - THRESH.durationSoftMin)) *
        10;
    signal = "short";
    note = "睡眠時間が短めです。機会の確保が有効です";
  } else if (minutes > THRESH.durationMaxMin) {
    score = 62;
    signal = "long";
    note = "睡眠時間が長めです。質とリズムも合わせて確認します";
  } else {
    // 5.5h未満
    score = Math.max(32, 28 + (minutes / THRESH.durationSoftMin) * 30);
    signal = "insufficient";
    note = "睡眠時間不足の可能性があります";
  }
  return scoredItem("sleepDuration", raw, score, signal, note);
}

export function evaluateSleepEfficiency(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const pct = raw ? parseLeadingNumber(raw) : null;
  if (pct == null) {
    return emptyItem("sleepEfficiency", raw, "missing", "睡眠効率未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (pct >= THRESH.efficiencyGood) {
    score = 92;
    signal = "high";
    note = "睡眠効率は高い水準です";
  } else if (pct >= THRESH.efficiencyFair) {
    score =
      75 +
      ((pct - THRESH.efficiencyFair) /
        (THRESH.efficiencyGood - THRESH.efficiencyFair)) *
        17;
    signal = "moderate";
    note = "睡眠効率は許容範囲。わずかな改善余地があります";
  } else if (pct >= THRESH.efficiencySoft) {
    score =
      58 +
      ((pct - THRESH.efficiencySoft) /
        (THRESH.efficiencyFair - THRESH.efficiencySoft)) *
        17;
    signal = "borderline";
    note = "睡眠効率はやや低めです。中途覚醒や入眠の確認が有効です";
  } else {
    score = Math.max(30, (pct / THRESH.efficiencySoft) * 55);
    signal = "low";
    note = "睡眠効率が低めです。連続性の改善を優先します";
  }
  return scoredItem("sleepEfficiency", raw, score, signal, note);
}

export function evaluateSleepDebt(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("sleepDebt", null, "missing", "睡眠負債未入力");
  }
  const minutes = Math.abs(parseDurationMinutes(raw) ?? NaN);
  if (!Number.isFinite(minutes)) {
    return emptyItem("sleepDebt", raw, "missing", "睡眠負債を解釈できません");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (minutes <= THRESH.debtGoodMaxMin) {
    score = 90;
    signal = "low";
    note = "睡眠負債は小さいです";
  } else if (minutes <= THRESH.debtFairMaxMin) {
    score =
      75 +
      ((THRESH.debtFairMaxMin - minutes) /
        (THRESH.debtFairMaxMin - THRESH.debtGoodMaxMin)) *
        12;
    signal = "mild";
    note = "睡眠負債は軽度です";
  } else if (minutes <= THRESH.debtSoftMaxMin) {
    score =
      58 +
      ((THRESH.debtSoftMaxMin - minutes) /
        (THRESH.debtSoftMaxMin - THRESH.debtFairMaxMin)) *
        14;
    signal = "moderate";
    note = "睡眠負債がややあります。回復夜の確保が有効です";
  } else {
    score = Math.max(30, 55 - (minutes - THRESH.debtSoftMaxMin) / 8);
    signal = "elevated";
    note = "睡眠負債が大きめです。総睡眠の底上げを優先します";
  }
  return scoredItem("sleepDebt", raw, score, signal, note);
}

export function evaluateSleepLatency(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const minutes = raw
    ? (parseDurationMinutes(raw) ?? parseLeadingNumber(raw))
    : null;
  if (minutes == null) {
    return emptyItem("sleepLatency", raw, "missing", "入眠潜時未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (minutes <= THRESH.latencyGoodMax) {
    score = 90;
    signal = "prompt";
    note = "入眠潜時は良好です";
  } else if (minutes <= THRESH.latencyFairMax) {
    score =
      72 +
      ((THRESH.latencyFairMax - minutes) /
        (THRESH.latencyFairMax - THRESH.latencyGoodMax)) *
        14;
    signal = "acceptable";
    note = "入眠潜時はまずまずです";
  } else if (minutes <= THRESH.latencySoftMax) {
    score =
      55 +
      ((THRESH.latencySoftMax - minutes) /
        (THRESH.latencySoftMax - THRESH.latencyFairMax)) *
        14;
    signal = "delayed";
    note = "入眠にやや時間がかかっています";
  } else {
    score = Math.max(28, 52 - (minutes - THRESH.latencySoftMax) * 0.6);
    signal = "prolonged";
    note = "入眠潜時が長めです。就寝前ルーティンの見直しが有効です";
  }
  return scoredItem("sleepLatency", raw, score, signal, note);
}

export function evaluateDeepSleep(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const minutes = raw ? parseDurationMinutes(raw) : null;
  if (minutes == null) {
    return emptyItem("deepSleep", raw, "missing", "深睡眠未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (minutes >= THRESH.deepGoodMin) {
    score = Math.min(95, 88 + (minutes - THRESH.deepGoodMin) / 20);
    signal = "sufficient";
    note = "深睡眠は十分な長さです";
  } else if (minutes >= THRESH.deepFairMin) {
    score =
      65 +
      ((minutes - THRESH.deepFairMin) /
        (THRESH.deepGoodMin - THRESH.deepFairMin)) *
        20;
    signal = "borderline";
    note = "深睡眠はまずまず。就寝前ルーティンで伸ばせます";
  } else {
    score = Math.max(28, (minutes / THRESH.deepFairMin) * 58);
    signal = "insufficient";
    note = "深睡眠が短めです。回復の核として優先したい項目です";
  }
  return scoredItem("deepSleep", raw, score, signal, note);
}

export function evaluateRemSleep(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const minutes = raw ? parseDurationMinutes(raw) : null;
  if (minutes == null) {
    return emptyItem("remSleep", raw, "missing", "レム睡眠未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (minutes >= THRESH.remGoodMin) {
    score = 90;
    signal = "sufficient";
    note = "レム睡眠はバランスが取れています";
  } else if (minutes >= THRESH.remFairMin) {
    score =
      68 +
      ((minutes - THRESH.remFairMin) /
        (THRESH.remGoodMin - THRESH.remFairMin)) *
        18;
    signal = "borderline";
    note = "レム睡眠は標準付近です";
  } else if (minutes >= THRESH.remSoftMin) {
    score =
      42 +
      ((minutes - THRESH.remSoftMin) /
        (THRESH.remFairMin - THRESH.remSoftMin)) *
        22;
    signal = "low";
    note = "レム睡眠が短めです。規則的な就寝・起床が支えになります";
  } else {
    score = Math.max(30, 28 + (minutes / THRESH.remSoftMin) * 14);
    signal = "insufficient";
    note = "レム睡眠がかなり短めです。総睡眠とリズムの見直しが有効です";
  }
  return scoredItem("remSleep", raw, score, signal, note);
}

export function evaluateAwakenings(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("awakenings", raw, "missing", "覚醒時間未入力");
  }

  // 「1時間33分」「93分」など時間表記は覚醒時間（分）として評価
  const looksLikeDuration = /時間|分|:/.test(raw);
  const durationMin = looksLikeDuration ? parseDurationMinutes(raw) : null;

  if (durationMin != null) {
    let score: number;
    let signal: string;
    let note: string;
    if (durationMin <= THRESH.awakeningsGoodMaxMin) {
      score = 90;
      signal = "low";
      note = "覚醒時間は短いです";
    } else if (durationMin <= THRESH.awakeningsFairMaxMin) {
      score =
        58 +
        ((THRESH.awakeningsFairMaxMin - durationMin) /
          (THRESH.awakeningsFairMaxMin - THRESH.awakeningsGoodMaxMin)) *
          28;
      signal = "moderate";
      note = "覚醒時間がややあります";
    } else if (durationMin <= THRESH.awakeningsSoftMaxMin) {
      score =
        45 +
        ((THRESH.awakeningsSoftMaxMin - durationMin) /
          (THRESH.awakeningsSoftMaxMin - THRESH.awakeningsFairMaxMin)) *
          12;
      signal = "elevated";
      note = "覚醒時間が長めです。連続性の改善が有効です";
    } else {
      score = Math.max(25, 45 - (durationMin - THRESH.awakeningsSoftMaxMin) / 6);
      signal = "high";
      note = "覚醒時間が多めです。環境・呼吸・飲酒などの確認が有効です";
    }
    return scoredItem("awakenings", raw, score, signal, note);
  }

  const count = parseLeadingNumber(raw);
  if (count == null) {
    return emptyItem("awakenings", raw, "missing", "覚醒時間未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (count <= THRESH.awakeningsGoodMax) {
    score = 90;
    signal = "low";
    note = "中途覚醒は少ないです";
  } else if (count <= THRESH.awakeningsFairMax) {
    score = 62;
    signal = "moderate";
    note = "中途覚醒がややあります";
  } else {
    score = Math.max(25, 55 - (count - THRESH.awakeningsFairMax) * 7);
    signal = "frequent";
    note = "中途覚醒が多い傾向です。生活・環境要因の確認が有効です";
  }
  return scoredItem("awakenings", raw, score, signal, note);
}

export function evaluateHrv(value: string | null | undefined): AiAnalysisItem {
  const raw = textOrNull(value);
  const ms = raw ? parseLeadingNumber(raw) : null;
  if (ms == null) {
    return emptyItem("hrv", raw, "missing", "HRV未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (ms >= THRESH.hrvGood) {
    score = 90;
    signal = "resilient";
    note = "HRVは回復余力を示しています";
  } else if (ms >= THRESH.hrvFair) {
    score =
      62 +
      ((ms - THRESH.hrvFair) / (THRESH.hrvGood - THRESH.hrvFair)) * 22;
    signal = "moderate";
    note = "HRVは標準帯。ストレスと休息のバランスが鍵です";
  } else {
    score = Math.max(28, (ms / THRESH.hrvFair) * 55);
    signal = "low";
    note = "HRVが低めです。過緊張や睡眠不足の影響が考えられます";
  }
  return scoredItem("hrv", raw, score, signal, note);
}

export function evaluateStress(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const level = raw ? parseLeadingNumber(raw) : null;
  if (level == null) {
    return emptyItem("stress", raw, "missing", "ストレス未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (level <= THRESH.stressGoodMax) {
    score = 90;
    signal = "low";
    note = "ストレス指標は落ち着いています";
  } else if (level <= THRESH.stressFairMax) {
    score =
      58 +
      ((THRESH.stressFairMax - level) /
        (THRESH.stressFairMax - THRESH.stressGoodMax)) *
        24;
    signal = "moderate";
    note = "ストレスはやや高め。就寝前のリセットが有効です";
  } else {
    score = Math.max(25, 55 - (level - THRESH.stressFairMax));
    signal = "high";
    note = "ストレス指標が高めです。自律神経ケアを優先しましょう";
  }
  return scoredItem("stress", raw, score, signal, note);
}

export function evaluateRestingHeartRate(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const bpm = raw ? parseLeadingNumber(raw) : null;
  if (bpm == null) {
    return emptyItem(
      "restingHeartRate",
      raw,
      "missing",
      "安静時心拍未入力",
    );
  }
  let score: number;
  let signal: string;
  let note: string;
  if (bpm <= THRESH.rhrGoodMax) {
    score = 90;
    signal = "calm";
    note = "安静時心拍は落ち着いた水準です";
  } else if (bpm <= THRESH.rhrFairMax) {
    score =
      62 +
      ((THRESH.rhrFairMax - bpm) / (THRESH.rhrFairMax - THRESH.rhrGoodMax)) *
        22;
    signal = "moderate";
    note = "安静時心拍は標準帯です";
  } else {
    score = Math.max(28, 55 - (bpm - THRESH.rhrFairMax) * 1.4);
    signal = "elevated";
    note = "安静時心拍が高めです。回復と負荷のバランスを確認します";
  }
  return scoredItem("restingHeartRate", raw, score, signal, note);
}

export function evaluateSpo2(value: string | null | undefined): AiAnalysisItem {
  const raw = textOrNull(value);
  const pct = raw ? parseLeadingNumber(raw) : null;
  if (pct == null) {
    return emptyItem("spo2", raw, "missing", "SpO₂未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (pct >= THRESH.spo2Good) {
    score = 92;
    signal = "high";
    note = `平均SpO₂ ${pct}%は、一般的な目安（95%以上）の範囲にあります。`;
  } else if (pct >= THRESH.spo2Fair) {
    score =
      72 +
      ((pct - THRESH.spo2Fair) / (THRESH.spo2Good - THRESH.spo2Fair)) * 16;
    signal = "moderate";
    note = `平均SpO₂ ${pct}%は、一般的な目安（95%以上）に近い値です。`;
  } else if (pct >= THRESH.spo2Soft) {
    score =
      55 +
      ((pct - THRESH.spo2Soft) / (THRESH.spo2Fair - THRESH.spo2Soft)) * 14;
    signal = "borderline";
    note = `平均SpO₂ ${pct}%は、一般的な目安（95%以上）を下回っています。`;
  } else if (pct >= THRESH.spo2Watch) {
    score =
      40 +
      ((pct - THRESH.spo2Watch) / (THRESH.spo2Soft - THRESH.spo2Watch)) * 14;
    signal = "low";
    note = `平均SpO₂ ${pct}%は、一般的な目安（95%以上）を下回っています。`;
  } else {
    score = Math.max(28, (pct / THRESH.spo2Watch) * 38);
    signal = "low";
    note = `平均SpO₂ ${pct}%は、一般的な目安（95%以上）を下回っています。`;
  }
  return scoredItem("spo2", raw, score, signal, note);
}

export function evaluateRespiratoryRate(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const rpm = raw ? parseLeadingNumber(raw) : null;
  if (rpm == null) {
    return emptyItem("respiratoryRate", raw, "missing", "呼吸数未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (rpm >= 12 && rpm <= 16) {
    score = 88;
    signal = "normal";
    note = "呼吸数は安静時の良好帯です";
  } else if ((rpm >= 10 && rpm < 12) || (rpm > 16 && rpm <= 20)) {
    score = 68;
    signal = "borderline";
    note = "呼吸数はまずまずの範囲です";
  } else {
    score = Math.max(30, 55 - Math.abs(rpm - 14) * 3);
    signal = "elevated";
    note = "呼吸数にばらつきがあります。睡眠中の呼吸安定を確認します";
  }
  return scoredItem("respiratoryRate", raw, score, signal, note);
}

function parseCircadianOffsetMinutes(raw: string): number | null {
  const text = raw.normalize("NFKC").trim();
  const hm = text.match(/^([+-]?)(\d{1,2}):(\d{2})$/);
  if (hm) {
    const sign = hm[1] === "-" ? -1 : 1;
    const h = Number(hm[2]);
    const m = Number(hm[3]);
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return sign * (h * 60 + m);
    }
  }
  const decimal = text.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:h|時間)?$/i);
  if (decimal) {
    const n = Number(decimal[1]);
    if (Number.isFinite(n)) {
      // 絶対値が 24 未満なら時間、それ以上なら分として扱う
      return Math.abs(n) < 24 ? Math.round(n * 60) : Math.round(n);
    }
  }
  const duration = parseDurationMinutes(text);
  if (duration != null) {
    const negative = /^-|遅|ディレイ|遅れ/.test(text);
    return negative ? -Math.abs(duration) : duration;
  }
  return null;
}

export function evaluateCircadianRhythm(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("circadianRhythm", null, "missing", "体内時計未入力");
  }

  const offset = parseCircadianOffsetMinutes(raw);
  if (offset != null) {
    const abs = Math.abs(offset);
    let score: number;
    let signal: string;
    let note: string;
    if (abs <= THRESH.circadianGoodMaxMin) {
      score = 90;
      signal = "aligned";
      note = "体内時計のずれは小さいです";
    } else if (abs <= THRESH.circadianFairMaxMin) {
      score =
        72 +
        ((THRESH.circadianFairMaxMin - abs) /
          (THRESH.circadianFairMaxMin - THRESH.circadianGoodMaxMin)) *
          14;
      signal = "mild_shift";
      note = "体内時計に軽度のずれがあります";
    } else if (abs <= THRESH.circadianSoftMaxMin) {
      score =
        58 +
        ((THRESH.circadianSoftMaxMin - abs) /
          (THRESH.circadianSoftMaxMin - THRESH.circadianFairMaxMin)) *
          12;
      signal = offset < 0 ? "delayed" : "advanced";
      note =
        offset < 0
          ? "体内時計の遅れが示唆されます。朝の光と起床固定が有効です"
          : "体内時計がやや前倒しの可能性があります";
    } else {
      score = Math.max(30, 55 - (abs - THRESH.circadianSoftMaxMin) / 5);
      signal = offset < 0 ? "delayed" : "advanced";
      note = "体内時計のずれが大きめです。光環境と起床リズムを優先します";
    }
    return scoredItem("circadianRhythm", raw, score, signal, note);
  }

  const delayed = includesAny(raw, ["遅", "ディレイ", "遅れ", "夜型"]);
  const advanced = includesAny(raw, ["進", "早", "朝型"]);
  const aligned = includesAny(raw, ["良好", "安定", "整", "オンタイム", "正常"]);

  if (aligned && !delayed) {
    return scoredItem(
      "circadianRhythm",
      raw,
      88,
      "aligned",
      "体内時計は整っている印象です",
    );
  }
  if (delayed) {
    return scoredItem(
      "circadianRhythm",
      raw,
      55,
      "delayed",
      "体内時計の遅れが示唆されます。朝の光と起床固定が有効です",
    );
  }
  if (advanced) {
    return scoredItem(
      "circadianRhythm",
      raw,
      62,
      "advanced",
      "体内時計がやや前倒しの可能性があります",
    );
  }
  return scoredItem(
    "circadianRhythm",
    raw,
    65,
    "unclear",
    "体内時計の記述あり。継続観察で傾向を確認します",
  );
}

export function evaluateSkinTemperature(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("skinTemperature", null, "missing", "皮膚温未入力");
  }
  const n = parseLeadingNumber(raw.replace(/℃|°C|度/gi, ""));
  if (n == null) {
    return emptyItem("skinTemperature", raw, "missing", "皮膚温を解釈できません");
  }
  // 表示は基準差（例: -0.9℃）として扱う
  const abs = Math.abs(n);
  let score: number;
  let signal: string;
  let note: string;
  if (abs <= THRESH.skinGoodAbs) {
    score = 90;
    signal = "stable";
    note = "皮膚温のずれは小さいです";
  } else if (abs <= THRESH.skinFairAbs) {
    score =
      72 +
      ((THRESH.skinFairAbs - abs) /
        (THRESH.skinFairAbs - THRESH.skinGoodAbs)) *
        14;
    signal = "mild";
    note = "皮膚温に軽度のずれがあります";
  } else if (abs <= THRESH.skinSoftAbs) {
    score =
      58 +
      ((THRESH.skinSoftAbs - abs) /
        (THRESH.skinSoftAbs - THRESH.skinFairAbs)) *
        12;
    signal = "shifted";
    note = "皮膚温のずれがややあります。回復負荷の参考指標です";
  } else {
    score = Math.max(30, 55 - (abs - THRESH.skinSoftAbs) * 20);
    signal = "elevated_shift";
    note = "皮膚温のずれが大きめです。体調・環境要因の確認が有効です";
  }
  return scoredItem("skinTemperature", raw, score, signal, note);
}

export function evaluateMeals(lifestyle: AiSleepAnalysisInput["lifestyle"]): AiAnalysisItem {
  const parts = [
    textOrNull(lifestyle.breakfast),
    textOrNull(lifestyle.lunch),
    textOrNull(lifestyle.dinner),
  ].filter(Boolean) as string[];
  if (parts.length === 0) {
    return emptyItem("meals", null, "missing", "食事情報未入力");
  }
  const joined = parts.join(" / ");
  const lateDinner = parts.some((p) => isLateMarker(p) || includesAny(p, ["遅め", "重い", "多め"]));
  const skipped = parts.some((p) => isNegativeLifestyle(p) || includesAny(p, ["抜", "スキップ"]));
  const balanced = parts.some((p) =>
    includesAny(p, ["野菜", "魚", "バランス", "定食", "味噌汁"]),
  );

  if (lateDinner || skipped) {
    return scoredItem(
      "meals",
      joined,
      lateDinner ? 42 : 48,
      lateDinner ? "late_heavy" : "skipped",
      lateDinner
        ? "夕食タイミングや内容が睡眠に影響しそうです"
        : "食事の欠食があり、リズムへの影響が考えられます",
    );
  }
  if (balanced) {
    return scoredItem(
      "meals",
      joined,
      82,
      "balanced",
      "食事内容は睡眠を支えやすい傾向です",
    );
  }
  return scoredItem("meals", joined, 65, "neutral", "食事習慣は標準的です");
}

export function evaluateAlcohol(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("alcohol", null, "missing", "飲酒情報未入力");
  }
  if (isNegativeLifestyle(raw)) {
    return scoredItem(
      "alcohol",
      raw,
      92,
      "none",
      "飲酒なしは睡眠の質を守りやすい選択です",
    );
  }
  const heavy = includesAny(raw, [
    "多い",
    "深酒",
    "ワイン",
    "日本酒",
    "焼酎",
    "2杯",
    "3杯",
    "500",
    "缶",
  ]);
  return scoredItem(
    "alcohol",
    raw,
    heavy ? 35 : 52,
    heavy ? "heavy" : "light",
    heavy
      ? "飲酒量が深睡眠・中途覚醒に影響しやすい水準です"
      : "飲酒あり。量と終了時刻の見直しが有効です",
  );
}

export function evaluateCaffeine(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("caffeine", null, "missing", "カフェイン情報未入力");
  }
  if (isNegativeLifestyle(raw)) {
    return scoredItem(
      "caffeine",
      raw,
      90,
      "none",
      "カフェインなし／控えめは入眠に有利です",
    );
  }
  const late = includesAny(raw, [
    "夕方",
    "夜",
    "17:",
    "18:",
    "19:",
    "20:",
    "21:",
    "午後遅",
  ]);
  const multiple = includesAny(raw, ["2杯", "3杯", "複数", "何杯"]);
  if (late || multiple) {
    return scoredItem(
      "caffeine",
      raw,
      late ? 38 : 48,
      late ? "late" : "high_volume",
      late
        ? "夕方以降のカフェインが入眠を妨げやすいです"
        : "カフェイン量が多めです。終了時刻の前倒しを検討します",
    );
  }
  return scoredItem(
    "caffeine",
    raw,
    72,
    "moderate_early",
    "カフェイン摂取は比較的コントロールされています",
  );
}

export function evaluateExercise(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("exercise", null, "missing", "運動情報未入力");
  }
  if (isNegativeLifestyle(raw)) {
    return scoredItem(
      "exercise",
      raw,
      45,
      "none",
      "運動習慣が薄いと入眠と深睡眠の伸びが鈍りやすいです",
    );
  }
  const lateIntense = includesAny(raw, [
    "夜",
    "就寝前",
    "高強度",
    "筋トレ",
    "HIIT",
    "22:",
    "23:",
  ]);
  if (lateIntense) {
    return scoredItem(
      "exercise",
      raw,
      50,
      "late_intense",
      "夜の高強度運動は心拍の落ち着きを遅らせることがあります",
    );
  }
  return scoredItem(
    "exercise",
    raw,
    85,
    "supportive",
    "運動習慣は睡眠の土台を支えています",
  );
}

export function evaluateBathing(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("bathing", null, "missing", "入浴情報未入力");
  }
  if (includesAny(raw, ["湯船", "入浴", "バス", "半身浴"])) {
    return scoredItem(
      "bathing",
      raw,
      86,
      "bath",
      "湯船での入浴は入眠準備に良い習慣です",
    );
  }
  if (includesAny(raw, ["シャワー"])) {
    return scoredItem(
      "bathing",
      raw,
      68,
      "shower",
      "シャワー中心。湯船を取り入れると副交感の立ち上がりが期待できます",
    );
  }
  if (isNegativeLifestyle(raw)) {
    return scoredItem(
      "bathing",
      raw,
      48,
      "skipped",
      "入浴なしは体温リズムの整えにくさにつながることがあります",
    );
  }
  return scoredItem("bathing", raw, 65, "neutral", "入浴習慣を継続観察します");
}

export function evaluatePreBedBehavior(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem(
      "preBedBehavior",
      null,
      "missing",
      "就寝前行動未入力",
    );
  }
  if (isPhoneHeavy(raw)) {
    return scoredItem(
      "preBedBehavior",
      raw,
      40,
      "screen",
      "就寝前の画面時間が深睡眠・入眠に影響しやすいです",
    );
  }
  if (includesAny(raw, ["読書", "ストレッチ", "呼吸", "瞑想", "日記", "ヨガ"])) {
    return scoredItem(
      "preBedBehavior",
      raw,
      88,
      "wind_down",
      "就寝前のクールダウンが整っています",
    );
  }
  return scoredItem(
    "preBedBehavior",
    raw,
    62,
    "neutral",
    "就寝前行動は標準的です。ルーティン固定で安定しやすくなります",
  );
}

/** 全項目を評価 */
export function evaluateAllItems(
  input: AiSleepAnalysisInput,
): AiAnalysisItem[] {
  const m = input.metrics;
  const l = input.lifestyle;
  return [
    evaluateSleepScore(m.sleepScore),
    evaluateSleepDuration(m.sleepDuration),
    evaluateSleepEfficiency(m.sleepEfficiency),
    evaluateSleepDebt(m.sleepDebt),
    evaluateSleepLatency(m.sleepLatency),
    evaluateDeepSleep(m.deepSleep),
    evaluateRemSleep(m.remSleep),
    evaluateAwakenings(m.awakenings),
    evaluateHrv(m.hrv),
    evaluateStress(m.stress),
    evaluateRestingHeartRate(m.restingHeartRate),
    evaluateSpo2(m.spo2),
    evaluateRespiratoryRate(m.respiratoryRate),
    evaluateCircadianRhythm(m.circadianRhythm),
    evaluateSkinTemperature(m.skinTemperature),
    evaluateMeals(l),
    evaluateAlcohol(l.alcohol),
    evaluateCaffeine(l.caffeine),
    evaluateExercise(l.exercise),
    evaluateBathing(l.bathing),
    evaluatePreBedBehavior(l.preBedBehavior),
  ];
}

/**
 * Sleep Wellness Institute Japan 独自スコア。
 * 生理指標を主軸とし、SOXAI睡眠スコアは参考（おおよそ 5〜10%）。
 * 生活習慣項目はカウンセリング用に評価するが、総合点には含めない。
 */
export function computeWellnessScore(items: AiAnalysisItem[]): number {
  /** 相対重み。sleepScore ≈ 全体の 8% になるよう設定 */
  const weight: Partial<Record<AiAnalysisItemKey, number>> = {
    sleepDuration: 1.05,
    sleepEfficiency: 1.15,
    sleepDebt: 0.95,
    sleepLatency: 0.85,
    awakenings: 1.05,
    deepSleep: 1.2,
    remSleep: 1.0,
    hrv: 1.05,
    restingHeartRate: 0.95,
    stress: 0.95,
    spo2: 1.05,
    respiratoryRate: 0.85,
    circadianRhythm: 0.95,
    skinTemperature: 0.75,
    // SOXAI 参考（≈8%）
    sleepScore: 1.15,
    // 生活習慣は総合点に入れない
    meals: 0,
    alcohol: 0,
    caffeine: 0,
    exercise: 0,
    bathing: 0,
    preBedBehavior: 0,
  };

  const scored = items.filter(
    (i) =>
      i.normalizedScore != null &&
      (weight[i.key] ?? 0) > 0,
  );
  if (scored.length === 0) return 70;

  let sum = 0;
  let wSum = 0;
  for (const item of scored) {
    const w = weight[item.key] ?? 0;
    sum += (item.normalizedScore as number) * w;
    wSum += w;
  }
  return clamp100(sum / wSum);
}

function pickGoodItems(items: AiAnalysisItem[], limit = 4): AiAnalysisItem[] {
  return [...items]
    .filter((i) => i.status === "good")
    .sort(
      (a, b) => (b.normalizedScore ?? 0) - (a.normalizedScore ?? 0),
    )
    .slice(0, limit);
}

function pickAttentionItems(
  items: AiAnalysisItem[],
  limit = 5,
): AiAnalysisItem[] {
  return [...items]
    .filter(
      (i) =>
        i.status === "needs_attention" ||
        (i.status === "fair" && (i.normalizedScore ?? 100) < 65),
    )
    .sort((a, b) => (a.normalizedScore ?? 100) - (b.normalizedScore ?? 100))
    .slice(0, limit);
}

/**
 * Sleep Wellness Insight の優先順位（①が最優先）。
 * 深い睡眠だけを最重要課題にしない。改善効果が高い順に評価する。
 */
export const INSIGHT_PRIORITY_KEYS: readonly AiAnalysisItemKey[] = [
  "sleepDuration",
  "deepSleep",
  "sleepEfficiency",
  "sleepLatency",
  "awakenings",
  "stress",
  "hrv",
  "spo2",
  "respiratoryRate",
  "circadianRhythm",
] as const;

const INSIGHT_WEAK_THRESHOLD = 70;
const INSIGHT_STRENGTH_THRESHOLD = 75;

function formatInsightEvidence(item: AiAnalysisItem): string {
  const v = withUnit(formatEvidenceValue(item.rawValue), item.key);
  return v ? `${item.label}${v}` : item.label;
}

/**
 * 優先順位に沿い、整え余地がある項目から
 * 「最重要課題（改善効果が最も高い項目）」を選ぶ。
 */
export function selectInsightFocus(items: AiAnalysisItem[]): {
  focus: AiAnalysisItem | null;
  supporting: AiAnalysisItem[];
  strengths: AiAnalysisItem[];
} {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const ordered = INSIGHT_PRIORITY_KEYS.map((key) => byKey.get(key)).filter(
    (item): item is AiAnalysisItem =>
      Boolean(item) && typeof item?.normalizedScore === "number",
  );

  const weak = ordered.filter(
    (item) => (item.normalizedScore as number) < INSIGHT_WEAK_THRESHOLD,
  );
  // ①→⑧の順で最初に弱い項目 = 今回もっとも改善効果が高い焦点
  const focus = weak[0] ?? null;
  const supporting = weak.filter((item) => item.key !== focus?.key).slice(0, 3);
  const strengths = ordered
    .filter(
      (item) => (item.normalizedScore as number) >= INSIGHT_STRENGTH_THRESHOLD,
    )
    .slice(0, 3);

  return { focus, supporting, strengths };
}

function insightActionFor(key: AiAnalysisItemKey): string {
  switch (key) {
    case "sleepDuration":
      return "今夜は就寝時刻を前倒しし、少なくとも6時間30分以上の睡眠機会を確保する";
    case "sleepEfficiency":
      return "入眠できないときは一度ベッドを離れ、眠気を再確認してから戻る習慣を今夜試す";
    case "deepSleep":
      return "就寝90分前から画面を控え、湯船かストレッチで深睡眠の入りを整える";
    case "sleepLatency":
      return "就寝前30分はデジタルオフにし、呼吸リセットで入眠までの時間を短縮する";
    case "awakenings":
      return "寝室の温度・光・騒音を点検し、再入眠しやすい環境を今夜整える";
    case "hrv":
      return "午後の予定を1つ減らし、就寝前に短い休息で回復余白をつくる";
    case "stress":
      return "就寝前に4〜6呼吸を3分行い、副交感神経の立ち上がりを助ける";
    case "spo2":
      return "鼻呼吸や側臥位など、呼吸が安定しやすい姿勢を今夜試す";
    case "respiratoryRate":
      return "就寝前のリラックスと鼻呼吸で、呼吸の安定を意識する";
    case "circadianRhythm":
      return "明日の起床時刻を固定し、起床後15分以内に朝の光を浴びる";
    default:
      return "良い習慣を1つ丁寧に実行し、次回比較で変化を確認する";
  }
}

function insightChallengeLead(item: AiAnalysisItem): string {
  const evidence = formatInsightEvidence(item);
  switch (item.key) {
    case "sleepDuration":
      return `総睡眠の不足（${evidence}）が、今回もっとも整える価値の高い課題と考えられます`;
    case "sleepEfficiency":
      return `睡眠の連続性・効率（${evidence}）が、今回もっとも整える価値の高い課題と考えられます`;
    case "deepSleep":
      return `身体回復の核となる深睡眠（${evidence}）が、今回もっとも整える価値の高い課題と考えられます`;
    case "sleepLatency":
      return `入眠までの時間（${evidence}）が、今回もっとも整える価値の高い課題と考えられます`;
    case "awakenings":
      return `夜間の覚醒（${evidence}）が、今回もっとも整える価値の高い課題と考えられます`;
    case "hrv":
      return `回復余力を示すHRV（心拍のゆらぎ）（${evidence}）が、今回もっとも整える価値の高い課題と考えられます`;
    case "stress":
      return `測定ストレス（${evidence}）が、今回もっとも整える価値の高い課題と考えられます`;
    case "circadianRhythm":
      return `体内時計のずれ（${evidence}）が、今回もっとも整える価値の高い課題と考えられます`;
    default:
      return `${evidence}が、今回もっとも整える価値の高い課題と考えられます`;
  }
}

/**
 * @deprecated Sleep Wellness Insight は GPT が毎回生成する。固定テンプレは本番で使わない。
 * Sleep Wellness Insight（認定講師がそのまま説明できる品質）。
 * 優先順位: 睡眠時間 → 深い睡眠 → 効率 → 入眠潜時 → 覚醒 → ストレス → HRV → SpO₂ → 呼吸数 → 体内時計
 */
export function buildSleepWellnessInsight(args: {
  clientName?: string;
  items: AiAnalysisItem[];
}): string {
  const name = (args.clientName ?? "").trim() || "クライアント";
  const { focus, supporting, strengths } = selectInsightFocus(args.items);

  const strengthText =
    strengths.length > 0
      ? strengths.map(formatInsightEvidence).join("、")
      : null;
  const supportText =
    supporting.length > 0
      ? supporting.map(formatInsightEvidence).join("、")
      : null;

  const challenge = focus
    ? `${name}さんの今回データでは、${insightChallengeLead(focus)}。` +
      (supportText
        ? `あわせて${supportText}にも整え余地があり、単一指標ではなく関連として捉えます。`
        : `優先順位の高い睡眠指標から見たとき、ここに着手すると改善効果が最も期待できます。`)
    : `${name}さんの今回データでは、優先指標に大きな崩れは少なく、再現性の維持が焦点です。`;

  const rationaleParts: string[] = [];
  if (strengthText) {
    rationaleParts.push(
      `前向きなサインとして${strengthText}が確認できます。`,
    );
  }
  if (focus) {
    rationaleParts.push(
      `一方で${formatInsightEvidence(focus)}が優先順位の高い位置で弱く、` +
        (supportText
          ? `${supportText}との組み合わせから、回復の土台が十分に整いきっていない可能性が考えられます。`
          : `ここを整えると他指標への波及も期待できると考えられます。`),
    );
  } else {
    rationaleParts.push(
      `複数指標を横断すると大きな崩れは少なく、良い点の維持と小さなばらつきの観察が中心になります。`,
    );
  }
  if (!strengthText && !focus) {
    rationaleParts.push(
      `未確認の項目は推測せず、確認できた指標の範囲で判断しています。`,
    );
  }

  const action = focus
    ? `${insightActionFor(focus.key)}ことが、今回のデータ関連からみて最も改善効果が高い行動と考えられます。` +
      (focus.key === "sleepDuration" || focus.key === "sleepEfficiency"
        ? `睡眠の量と質が整うと、覚醒・HRV・ストレス側への好影響も期待できます。`
        : `無理に全部を変えず、この一点を丁寧に実行することが優先です。`)
    : `良い習慣を1つ崩さず継続し、次回分析で優先指標の変化を確認していくことが、いま最も効果が高い行動と考えられます。`;

  const structured = [
    "■最重要課題",
    challenge,
    "■判断根拠",
    rationaleParts.join(""),
    "■最も改善効果が高い行動",
    action,
  ].join("\n");

  if (structured.length <= 520) return structured;
  return `${structured.slice(0, 519)}…`;
}

/** ① 総合評価 */
export function generateOverallEvaluation(
  clientName: string,
  items: AiAnalysisItem[],
  wellnessScore: number,
): string {
  const name = clientName.trim() || "クライアント";
  const goods = pickGoodItems(items, 2);
  const issues = pickAttentionItems(items, 2);
  const goodText =
    goods.length > 0
      ? goods
          .map((g) => {
            const v = formatEvidenceValue(g.rawValue);
            return v ? `${g.label}${v}` : g.label;
          })
          .join("・")
      : "いくつか安定した指標";
  const issueText =
    issues.length > 0
      ? issues
          .map((i) => {
            const v = formatEvidenceValue(i.rawValue);
            return v ? `${i.label}${v}` : i.label;
          })
          .join("・")
      : "大きな崩れは少ない状態";
  const base =
    `${name}さんの今回の睡眠では、${goodText}に前向きなサインがみられます。` +
    `一方で${issueText}に整え余地があり、生活リズムの調整で改善が期待できます。` +
    `総合ウェルネススコアは${wellnessScore}点です（参考）。`;
  return trimToRange(base, 120, 220);
}

/**
 * Good Point 候補（metrics から判定）。
 * 良好なものだけをスコア順に最大5件返す。固定文は使わない。
 */
const GOOD_POINT_CANDIDATE_KEYS: readonly AiAnalysisItemKey[] = [
  "hrv",
  "spo2",
  "deepSleep",
  "stress",
  "respiratoryRate",
  "circadianRhythm",
  "remSleep",
  "sleepEfficiency",
  "sleepDuration",
] as const;

const GOOD_POINT_THRESHOLD = 70;

function goodPointLabel(key: AiAnalysisItemKey): string {
  switch (key) {
    case "remSleep":
      return "REM十分";
    case "hrv":
      return "HRV高い";
    case "spo2":
      return "SpO₂良い";
    case "sleepEfficiency":
      return "睡眠効率良好";
    case "stress":
      return "ストレス低い";
    case "circadianRhythm":
      return "体内時計正常";
    case "deepSleep":
      return "深睡眠十分";
    case "sleepDuration":
      return "睡眠時間十分";
    case "respiratoryRate":
      return "呼吸数正常";
    default:
      return ITEM_LABELS[key] ?? key;
  }
}

function metricGoodPointSentence(item: AiAnalysisItem): string {
  const v = withUnit(formatEvidenceValue(item.rawValue), item.key);
  const tag = goodPointLabel(item.key);
  switch (item.key) {
    case "remSleep":
      return v ? `${tag}（レム睡眠${v}）` : tag;
    case "hrv":
      return v ? `${tag}（${v}）` : tag;
    case "spo2":
      return v ? `${tag}（${v}）` : tag;
    case "sleepEfficiency":
      return v ? `${tag}（${v}）` : tag;
    case "stress":
      return v ? `${tag}（${v}）` : tag;
    case "circadianRhythm":
      return v ? `${tag}（${v}）` : tag;
    case "deepSleep":
      return v ? `${tag}（深い睡眠${v}）` : tag;
    case "sleepDuration":
      return v ? `${tag}（${v}）` : tag;
    case "respiratoryRate":
      return v ? `${tag}（${v}）` : tag;
    default:
      return v ? `${tag}（${v}）` : tag;
  }
}

/** ② 良い点（取得 metrics から毎回生成・上位5件） */
export function generateGoodPoints(items: AiAnalysisItem[]): string[] {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const qualified = GOOD_POINT_CANDIDATE_KEYS.map((key) => byKey.get(key))
    .filter(
      (item): item is AiAnalysisItem =>
        Boolean(item) &&
        typeof item?.normalizedScore === "number" &&
        (item.normalizedScore as number) >= GOOD_POINT_THRESHOLD,
    )
    .sort(
      (a, b) => (b.normalizedScore as number) - (a.normalizedScore as number),
    )
    .slice(0, 5);

  return qualified.map((item) => metricGoodPointSentence(item));
}

/**
 * 改善提案の優先順位（①が最重要）。
 * 固定文は使わず、metrics の弱さから毎回最大3件を生成する。
 */
export const IMPROVEMENT_PRIORITY_KEYS: readonly AiAnalysisItemKey[] = [
  "sleepDuration",
  "deepSleep",
  "sleepEfficiency",
  "sleepLatency",
  "awakenings",
  "stress",
  "hrv",
  "spo2",
  "respiratoryRate",
  "circadianRhythm",
] as const;

const IMPROVEMENT_WEAK_THRESHOLD = 70;

function improvementActionText(item: AiAnalysisItem): string {
  const v = withUnit(formatEvidenceValue(item.rawValue), item.key);
  switch (item.key) {
    case "sleepDuration":
      return v
        ? `睡眠時間${v}は短めです。就寝を前倒しし、少なくとも6時間30分以上の睡眠機会を確保すると回復の土台が整いやすくなります`
        : `睡眠時間が短めです。就寝を前倒しし、睡眠機会を延ばすと回復の土台が整いやすくなります`;
    case "deepSleep":
      return v
        ? `深睡眠${v}は短めです。就寝90分前の画面オフと入浴・ストレッチで、身体回復の核を伸ばすことが期待できます`
        : `深睡眠が短めです。就寝前ルーティンを整え、身体回復の核を伸ばすことが期待できます`;
    case "sleepEfficiency":
      return v
        ? `睡眠効率${v}はやや低めです。入眠できないときは一度ベッドを離れ、連続睡眠を高める工夫が有効です`
        : `睡眠効率がやや低めです。連続睡眠を高める工夫が有効です`;
    case "sleepLatency":
      return v
        ? `入眠潜時${v}は長めです。就寝前30分のデジタルオフと呼吸リセットで、入眠までの時間短縮が期待できます`
        : `入眠潜時が長めです。就寝前の切り替え行動で入眠までの時間短縮が期待できます`;
    case "awakenings":
      return v
        ? `覚醒時間${v}が長めです。寝室の温度・光・騒音を整え、再入眠しやすい環境づくりを優先しましょう`
        : `覚醒時間が長めです。再入眠しやすい環境づくりを優先しましょう`;
    case "hrv":
      return v
        ? `HRV${v}は回復余力に余地があります。午後の負荷を減らし、就寝前の短い休息で余白をつくることが有効です`
        : `HRVに回復余力の余地があります。負荷調整と就寝前の休息が有効です`;
    case "stress":
      return v
        ? `測定ストレス${v}はやや高めです。就寝前の4〜6呼吸を3分行い、副交感神経の立ち上がりを助けることが期待できます`
        : `測定ストレスがやや高めです。就寝前の呼吸リセットが期待できます`;
    case "spo2":
      return v
        ? `平均SpO₂${v}は、一般的な目安（95%以上）を下回っています。鼻呼吸や側臥位など、呼吸が安定しやすい姿勢を試すことが有効です`
        : `平均SpO₂は、一般的な目安（95%以上）を下回っています。呼吸の安定を優先しましょう`;
    case "respiratoryRate":
      return v
        ? `呼吸数${v}にばらつきがあります。就寝前のリラックスと鼻呼吸の意識が有効です`
        : `呼吸数にばらつきがあります。就寝前のリラックスが有効です`;
    case "circadianRhythm":
      return v
        ? `体内時計（${v}）にずれがあります。起床時刻の固定と朝の光浴でリズムを整えることが期待できます`
        : `体内時計にずれがあります。起床固定と朝の光浴が期待できます`;
    default:
      return v
        ? `${item.label}${v}に整え余地があります。今回のデータに沿って一点ずつ調整しましょう`
        : `${item.label}に整え余地があります。今回のデータに沿って一点ずつ調整しましょう`;
  }
}

function improvementWhyNow(item: AiAnalysisItem, rank: number): string {
  const v = withUnit(formatEvidenceValue(item.rawValue), item.key);
  const priorityHint =
    rank === 0
      ? "改善優先順位で最も効果が高い位置にあるため、いま着手する価値が大きいです。"
      : rank === 1
        ? "最優先の次に効きやすく、次回比較でも変化を確認しやすいためです。"
        : "負荷を抑えつつ続けやすく、他指標への波及も期待できるため残しています。";

  switch (item.key) {
    case "sleepDuration":
      return v
        ? `睡眠時間${v}が短いと深睡眠・効率・HRVにも波及しやすいです。${priorityHint}`
        : `睡眠時間の不足は他指標にも波及しやすいです。${priorityHint}`;
    case "deepSleep":
      return v
        ? `深睡眠${v}は身体回復の核で、翌日コンディションへの影響が大きいです。${priorityHint}`
        : `深睡眠は身体回復の核です。${priorityHint}`;
    case "sleepEfficiency":
      return v
        ? `睡眠効率${v}の低さは覚醒や入眠の影響を反映しやすく、連続性改善の効果が大きいです。${priorityHint}`
        : `睡眠効率の改善は連続性への効果が大きいです。${priorityHint}`;
    case "sleepLatency":
      return v
        ? `入眠潜時${v}が長いと総睡眠・効率を押し下げやすいです。${priorityHint}`
        : `入眠の遅れは総睡眠・効率を押し下げやすいです。${priorityHint}`;
    case "awakenings":
      return v
        ? `覚醒${v}は睡眠の断片化につながり、効率・深睡眠へ影響しやすいです。${priorityHint}`
        : `覚醒の多さは効率・深睡眠へ影響しやすいです。${priorityHint}`;
    case "hrv":
      return v
        ? `HRV${v}は回復余力の指標で、ストレス・休息設計と合わせて整えやすいです。${priorityHint}`
        : `HRVは回復余力の指標です。${priorityHint}`;
    case "stress":
      return v
        ? `ストレス${v}が高めだと入眠・HRVに響きやすいです。${priorityHint}`
        : `ストレスは入眠・HRVに響きやすいです。${priorityHint}`;
    case "spo2":
      return v
        ? `SpO₂${v}は酸素供給の指標で、覚醒や回復感に関わりやすいです。${priorityHint}`
        : `SpO₂は酸素供給と回復感に関わりやすいです。${priorityHint}`;
    case "respiratoryRate":
      return v
        ? `呼吸数${v}の安定は睡眠の連続性に関わりやすいです。${priorityHint}`
        : `呼吸の安定は睡眠の連続性に関わりやすいです。${priorityHint}`;
    case "circadianRhythm":
      return v
        ? `体内時計（${v}）のずれは総睡眠や入眠に波及しやすいです。${priorityHint}`
        : `体内時計のずれは総睡眠や入眠に波及しやすいです。${priorityHint}`;
    default:
      return priorityHint;
  }
}

/**
 * 改善提案を metrics から動的生成（優先順位順・最大3件）。
 * text / whyNow / stars をセットで返す。
 */
export function generateImprovementItems(
  items: AiAnalysisItem[],
): ImprovementItem[] {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const weak = IMPROVEMENT_PRIORITY_KEYS.map((key) => byKey.get(key)).filter(
    (item): item is AiAnalysisItem =>
      Boolean(item) &&
      typeof item?.normalizedScore === "number" &&
      (item.normalizedScore as number) < IMPROVEMENT_WEAK_THRESHOLD,
  );

  return weak.slice(0, 3).map((item, index) => {
    const stars = (index === 0 ? 5 : index === 1 ? 4 : 3) as 5 | 4 | 3;
    return {
      text: improvementActionText(item),
      stars,
      whyNow: improvementWhyNow(item, index),
    };
  });
}

/** ③ 改善ポイント（文字列のみが必要な互換用） */
export function generateImprovementPoints(items: AiAnalysisItem[]): string[] {
  return generateImprovementItems(items).map((item) => item.text);
}

function formatEvidenceValue(rawValue: string | number | null): string {
  if (rawValue == null || rawValue === "") return "";
  return String(rawValue).trim();
}

function withUnit(value: string, key: AiAnalysisItemKey): string {
  if (!value) return "";
  if (key === "hrv" && !/ms/i.test(value)) return `${value}ms`;
  if (key === "sleepEfficiency" && !/%/.test(value)) return `${value}%`;
  if (key === "restingHeartRate" && !/bpm|回/i.test(value)) return `${value}bpm`;
  return value;
}

const CHALLENGE_BY_KEY: Partial<Record<AiAnalysisItemKey, string>> = {
  deepSleep: "就寝90分前から画面をオフにし、湯船かストレッチで深睡眠の入りを整える",
  circadianRhythm: "明日の起床時刻を固定し、起床後15分以内に朝の光を浴びる",
  caffeine: "今日は15時以降のカフェインを控え、水分と軽い散歩で切り替えする",
  alcohol: "今夜の飲酒を控え、終了時刻を早めて睡眠の連続性を守る",
  preBedBehavior: "就寝前30分はスマホを置き、読書か呼吸リセットに切り替える",
  stress: "就寝前に4〜6呼吸を3分行い、心拍の落ち着きを確認する",
  sleepDuration: "今夜は目標就寝時刻を守り、少なくとも6.5時間の機会を確保する",
  sleepEfficiency: "入眠できないときは一度ベッドを離れ、眠気を再確認してから戻る",
  awakenings: "寝室の温度・光・騒音を点検し、再入眠しやすい環境を整える",
  hrv: "午後の過密予定を1つ減らし、回復のための余白をつくる",
  meals: "夕食を就寝3時間前までに終え、消化負荷を下げる",
  exercise: "夕方の軽い有酸素を20〜30分行い、夜の高強度は避ける",
  remSleep: "起床・就寝時刻のばらつきを±30分に収め、レムの連続性を支える",
  restingHeartRate: "就寝前の入浴と呼吸で心拍を落とし、回復モードへ切り替える",
  bathing: "就寝60〜90分前に湯船へ入り、体温低下の波を活用する",
  sleepScore: "今夜は1つだけ生活習慣を変え、スコアの反応を観察する",
  sleepDebt: "今夜は回復夜として睡眠機会を30〜60分伸ばす",
  sleepLatency: "就寝前のデジタルオフを徹底し、入眠までの時間を短縮する",
  spo2: "鼻呼吸・側臥位など、呼吸が安定しやすい姿勢を試す",
  respiratoryRate: "就寝前のリラックスと鼻呼吸で呼吸の安定を意識する",
  skinTemperature: "寝室温度を調整し、就寝前の体温ダウンを整える",
};

/** ④ 今日の課題 */
export function generateTodaysChallenge(items: AiAnalysisItem[]): string {
  const top = pickAttentionItems(items, 1)[0];
  if (!top) {
    return "今夜は良い習慣を1つだけ丁寧に実行し、再現性を確認する";
  }
  return CHALLENGE_BY_KEY[top.key] ?? `${top.label}の改善アクションを今夜1つ実行する`;
}

const WEEKLY_BY_KEY: Partial<Record<AiAnalysisItemKey, string>> = {
  deepSleep: "深睡眠をあと10〜15分伸ばす（就寝前ルーティン固定）",
  circadianRhythm: "起床時刻を±30分で7日間固定する",
  caffeine: "カフェイン終了を毎日15時までにそろえる",
  alcohol: "飲酒日を週2日以下にし、就寝3時間前までに終える",
  preBedBehavior: "就寝前デジタルオフを週5夜以上実施する",
  stress: "就寝前の呼吸リセットを毎日3分続ける",
  sleepDuration: "週平均の睡眠機会を7時間前後に近づける",
  sleepEfficiency: "睡眠効率85%以上を週の半数の夜で目指す",
  awakenings: "覚醒時間を前回より減らす環境・行動を試す",
  hrv: "HRVが落ちにくい休息日を週に1〜2日入れる",
  meals: "夕食〜就寝の間隔を3時間以上にそろえる",
  exercise: "夕方の軽い運動を週3回以上入れる",
  remSleep: "週末の寝だめを避け、平日と同じ起床リズムを保つ",
  restingHeartRate: "就寝前のクールダウンを習慣化し心拍の落ち着きを見る",
  bathing: "湯船入浴を週4回以上、就寝60〜90分前に実施する",
  sleepScore: "睡眠スコアを前回比で+3〜5点伸ばす",
  sleepDebt: "週の睡眠負債を積み上げない回復夜を2夜入れる",
  sleepLatency: "入眠潜時20分以内を週の半数の夜で目指す",
  spo2: "平均SpO₂の安定を呼吸習慣と合わせて観察する",
  skinTemperature: "皮膚温のばらつきが小さくなる寝室環境を整える",
};

/** ⑤ 来週までの目標 */
export function generateWeeklyGoals(items: AiAnalysisItem[]): string[] {
  const issues = pickAttentionItems(items, 3);
  const goals = issues.map(
    (i) => WEEKLY_BY_KEY[i.key] ?? `${i.label}の改善を1週間観察する`,
  );
  while (goals.length < 4) {
    const fillers = [
      "計測と生活メモを毎日残し、比較材料をそろえる",
      "良い点として出た習慣を崩さず継続する",
      "次回分析で変化を確認できる観点を1つ決めておく",
      "就寝前の切り替え行動を毎晩続ける",
    ];
    goals.push(fillers[goals.length] ?? fillers[0]);
  }
  return goals.slice(0, 6);
}

/** ⑥ 認定講師へのアドバイス */
export function generateInstructorAdvice(
  items: AiAnalysisItem[],
  wellnessScore: number,
): string {
  const issues = pickAttentionItems(items, 3);
  const focus =
    issues.length > 0
      ? issues.map((i) => i.label).join("・")
      : "現状維持と習慣の再現性";
  const counsel =
    issues[0]?.key === "alcohol" || issues[0]?.key === "caffeine"
      ? "量と終了時刻を具体的にヒアリングし、代替行動を一緒に設計してください。"
      : issues[0]?.key === "circadianRhythm"
        ? "起床・朝光・週末の寝だめ有無を確認し、位相のずれ幅を把握してください。"
        : "達成可能な宿題を1〜2個に絞り、次回比較の観点を先に合意してください。";
  return (
    `総合${wellnessScore}点。カウンセリングの主軸は「${focus}」です。${counsel}` +
    `断定せず、クライアントの実行可能性を優先して介入強度を調整してください。`
  );
}

/** ⑦ クライアント向けメッセージ */
export function generateClientMessage(
  clientName: string,
  items: AiAnalysisItem[],
  todaysChallenge: string,
): string {
  const name = clientName.trim() || "あなた";
  const goods = pickGoodItems(items, 1);
  const praise =
    goods.length > 0
      ? `${goods[0].label}に良いサインがあります。`
      : "計測を続けられていること自体が大きな一歩です。";
  return (
    `${name}さん、${praise}` +
    `完璧を目指さず、今夜は「${todaysChallenge}」だけ意識してみましょう。` +
    `小さな積み重ねが、翌週の眠りを変えていきます。`
  );
}

export function buildOpenAiReadyPayload(
  input: AiSleepAnalysisInput,
  items: AiAnalysisItem[],
): AiAnalysisOpenAiReadyPayload {
  return {
    modelHint: "gpt-4o",
    systemRole: SYSTEM_ROLE,
    userContent: {
      clientName: input.clientName?.trim() || "クライアント",
      measurementDate: textOrNull(input.measurementDate),
      items: items.map((item) => ({
        key: item.key,
        label: item.label,
        value: item.rawValue,
        status: item.status,
        note: item.note,
      })),
      lifestyleNotes: textOrNull(input.lifestyle.notes),
    },
    expectedOutputKeys: EXPECTED_OUTPUT_KEYS,
  };
}

function trimToRange(text: string, min: number, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max && t.length >= min) return t;
  if (t.length > max) return `${t.slice(0, max - 1)}…`;
  return t;
}

/** ルールベース本体 */
export function generateRuleBasedAiSleepAnalysis(
  input: AiSleepAnalysisInput,
): AiSleepAnalysisOutput {
  const items = evaluateAllItems(input);
  const wellnessScore = computeWellnessScore(items);
  const clientName = input.clientName?.trim() || "クライアント";
  const overallEvaluation = generateOverallEvaluation(
    clientName,
    items,
    wellnessScore,
  );
  const goodPoints = generateGoodPoints(items);
  const improvementPoints = generateImprovementPoints(items);
  const todaysChallenge = generateTodaysChallenge(items);
  const weeklyGoals = generateWeeklyGoals(items);
  const instructorAdvice = generateInstructorAdvice(items, wellnessScore);
  const clientMessage = generateClientMessage(
    clientName,
    items,
    todaysChallenge,
  );

  return {
    version: AI_SLEEP_ANALYSIS_VERSION,
    source: "rules",
    analyzedAt: new Date().toISOString(),
    clientName,
    measurementDate: textOrNull(input.measurementDate),
    wellnessScore,
    items,
    overallEvaluation,
    goodPoints,
    improvementPoints,
    todaysChallenge,
    weeklyGoals,
    instructorAdvice,
    clientMessage,
    openaiReady: buildOpenAiReadyPayload(input, items),
  };
}

/**
 * 公開エントリポイント。
 * generator 未指定時はルールベース。将来 OpenAI 実装を渡して差し替え可能。
 */
export async function generateAiSleepAnalysis(
  input: AiSleepAnalysisInput,
  generator?: AiSleepAnalysisGenerator,
): Promise<AiSleepAnalysisOutput> {
  if (generator) {
    return generator(input);
  }
  return generateRuleBasedAiSleepAnalysis(input);
}

/** 同期版（ワークスペース・画面組み立て用） */
export function generateAiSleepAnalysisSync(
  input: AiSleepAnalysisInput,
): AiSleepAnalysisOutput {
  return generateRuleBasedAiSleepAnalysis(input);
}

/** —— 入力アダプタ —— */

export function aiInputFromSoxaiAndLifestyle(args: {
  clientName?: string;
  measurementDate?: string;
  instructorName?: string;
  soxai: {
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
  lifestyle: AiSleepAnalysisInput["lifestyle"];
}): AiSleepAnalysisInput {
  const score = parseLeadingNumber(args.soxai.sleepScore);
  return {
    clientName: args.clientName,
    measurementDate: args.measurementDate,
    instructorName: args.instructorName,
    metrics: {
      sleepScore: score,
      sleepDuration: args.soxai.sleepDuration,
      sleepEfficiency: args.soxai.sleepEfficiency,
      deepSleep: args.soxai.deepSleep,
      remSleep: args.soxai.remSleep,
      awakenings: args.soxai.awakenings,
      hrv: args.soxai.hrv,
      stress: args.soxai.stress,
      restingHeartRate: args.soxai.restingHeartRate,
      circadianRhythm: args.soxai.circadianRhythm,
    },
    lifestyle: {
      breakfast: args.lifestyle.breakfast,
      lunch: args.lifestyle.lunch,
      dinner: args.lifestyle.dinner,
      alcohol: args.lifestyle.alcohol,
      caffeine: args.lifestyle.caffeine,
      exercise: args.lifestyle.exercise,
      bathing: args.lifestyle.bathing,
      preBedBehavior: args.lifestyle.preBedBehavior,
      notes: args.lifestyle.notes,
    },
  };
}

export function aiInputFromMetricsAndLifestyle(args: {
  clientName?: string;
  measurementDate?: string;
  metrics: Partial<AnalysisMetrics> | AnalysisMetrics;
  lifestyle: AiSleepAnalysisInput["lifestyle"];
}): AiSleepAnalysisInput {
  return {
    clientName: args.clientName,
    measurementDate: args.measurementDate,
    metrics: {
      sleepScore: args.metrics.sleepScore ?? null,
      sleepDuration: args.metrics.sleepDuration ?? null,
      sleepEfficiency: args.metrics.sleepEfficiency ?? null,
      deepSleep: args.metrics.deepSleep ?? null,
      remSleep: args.metrics.remSleep ?? null,
      awakenings: args.metrics.awakenings ?? null,
      hrv: args.metrics.hrv ?? null,
      stress: args.metrics.stress ?? null,
      restingHeartRate: args.metrics.restingHeartRate ?? null,
      circadianRhythm: args.metrics.circadianRhythm ?? null,
      sleepLatency: args.metrics.sleepLatency ?? null,
      sleepDebt: args.metrics.sleepDebt ?? null,
      spo2: args.metrics.spo2 ?? null,
      respiratoryRate: args.metrics.respiratoryRate ?? null,
      skinTemperature: args.metrics.skinTemperature ?? null,
    },
    lifestyle: args.lifestyle,
  };
}

/** —— 画面別アダプタ（共通利用） —— */

/** Analysis Result / ワークスペース・プレビュー向け */
export function toAiAnalysisPreview(output: AiSleepAnalysisOutput): {
  score: number;
  headline: string;
  summary: string;
  goodPoints: string[];
  focusPoints: string[];
} {
  return {
    score: output.wellnessScore,
    headline: headlineFromOutput(output),
    summary: output.overallEvaluation,
    goodPoints: output.goodPoints.slice(0, 5),
    focusPoints: output.improvementPoints.slice(0, 4),
  };
}

function headlineFromOutput(output: AiSleepAnalysisOutput): string {
  const goods = output.items.filter((i) => i.status === "good").slice(0, 1);
  const issues = pickAttentionItems(output.items, 2);
  const goodLabel = goods[0]?.label ?? "回復の土台";
  const issueLabel =
    issues.length > 0
      ? issues.map((i) => i.label).join("と")
      : "習慣の再現性";
  return `${goodLabel}は良好。${issueLabel}が改善ポイント`;
}

export function toImprovementItems(
  output: AiSleepAnalysisOutput,
): ImprovementItem[] {
  const generated = generateImprovementItems(output.items);
  if (generated.length > 0) return generated;
  // metrics に弱項目がない場合のみ、従来の文字列配列へフォールバック
  return output.improvementPoints.slice(0, 3).map((text, index) => {
    const stars = (index === 0 ? 5 : index === 1 ? 4 : 3) as 5 | 4 | 3;
    return {
      text,
      stars,
      whyNow:
        index === 0
          ? "今回のデータで整え余地が確認できるため優先します。"
          : "再現性を高めやすく、次回比較で変化を確認しやすいためです。",
    };
  });
}

export function toTodaysRecommendations(
  output: AiSleepAnalysisOutput,
): string[] {
  const issues = pickAttentionItems(output.items, 6);
  const byKey = new Map(issues.map((item) => [item.key, item]));
  const candidates: string[] = [];

  const pushUnique = (text: string | undefined) => {
    const trimmed = text?.trim();
    if (!trimmed) return;
    if (candidates.includes(trimmed)) return;
    candidates.push(trimmed);
  };

  if (byKey.has("alcohol")) {
    pushUnique("今日は飲酒終了を就寝3時間前までにする");
  }
  if (byKey.has("circadianRhythm")) {
    pushUnique("今日は起床後30分以内に日光を浴びる");
  }
  if (byKey.has("stress") || byKey.has("hrv")) {
    pushUnique("今日は就寝前に3:6呼吸を5分行う");
  }
  if (byKey.has("exercise")) {
    pushUnique("今日は夕方までに軽い運動を15分入れる");
  }
  if (byKey.has("caffeine")) {
    pushUnique("今日は14時以降のカフェインを控える");
  }
  if (byKey.has("bathing") || byKey.has("preBedBehavior")) {
    pushUnique("今日は就寝90分前に入浴を終える");
  }
  if (byKey.has("sleepDuration") || byKey.has("awakenings")) {
    pushUnique("今日は就寝時刻を30分早める");
  }
  if (byKey.has("meals")) {
    pushUnique("今日は夕食を就寝3時間前までに終える");
  }

  pushUnique(output.todaysChallenge);
  for (const goal of output.weeklyGoals) {
    pushUnique(goal);
  }

  // 最低3件を保証（データに応じた候補を優先）
  while (candidates.length < 3) {
    pushUnique(
      [
        "今日は寝室の照明を就寝1時間前に落とす",
        "今日は寝る直前のスマホを控える",
        "今日は起床時刻を一定にする",
      ][candidates.length],
    );
  }

  return candidates.slice(0, 3);
}

export function toNextActionGoals(
  output: AiSleepAnalysisOutput,
): NextActionGoal[] {
  const goals = [
    output.todaysChallenge,
    ...output.weeklyGoals,
  ].filter((text, index, list) => text && list.indexOf(text) === index);
  return goals.slice(0, 6).map((text, index) => ({
    id: `ai-analysis-goal-${index + 1}`,
    text,
    checked: false,
  }));
}

export function toInstructorSuggestions(
  output: AiSleepAnalysisOutput,
  input?: AiSleepAnalysisInput,
): string[] {
  return flattenCounselingSupport(
    buildCounselingSupportFromAi(output, input),
  );
}

export function toInstructorCounseling(
  output: AiSleepAnalysisOutput,
  input?: AiSleepAnalysisInput,
): import("@/lib/analysis-session").InstructorCounselingPlan {
  const sections = buildCounselingSupportFromAi(output, input);
  return {
    goodPoints: sections.goodPoints,
    needsImprovement: sections.needsImprovement,
    possibleFactors: sections.possibleFactors,
    questionCandidates: sections.questionCandidates,
  };
}

function buildCounselingSupportFromAi(
  output: AiSleepAnalysisOutput,
  input?: AiSleepAnalysisInput,
) {
  const metrics = {
    sleepScore: input?.metrics.sleepScore ?? null,
    sleepDuration: input?.metrics.sleepDuration ?? null,
    sleepEfficiency: input?.metrics.sleepEfficiency ?? null,
    deepSleep: input?.metrics.deepSleep ?? null,
    remSleep: input?.metrics.remSleep ?? null,
    awakenings: input?.metrics.awakenings ?? null,
    hrv: input?.metrics.hrv ?? null,
    stress: input?.metrics.stress ?? null,
    restingHeartRate: input?.metrics.restingHeartRate ?? null,
    sleepLatency: input?.metrics.sleepLatency ?? null,
    sleepDebt: input?.metrics.sleepDebt ?? null,
  };

  // input が無い場合は評価済み items から値を復元
  for (const item of output.items) {
    const raw =
      item.rawValue == null || item.rawValue === ""
        ? null
        : String(item.rawValue);
    if (!raw) continue;
    if (item.key === "deepSleep" && !metrics.deepSleep) metrics.deepSleep = raw;
    if (item.key === "remSleep" && !metrics.remSleep) metrics.remSleep = raw;
    if (item.key === "sleepEfficiency" && !metrics.sleepEfficiency) {
      metrics.sleepEfficiency = raw;
    }
    if (item.key === "awakenings" && !metrics.awakenings) {
      metrics.awakenings = raw;
    }
    if (item.key === "hrv" && !metrics.hrv) metrics.hrv = raw;
    if (item.key === "stress" && !metrics.stress) metrics.stress = raw;
    if (item.key === "restingHeartRate" && !metrics.restingHeartRate) {
      metrics.restingHeartRate = raw;
    }
    if (item.key === "sleepDuration" && !metrics.sleepDuration) {
      metrics.sleepDuration = raw;
    }
  }

  return buildCounselingSupport({
    metrics,
    lifestyle: input?.lifestyle
      ? {
          caffeine: input.lifestyle.caffeine,
          alcohol: input.lifestyle.alcohol,
          preBedBehavior: input.lifestyle.preBedBehavior,
          notes: input.lifestyle.notes,
          dinner: input.lifestyle.dinner,
          bathing: input.lifestyle.bathing,
        }
      : null,
  });
}

export type AiRecommendationCategory =
  | "sleep"
  | "exercise"
  | "meal"
  | "stress"
  | "lifestyle";

export type AiRecommendationCard = {
  category: AiRecommendationCategory;
  label: string;
  title: string;
  body: string;
};

export function toRecommendationCards(
  output: AiSleepAnalysisOutput,
): AiRecommendationCard[] {
  const byKey: Partial<Record<AiAnalysisItemKey, AiRecommendationCategory>> = {
    deepSleep: "sleep",
    sleepDuration: "sleep",
    sleepEfficiency: "sleep",
    sleepDebt: "sleep",
    sleepLatency: "sleep",
    awakenings: "sleep",
    remSleep: "sleep",
    spo2: "sleep",
    exercise: "exercise",
    meals: "meal",
    alcohol: "meal",
    caffeine: "meal",
    stress: "stress",
    hrv: "stress",
    preBedBehavior: "lifestyle",
    bathing: "lifestyle",
    circadianRhythm: "lifestyle",
    skinTemperature: "lifestyle",
    restingHeartRate: "lifestyle",
    sleepScore: "sleep",
  };

  const issues = pickAttentionItems(output.items, 5);
  const cards: AiRecommendationCard[] = issues.map((item) => {
    const category = byKey[item.key] ?? "lifestyle";
    const labelMap = {
      sleep: "睡眠",
      exercise: "運動",
      meal: "食事",
      stress: "ストレス",
      lifestyle: "生活習慣",
    } as const;
    return {
      category,
      label: labelMap[category],
      title: WEEKLY_BY_KEY[item.key]?.split("（")[0] ?? `${item.label}の改善`,
      body: CHALLENGE_BY_KEY[item.key] ?? item.note,
    };
  });

  const needed: AiRecommendationCategory[] = [
    "sleep",
    "exercise",
    "meal",
    "stress",
    "lifestyle",
  ];
  for (const cat of needed) {
    if (cards.some((c) => c.category === cat)) continue;
    const fallback: Record<AiRecommendationCategory, AiRecommendationCard> = {
      sleep: {
        category: "sleep",
        label: "睡眠",
        title: "就寝前ルーティンの固定",
        body: output.todaysChallenge,
      },
      exercise: {
        category: "exercise",
        label: "運動",
        title: "夕方の軽い有酸素を継続",
        body: "過度な夜の高強度を避け、心拍の落ち着きを優先します。",
      },
      meal: {
        category: "meal",
        label: "食事",
        title: "夕食タイミングの見直し",
        body: "消化負荷を下げ、入眠と中途覚醒の改善を狙います。",
      },
      stress: {
        category: "stress",
        label: "ストレス",
        title: "就寝前の呼吸リセット",
        body: "4〜6呼吸を3分。副交感神経の立ち上がりをサポートします。",
      },
      lifestyle: {
        category: "lifestyle",
        label: "生活習慣",
        title: "起床時刻の固定",
        body: "体内時計の位相を整え、翌日の眠気リズムを安定させます。",
      },
    };
    cards.push(fallback[cat]);
  }
  return cards.slice(0, 5);
}

/** Sleep Journey 向け抜粋 */
export type JourneyAiExcerpt = {
  instructorComment: string;
  improvementPoints: string[];
  instructorMessage: string;
  missionTitles: string[];
};

export function toJourneyExcerpt(
  output: AiSleepAnalysisOutput,
): JourneyAiExcerpt {
  return {
    instructorComment: output.overallEvaluation,
    improvementPoints: output.improvementPoints.slice(0, 3),
    instructorMessage: output.instructorAdvice,
    missionTitles: [
      output.todaysChallenge,
      ...output.weeklyGoals.slice(0, 2),
    ],
  };
}

/** Report 向け抜粋 */
export type ReportAiExcerpt = {
  title: string;
  summary: string;
  goodPoints: string[];
  improvementPoints: string[];
  instructorAdvice: string;
  clientMessage: string;
  wellnessScore: number;
};

export function toReportExcerpt(
  output: AiSleepAnalysisOutput,
): ReportAiExcerpt {
  return {
    title: "Sleep Wellness Report",
    summary: output.overallEvaluation,
    goodPoints: output.goodPoints,
    improvementPoints: output.improvementPoints,
    instructorAdvice: output.instructorAdvice,
    clientMessage: output.clientMessage,
    wellnessScore: output.wellnessScore,
  };
}

/** Homework 向けドラフト */
export type HomeworkAiDraft = {
  title: string;
  description: string;
  instructorComment: string;
  clientMessage: string;
  priority: "high" | "medium" | "low";
};

export function toHomeworkDrafts(
  output: AiSleepAnalysisOutput,
): HomeworkAiDraft[] {
  const issues = pickAttentionItems(output.items, 3);
  const drafts: HomeworkAiDraft[] = issues.map((item, index) => ({
    title: WEEKLY_BY_KEY[item.key]?.split("（")[0] ?? `${item.label}の改善`,
    description: CHALLENGE_BY_KEY[item.key] ?? item.note,
    instructorComment: output.instructorAdvice,
    clientMessage: index === 0 ? output.clientMessage : output.todaysChallenge,
    priority: (index === 0 ? "high" : index === 1 ? "medium" : "low") as
      | "high"
      | "medium"
      | "low",
  }));

  if (drafts.length === 0) {
    drafts.push({
      title: "良い習慣の継続",
      description: output.todaysChallenge,
      instructorComment: output.instructorAdvice,
      clientMessage: output.clientMessage,
      priority: "medium",
    });
  }
  return drafts;
}

/** AnalysisResult に載せる本文フィールド一式 */
export type AnalysisResultAiFields = {
  summary: string;
  karteSummary: string;
  goodPoints: string[];
  improvements: ImprovementItem[];
  profileRelation: string;
  scoreComment: string;
  categoryScoreRationales?: import("@/lib/analysis-session").CategoryScoreRationales;
  todaysRecommendations: string[];
  nextComparisonPoints: string[];
  recommendationsUntilNext: NextActionGoal[];
  instructorSuggestions: string[];
  instructorCounseling?: import("@/lib/analysis-session").InstructorCounselingPlan;
  melatoninYogaPlan?: import("@/lib/analysis-session").MelatoninYogaPlan;
  comparisonNarrative?: import("@/lib/analysis-session").ComparisonNarrative;
  score: number;
};

export function toAnalysisResultFields(
  output: AiSleepAnalysisOutput,
  input?: AiSleepAnalysisInput,
): AnalysisResultAiFields {
  const topIssues = pickAttentionItems(output.items, 3);
  const insightFocus = selectInsightFocus(output.items);
  const instructorCounseling = toInstructorCounseling(output, input);
  const byKey = (key: AiAnalysisItemKey) =>
    output.items.find((item) => item.key === key)?.normalizedScore;
  const avg = (keys: AiAnalysisItemKey[]) => {
    const vals = keys
      .map(byKey)
      .filter((n): n is number => typeof n === "number");
    if (vals.length === 0) return output.wellnessScore;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };
  const categoryScores = {
    body: avg([
      "sleepDuration",
      "sleepEfficiency",
      "deepSleep",
      "remSleep",
      "awakenings",
      "restingHeartRate",
      "spo2",
      "sleepDebt",
      "sleepLatency",
    ]),
    mind: avg(["hrv", "stress", "skinTemperature", "respiratoryRate"]),
    lifestyle: avg(["meals", "alcohol", "caffeine", "exercise", "bathing"]),
    environment: avg(["circadianRhythm", "preBedBehavior"]),
  };

  return {
    summary: output.overallEvaluation,
    // Sleep Wellness Insight は GPT が毎回生成する（固定テンプレ禁止）
    karteSummary: "",
    goodPoints: output.goodPoints,
    improvements: toImprovementItems(output),
    profileRelation:
      output.items
        .filter((i) =>
          (
            [
              "meals",
              "alcohol",
              "caffeine",
              "exercise",
              "bathing",
              "preBedBehavior",
            ] as AiAnalysisItemKey[]
          ).includes(i.key),
        )
        .map((i) => i.note)
        .slice(0, 3)
        .join(" ") ||
      "当日の生活習慣と睡眠指標の関連を確認しました。",
    scoreComment: `${headlineFromOutput(output)}（Sleep Wellness Score ${output.wellnessScore}）`,
    categoryScoreRationales: {
      body: `身体 ${categoryScores.body}点。睡眠時間・効率・深い睡眠など身体回復の指標を中心に評価しています。`,
      mind: `心 ${categoryScores.mind}点。HRV・ストレス・呼吸数などの指標を中心に評価しています。`,
      lifestyle: `生活 ${categoryScores.lifestyle}点。飲酒・運動・食事リズムなどの当日習慣を反映しています。`,
      environment: `環境 ${categoryScores.environment}点。体内時計など入力のある環境要因を反映した参考値です。`,
    },
    todaysRecommendations: toTodaysRecommendations(output),
    nextComparisonPoints: (insightFocus.focus
      ? [insightFocus.focus, ...insightFocus.supporting]
      : topIssues
    )
      .filter((item): item is AiAnalysisItem => Boolean(item))
      .map((i) => i.label)
      .concat(
        !(insightFocus.focus || topIssues.length)
          ? ["就寝前行動の実施率"]
          : [],
      )
      .slice(0, 4),
    recommendationsUntilNext: toNextActionGoals(output),
    instructorSuggestions: toInstructorSuggestions(output, input),
    instructorCounseling,
    melatoninYogaPlan: {
      recommendedPhase:
        insightFocus.focus?.key === "stress" ||
        insightFocus.focus?.key === "hrv"
          ? "Phase 2 自律神経調整"
          : insightFocus.focus?.key === "circadianRhythm"
            ? "Phase 3 リズム定着"
            : "Phase 1 入眠導入",
      breathing: "3:6呼吸を就寝前5分",
      bathing: "就寝90分前・38〜40℃で15分",
      morningAction: "起床後30分以内に10分の外光",
    },
    comparisonNarrative: {
      vsPrevious: "",
      vsFirst: "",
    },
    score: output.wellnessScore,
  };
}
