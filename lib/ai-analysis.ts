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

export const AI_SLEEP_ANALYSIS_VERSION = "1.0" as const;

export type AiAnalysisSource = "rules" | "openai";

/** 分析対象 16 項目 */
export type AiAnalysisItemKey =
  | "sleepScore"
  | "sleepDuration"
  | "sleepEfficiency"
  | "deepSleep"
  | "remSleep"
  | "awakenings"
  | "hrv"
  | "stress"
  | "restingHeartRate"
  | "circadianRhythm"
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
  sleepScore: "睡眠スコア",
  sleepDuration: "睡眠時間",
  sleepEfficiency: "睡眠効率",
  deepSleep: "深睡眠",
  remSleep: "レム睡眠",
  awakenings: "中途覚醒",
  hrv: "HRV",
  stress: "ストレス",
  restingHeartRate: "安静時心拍",
  circadianRhythm: "体内時計",
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
  "あなたは Sleep Wellness Institute Japan の睡眠ウェルネス分析エンジンです。" +
  "医療診断は行わず、生活改善のための観察・提案のみを日本語で返します。" +
  "必ず良い点から触れ、断定的な病名診断は避けてください。";

/** —— 閾値（ルールベース） —— */
const THRESH = {
  sleepScoreGood: 80,
  sleepScoreFair: 65,
  durationGoodMin: 7 * 60,
  durationFairMin: 6 * 60,
  durationMaxMin: 9 * 60,
  efficiencyGood: 90,
  efficiencyFair: 85,
  deepGoodMin: 75,
  deepFairMin: 55,
  remGoodMin: 90,
  remFairMin: 70,
  awakeningsGoodMax: 1,
  awakeningsFairMax: 3,
  hrvGood: 50,
  hrvFair: 35,
  stressGoodMax: 35,
  stressFairMax: 50,
  rhrGoodMax: 60,
  rhrFairMax: 72,
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
  const v = clamp100(value);
  let score: number;
  let signal: string;
  let note: string;
  if (v >= THRESH.sleepScoreGood) {
    score = 90 + (v - THRESH.sleepScoreGood) / 2;
    signal = "strong";
    note = "睡眠スコアは良好帯です";
  } else if (v >= THRESH.sleepScoreFair) {
    score = 60 + ((v - THRESH.sleepScoreFair) / (THRESH.sleepScoreGood - THRESH.sleepScoreFair)) * 15;
    signal = "moderate";
    note = "睡眠スコアはまずまず。伸びしろがあります";
  } else {
    score = Math.max(20, (v / THRESH.sleepScoreFair) * 55);
    signal = "low";
    note = "睡眠スコアが低めです。総合的な見直しが有効です";
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
    score = 88;
    signal = "adequate";
    note = "睡眠時間は推奨レンジ内です";
  } else if (minutes >= THRESH.durationFairMin) {
    score = 62;
    signal = "slightly_short";
    note = "睡眠時間がやや短めです";
  } else if (minutes > THRESH.durationMaxMin) {
    score = 58;
    signal = "long";
    note = "睡眠時間が長めです。質とリズムも合わせて確認します";
  } else {
    score = 35;
    signal = "short";
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
    score = 68;
    signal = "moderate";
    note = "睡眠効率は許容範囲。わずかな改善余地があります";
  } else {
    score = Math.max(25, (pct / THRESH.efficiencyFair) * 55);
    signal = "low";
    note = "睡眠効率が低めです。中途覚醒や入眠の確認が有効です";
  }
  return scoredItem("sleepEfficiency", raw, score, signal, note);
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
    score = 90;
    signal = "sufficient";
    note = "深睡眠は十分な長さです";
  } else if (minutes >= THRESH.deepFairMin) {
    score = 65;
    signal = "borderline";
    note = "深睡眠はまずまず。就寝前ルーティンで伸ばせます";
  } else {
    score = Math.max(25, (minutes / THRESH.deepFairMin) * 50);
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
    score = 88;
    signal = "sufficient";
    note = "レム睡眠はバランスが取れています";
  } else if (minutes >= THRESH.remFairMin) {
    score = 64;
    signal = "borderline";
    note = "レム睡眠は標準付近です";
  } else {
    score = Math.max(28, (minutes / THRESH.remFairMin) * 52);
    signal = "insufficient";
    note = "レム睡眠が短めです。睡眠時間と規則性が影響しやすいです";
  }
  return scoredItem("remSleep", raw, score, signal, note);
}

export function evaluateAwakenings(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  const count = raw ? parseLeadingNumber(raw) : null;
  if (count == null) {
    return emptyItem("awakenings", raw, "missing", "中途覚醒未入力");
  }
  let score: number;
  let signal: string;
  let note: string;
  if (count <= THRESH.awakeningsGoodMax) {
    score = 90;
    signal = "low";
    note = "中途覚醒は少ないです";
  } else if (count <= THRESH.awakeningsFairMax) {
    score = 60;
    signal = "moderate";
    note = "中途覚醒がややあります";
  } else {
    score = Math.max(20, 55 - (count - THRESH.awakeningsFairMax) * 8);
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
    score = 62;
    signal = "moderate";
    note = "HRVは標準帯。ストレスと休息のバランスが鍵です";
  } else {
    score = Math.max(22, (ms / THRESH.hrvFair) * 50);
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
    score = 60;
    signal = "moderate";
    note = "ストレスはやや高め。就寝前のリセットが有効です";
  } else {
    score = Math.max(20, 55 - (level - THRESH.stressFairMax));
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
    score = 88;
    signal = "calm";
    note = "安静時心拍は落ち着いた水準です";
  } else if (bpm <= THRESH.rhrFairMax) {
    score = 62;
    signal = "moderate";
    note = "安静時心拍は標準帯です";
  } else {
    score = Math.max(25, 55 - (bpm - THRESH.rhrFairMax) * 1.5);
    signal = "elevated";
    note = "安静時心拍が高めです。回復と負荷のバランスを確認します";
  }
  return scoredItem("restingHeartRate", raw, score, signal, note);
}

export function evaluateCircadianRhythm(
  value: string | null | undefined,
): AiAnalysisItem {
  const raw = textOrNull(value);
  if (!raw) {
    return emptyItem("circadianRhythm", null, "missing", "体内時計未入力");
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
      45,
      "delayed",
      "体内時計の遅れが示唆されます。朝の光と起床固定が有効です",
    );
  }
  if (advanced) {
    return scoredItem(
      "circadianRhythm",
      raw,
      58,
      "advanced",
      "体内時計がやや前倒しの可能性があります",
    );
  }
  return scoredItem(
    "circadianRhythm",
    raw,
    60,
    "unclear",
    "体内時計の記述あり。継続観察で傾向を確認します",
  );
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
    evaluateDeepSleep(m.deepSleep),
    evaluateRemSleep(m.remSleep),
    evaluateAwakenings(m.awakenings),
    evaluateHrv(m.hrv),
    evaluateStress(m.stress),
    evaluateRestingHeartRate(m.restingHeartRate),
    evaluateCircadianRhythm(m.circadianRhythm),
    evaluateMeals(l),
    evaluateAlcohol(l.alcohol),
    evaluateCaffeine(l.caffeine),
    evaluateExercise(l.exercise),
    evaluateBathing(l.bathing),
    evaluatePreBedBehavior(l.preBedBehavior),
  ];
}

export function computeWellnessScore(items: AiAnalysisItem[]): number {
  const scored = items.filter((i) => i.normalizedScore != null);
  if (scored.length === 0) return 70;
  const weight: Partial<Record<AiAnalysisItemKey, number>> = {
    sleepScore: 1.4,
    sleepDuration: 1.2,
    sleepEfficiency: 1.2,
    deepSleep: 1.3,
    remSleep: 1.0,
    awakenings: 1.0,
    hrv: 1.1,
    stress: 1.1,
    restingHeartRate: 0.9,
    circadianRhythm: 1.1,
    meals: 0.8,
    alcohol: 1.0,
    caffeine: 0.9,
    exercise: 0.9,
    bathing: 0.7,
    preBedBehavior: 1.0,
  };
  let sum = 0;
  let wSum = 0;
  for (const item of scored) {
    const w = weight[item.key] ?? 1;
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
      ? goods.map((g) => g.label).join("・")
      : "いくつか安定した指標";
  const issueText =
    issues.length > 0
      ? issues.map((i) => i.label).join("・")
      : "大きな崩れは少ない状態";
  const base =
    `${name}さんの今回の睡眠は、${goodText}に良い流れが見られます。` +
    `一方で${issueText}に改善の余地があり、生活リズムの調整で伸ばしやすい局面です。` +
    `総合ウェルネススコアは${wellnessScore}点です。`;
  return trimToRange(base, 100, 200);
}

/** ② 良い点 */
export function generateGoodPoints(items: AiAnalysisItem[]): string[] {
  const goods = pickGoodItems(items, 4);
  if (goods.length === 0) {
    return [
      "大きな崩れはなく、改善の土台は保たれています",
      "計測データを継続できており、比較の準備が整っています",
    ];
  }
  return goods.map((g) => `${g.label}：${g.note}`);
}

/** ③ 改善ポイント */
export function generateImprovementPoints(items: AiAnalysisItem[]): string[] {
  const issues = pickAttentionItems(items, 5);
  if (issues.length === 0) {
    return [
      "現状の良い習慣を固定し、ばらつきを小さくする",
      "起床時刻の一貫性を保ち、体内時計を安定させる",
    ];
  }
  return issues.map((i) => `${i.label}：${i.note}`);
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
  awakenings: "中途覚醒回数を前回より減らす環境・行動を試す",
  hrv: "HRVが落ちにくい休息日を週に1〜2日入れる",
  meals: "夕食〜就寝の間隔を3時間以上にそろえる",
  exercise: "夕方の軽い運動を週3回以上入れる",
  remSleep: "週末の寝だめを避け、平日と同じ起床リズムを保つ",
  restingHeartRate: "就寝前のクールダウンを習慣化し心拍の落ち着きを見る",
  bathing: "湯船入浴を週4回以上、就寝60〜90分前に実施する",
  sleepScore: "睡眠スコアを前回比で+3〜5点伸ばす",
};

/** ⑤ 来週までの目標 */
export function generateWeeklyGoals(items: AiAnalysisItem[]): string[] {
  const issues = pickAttentionItems(items, 3);
  const goals = issues.map(
    (i) => WEEKLY_BY_KEY[i.key] ?? `${i.label}の改善を1週間観察する`,
  );
  while (goals.length < 3) {
    const fillers = [
      "計測と生活メモを毎日残し、比較材料をそろえる",
      "良い点として出た習慣を崩さず継続する",
      "次回分析で変化を確認できる観点を1つ決めておく",
    ];
    goals.push(fillers[goals.length] ?? fillers[0]);
  }
  return goals.slice(0, 4);
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
    goodPoints: output.goodPoints.slice(0, 4),
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
  return output.improvementPoints.slice(0, 5).map((text, index) => ({
    text,
    stars: (index === 0 ? 5 : index === 1 ? 4 : 3) as 5 | 4 | 3,
  }));
}

export function toTodaysRecommendations(
  output: AiSleepAnalysisOutput,
): string[] {
  return [
    output.todaysChallenge,
    ...output.weeklyGoals.slice(0, 2),
  ].slice(0, 3);
}

export function toNextActionGoals(
  output: AiSleepAnalysisOutput,
): NextActionGoal[] {
  return output.weeklyGoals.slice(0, 5).map((text, index) => ({
    id: `ai-analysis-goal-${index + 1}`,
    text,
    checked: false,
  }));
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
    awakenings: "sleep",
    remSleep: "sleep",
    exercise: "exercise",
    meals: "meal",
    alcohol: "meal",
    caffeine: "meal",
    stress: "stress",
    hrv: "stress",
    preBedBehavior: "lifestyle",
    bathing: "lifestyle",
    circadianRhythm: "lifestyle",
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
  todaysRecommendations: string[];
  nextComparisonPoints: string[];
  recommendationsUntilNext: NextActionGoal[];
  score: number;
};

export function toAnalysisResultFields(
  output: AiSleepAnalysisOutput,
): AnalysisResultAiFields {
  const topIssues = pickAttentionItems(output.items, 3);
  return {
    summary: output.overallEvaluation,
    karteSummary: trimToRange(
      `${output.clientName}さんの睡眠・生活リズムを継続観察中。` +
        `今回の重点は${
          topIssues.map((i) => i.label).join("・") || "習慣の再現性"
        }。` +
        output.clientMessage,
      100,
      200,
    ),
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
    todaysRecommendations: toTodaysRecommendations(output),
    nextComparisonPoints: topIssues.map((i) => i.label).concat(
      topIssues.length < 2 ? ["就寝前行動の実施率"] : [],
    ).slice(0, 4),
    recommendationsUntilNext: toNextActionGoals(output),
    score: output.wellnessScore,
  };
}
