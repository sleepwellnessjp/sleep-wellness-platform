/**
 * SOXAI Vision 方式: 画像から取る項目 + 既存 AnalysisMetrics へのマッピング。
 * OCR / ROI / reading-map は使わない。
 *
 * 睡眠ステージ（医学）:
 * - 浅い睡眠・深い睡眠はそれぞれ NREM の一部
 * - ノンレム = 浅い + 深い（REM は含めない）
 * - result/PDF は SOXAI 表示どおり 覚醒 / レム / 浅い / 深い を個別表示
 */

import { parseDurationMinutes, parsePercent } from "@/lib/soxai-graphs";
import { formatDurationDisplay } from "@/lib/soxai-display-normalize";
import {
  emptyMetrics,
  type AnalysisMetrics,
} from "@/lib/soxai-metrics";

/** Vision が画像から返す項目（ノンレムはコード側で合算） */
export type SoxaiVision24 = {
  sleepScore: string | number | null;
  /** ホーム QoL（現在） */
  qol: string | null;
  /** ホーム 昨日のスコア */
  yesterdayQol: string | null;
  /** ホーム 体調 */
  conditionScore: string | null;
  sleepDuration: string | null;
  /** 全就床時間（Time in Bed）。睡眠時間とは別項目 */
  timeInBed: string | null;
  sleepEfficiency: string | null;
  sleepDebt: string | null;
  bedTime: string | null;
  wakeTime: string | null;
  sleepLatency: string | null;
  awakeDuration: string | null;
  awakePercent: string | null;
  remDuration: string | null;
  remPercent: string | null;
  /** 浅い睡眠（画像の「浅い睡眠」行） */
  lightSleepDuration: string | null;
  lightSleepPercent: string | null;
  /** 深い睡眠（画像の「深い睡眠」行） */
  deepSleepDuration: string | null;
  deepSleepPercent: string | null;
  /** 浅い+深いの合算（両方取れれば計算で埋める） */
  nonRemDuration: string | null;
  nonRemPercent: string | null;
  restingHeartRateAvg: string | null;
  restingHeartRateMin: string | null;
  restingHeartRateMax: string | null;
  respirationRate: string | null;
  spo2: string | null;
  hrvAvg: string | null;
  hrvMin: string | null;
  hrvMax: string | null;
  stress: string | null;
  skinTemperature: string | null;
  circadianShift: string | null;
  breathingEvents: string | null;
};

/** OpenAI に要求するキー（ノンレムは送らない＝推測させない） */
export const SOXAI_VISION_EXTRACT_KEYS = [
  "sleepScore",
  "qol",
  "yesterdayQol",
  "conditionScore",
  "sleepDuration",
  "timeInBed",
  "sleepEfficiency",
  "sleepDebt",
  "bedTime",
  "wakeTime",
  "sleepLatency",
  "awakeDuration",
  "awakePercent",
  "remDuration",
  "remPercent",
  "lightSleepDuration",
  "lightSleepPercent",
  "deepSleepDuration",
  "deepSleepPercent",
  "restingHeartRateAvg",
  "restingHeartRateMin",
  "restingHeartRateMax",
  "respirationRate",
  "spo2",
  "hrvAvg",
  "hrvMin",
  "hrvMax",
  "stress",
  "skinTemperature",
  "circadianShift",
  "breathingEvents",
] as const;

/** レスポンス全体のキー（合算ノンレム含む） */
export const SOXAI_VISION_KEYS = [
  ...SOXAI_VISION_EXTRACT_KEYS,
  "nonRemDuration",
  "nonRemPercent",
] as const satisfies ReadonlyArray<keyof SoxaiVision24>;

export function emptySoxaiVision24(): SoxaiVision24 {
  return {
    sleepScore: null,
    qol: null,
    yesterdayQol: null,
    conditionScore: null,
    sleepDuration: null,
    timeInBed: null,
    sleepEfficiency: null,
    sleepDebt: null,
    bedTime: null,
    wakeTime: null,
    sleepLatency: null,
    awakeDuration: null,
    awakePercent: null,
    remDuration: null,
    remPercent: null,
    lightSleepDuration: null,
    lightSleepPercent: null,
    deepSleepDuration: null,
    deepSleepPercent: null,
    nonRemDuration: null,
    nonRemPercent: null,
    restingHeartRateAvg: null,
    restingHeartRateMin: null,
    restingHeartRateMax: null,
    respirationRate: null,
    spo2: null,
    hrvAvg: null,
    hrvMin: null,
    hrvMax: null,
    stress: null,
    skinTemperature: null,
    circadianShift: null,
    breathingEvents: null,
  };
}

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

function asSleepScore(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 100) return null;
  return Math.round(n);
}

/** 浅い+深いの時間合算。どちらか欠ける場合は空（推測禁止） */
export function sumSleepStageDurations(
  light: string | null | undefined,
  deep: string | null | undefined,
): string {
  const lightText = asText(light);
  const deepText = asText(deep);
  if (!lightText || !deepText) return "";
  const lightM = parseDurationMinutes(lightText);
  const deepM = parseDurationMinutes(deepText);
  if (lightM == null || deepM == null) return "";
  return formatDurationDisplay(`${lightM + deepM}分`);
}

/** 浅い+深いの%合算。どちらか欠ける場合は空（推測禁止） */
export function sumSleepStagePercents(
  light: string | null | undefined,
  deep: string | null | undefined,
): string {
  const lightText = asText(light);
  const deepText = asText(deep);
  if (!lightText || !deepText) return "";
  const lightP = parsePercent(lightText);
  const deepP = parsePercent(deepText);
  if (lightP == null || deepP == null) return "";
  const sum = lightP + deepP;
  const shown = Number.isInteger(sum) ? String(sum) : String(Math.round(sum * 10) / 10);
  return `${shown}%`;
}

/** OpenAI Structured Outputs 用（画像から取る項目のみ） */
export const soxaiVision24JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [...SOXAI_VISION_EXTRACT_KEYS],
  properties: Object.fromEntries(
    SOXAI_VISION_EXTRACT_KEYS.map((key) => [key, { type: ["string", "null"] }]),
  ),
} as const;

/** heart_hrv 専用パス（安静時心拍・HRV のみ） */
export const SOXAI_VISION_HEART_HRV_KEYS = [
  "restingHeartRateAvg",
  "restingHeartRateMin",
  "restingHeartRateMax",
  "hrvAvg",
  "hrvMin",
  "hrvMax",
] as const satisfies ReadonlyArray<keyof SoxaiVision24>;

export const soxaiVisionHeartHrvJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [...SOXAI_VISION_HEART_HRV_KEYS],
  properties: Object.fromEntries(
    SOXAI_VISION_HEART_HRV_KEYS.map((key) => [
      key,
      { type: ["string", "null"] },
    ]),
  ),
} as const;

/** ホーム系スコア（0–100）を比較用に正規化。取れなければ null */
function comparableHomeScore(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * sleepScore / conditionScore / qol が同一値のとき、qol を捨てる。
 * QoL 表示が消えた UI で他スコアを流用した可能性が高いため。
 * QoL が画面にあり、かつ他と数値が異なる場合はそのまま残す。
 */
export function guardQolAgainstHomeScoreCrossFill(
  vision: SoxaiVision24,
): { vision: SoxaiVision24; qolCleared: boolean; sharedScore: number | null } {
  const sleep = comparableHomeScore(vision.sleepScore);
  const condition = comparableHomeScore(vision.conditionScore);
  const qol = comparableHomeScore(vision.qol);
  if (
    sleep == null ||
    condition == null ||
    qol == null ||
    sleep !== condition ||
    condition !== qol
  ) {
    return { vision, qolCleared: false, sharedScore: null };
  }
  return {
    vision: { ...vision, qol: null },
    qolCleared: true,
    sharedScore: sleep,
  };
}

function parseVisionNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export type AvgMinMaxGuardResult = {
  avg: string | null;
  min: string | null;
  max: string | null;
  /** 主値 Avg を落として要確認にした */
  avgCleared: boolean;
  reason: "avg_equals_min" | "order_violation" | null;
};

/**
 * 読み取れた値だけで Min ≤ Avg ≤ Max を検証する。
 * - Max（や Min）が画面に無く null のときは、存在する組み合わせだけ判定
 * - Avg と Min が同値 → Avg を捨てて要確認（入れ替え誤読の可能性）
 * - 順序が崩れている → Avg を捨てて要確認
 */
export function guardAvgMinMaxOrdering(params: {
  avg: string | null;
  min: string | null;
  max: string | null;
}): AvgMinMaxGuardResult {
  let avg = params.avg;
  let min = params.min;
  let max = params.max;
  const avgN = parseVisionNumeric(avg);
  const minN = parseVisionNumeric(min);
  const maxN = parseVisionNumeric(max);

  if (avgN != null && minN != null && avgN === minN) {
    return {
      avg: null,
      min,
      max,
      avgCleared: true,
      reason: "avg_equals_min",
    };
  }

  const orderBroken =
    (minN != null && avgN != null && minN > avgN) ||
    (avgN != null && maxN != null && avgN > maxN) ||
    (minN != null && maxN != null && minN > maxN);

  if (orderBroken) {
    return {
      avg: null,
      min,
      max,
      avgCleared: true,
      reason: "order_violation",
    };
  }

  return { avg, min, max, avgCleared: false, reason: null };
}

/**
 * 安静時心拍・HRV の Avg/Min/Max 安全策（欠けた Max は必須にしない）。
 */
export function guardHeartHrvAvgMinMax(vision: SoxaiVision24): {
  vision: SoxaiVision24;
  restingCleared: boolean;
  hrvCleared: boolean;
} {
  const rhr = guardAvgMinMaxOrdering({
    avg: vision.restingHeartRateAvg,
    min: vision.restingHeartRateMin,
    max: vision.restingHeartRateMax,
  });
  const hrv = guardAvgMinMaxOrdering({
    avg: vision.hrvAvg,
    min: vision.hrvMin,
    max: vision.hrvMax,
  });
  if (!rhr.avgCleared && !hrv.avgCleared) {
    return { vision, restingCleared: false, hrvCleared: false };
  }
  return {
    vision: {
      ...vision,
      restingHeartRateAvg: rhr.avg,
      restingHeartRateMin: rhr.min,
      restingHeartRateMax: rhr.max,
      hrvAvg: hrv.avg,
      hrvMin: hrv.min,
      hrvMax: hrv.max,
    },
    restingCleared: rhr.avgCleared,
    hrvCleared: hrv.avgCleared,
  };
}

/**
 * Vision 結果 → 既存 AnalysisMetrics（result / PDF 再利用用）
 * - light/deep は画像値をそのまま格納
 * - nonRem は light+deep の合算のみ（片方欠けるときは空）
 * - 浅い睡眠をノンレムに変換しない / 深い睡眠をノンレム表示に流用しない
 */
export function mapVision24ToAnalysisMetrics(
  vision: Partial<SoxaiVision24> | null | undefined,
): AnalysisMetrics {
  const v = vision ?? {};
  const metrics = emptyMetrics();
  metrics.sleepScore = asSleepScore(v.sleepScore);
  metrics.qol = asText(v.qol);
  metrics.yesterdayQol = asText(v.yesterdayQol);
  metrics.conditionScore = asText(v.conditionScore);
  metrics.sleepDuration = asText(v.sleepDuration);
  metrics.timeInBed = asText(v.timeInBed);
  metrics.sleepEfficiency = asText(v.sleepEfficiency);
  metrics.sleepDebt = asText(v.sleepDebt);
  metrics.bedtime = asText(v.bedTime);
  metrics.wakeTime = asText(v.wakeTime);
  metrics.sleepLatency = asText(v.sleepLatency);
  metrics.awakenings = asText(v.awakeDuration);
  metrics.awakeningRate = asText(v.awakePercent);
  metrics.remSleep = asText(v.remDuration);
  metrics.remSleepRate = asText(v.remPercent);
  metrics.lightSleep = asText(v.lightSleepDuration);
  metrics.lightSleepRate = asText(v.lightSleepPercent);
  metrics.deepSleep = asText(v.deepSleepDuration);
  metrics.deepSleepRate = asText(v.deepSleepPercent);

  const nonRemDuration =
    asText(v.nonRemDuration) ||
    sumSleepStageDurations(v.lightSleepDuration, v.deepSleepDuration);
  const nonRemPercent =
    asText(v.nonRemPercent) ||
    sumSleepStagePercents(v.lightSleepPercent, v.deepSleepPercent);
  metrics.nonRemSleep = nonRemDuration;
  metrics.nonRemSleepRate = nonRemPercent;

  metrics.restingHeartRate = asText(v.restingHeartRateAvg);
  metrics.restingHeartRateMin = asText(v.restingHeartRateMin);
  metrics.restingHeartRateMax = asText(v.restingHeartRateMax);
  metrics.respiratoryRate = asText(v.respirationRate);
  metrics.spo2 = asText(v.spo2);
  metrics.hrv = asText(v.hrvAvg);
  metrics.hrvMin = asText(v.hrvMin);
  metrics.hrvMax = asText(v.hrvMax);
  metrics.stress = asText(v.stress);
  metrics.skinTemperature = asText(v.skinTemperature);
  metrics.circadianRhythm = asText(v.circadianShift);
  metrics.breathingDisturbances = asText(v.breathingEvents);
  return metrics;
}

export function normalizeSoxaiVision24(raw: unknown): SoxaiVision24 {
  const base = emptySoxaiVision24();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const record = raw as Record<string, unknown>;

  const score = record.sleepScore;
  base.sleepScore =
    typeof score === "number" || typeof score === "string" ? score : null;

  const textKeys = SOXAI_VISION_EXTRACT_KEYS.filter(
    (k) => k !== "sleepScore",
  ) as Array<Exclude<(typeof SOXAI_VISION_EXTRACT_KEYS)[number], "sleepScore">>;

  for (const key of textKeys) {
    const value = record[key];
    if (value == null) {
      base[key] = null;
    } else if (typeof value === "string") {
      base[key] = value;
    } else {
      base[key] = String(value);
    }
  }

  // ノンレムは浅い+深いの合算のみ（Vision に推測させない）
  base.nonRemDuration =
    sumSleepStageDurations(base.lightSleepDuration, base.deepSleepDuration) ||
    null;
  base.nonRemPercent =
    sumSleepStagePercents(base.lightSleepPercent, base.deepSleepPercent) ||
    null;

  return base;
}
