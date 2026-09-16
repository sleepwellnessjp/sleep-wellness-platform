/**
 * 夜間帯グルコース集計（純関数）。
 * 集計は record_type = 0（historic）のみ。scan は含めない。
 */

import { parseHHMM } from "@/lib/soxai-graphs";

export const NIGHT_GLUCOSE_MIN_POINTS = 6;
export const HISTORIC_RECORD_TYPE = 0;
export const NIGHT_GLUCOSE_TIME_ZONE = "Asia/Tokyo";

export type NightGlucoseReading = {
  recordedAtIso: string;
  recordType: number;
  glucoseMgDl: number | null;
};

export type NightGlucoseWindow = {
  /** 分析日（Asia/Tokyo の暦日, YYYY-MM-DD）= 起床側の日付 */
  analysisDate: string;
  sleepOnsetTime: string;
  wakeTime: string;
  /** 夜間帯開始（ISO） */
  startAtIso: string;
  /** 夜間帯終了（ISO） */
  endAtIso: string;
};

export type NightGlucoseExtremum = {
  glucoseMgDl: number;
  recordedAtIso: string;
};

export type NightGlucoseStats = {
  analysisDate: string;
  window: NightGlucoseWindow;
  sampleCount: number;
  averageMgDl: number;
  min: NightGlucoseExtremum;
  max: NightGlucoseExtremum;
  /** 最高 − 最低 */
  rangeMgDl: number;
  /** 変動係数 (%) = SD / mean × 100 */
  cvPercent: number;
};

export type NightGlucoseSkipReason =
  | "missing_analysis"
  | "missing_sleep_times"
  | "invalid_sleep_times"
  | "insufficient_points";

export type NightGlucoseDayResult =
  | { ok: true; stats: NightGlucoseStats }
  | { ok: false; analysisDate: string; reason: NightGlucoseSkipReason; sampleCount?: number };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD を Tokyo 暦日として ±days */
export function addCalendarDaysTokyo(dateYmd: string, days: number): string {
  const m = dateYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`invalid date: ${dateYmd}`);
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utc));
}

/**
 * analysis_date + HH:mm → Asia/Tokyo の瞬間（ISO）。
 * sleep_onset が wake より遅い（例 23:00→07:00）なら onset は前日。
 */
export function resolveNightGlucoseWindow(
  analysisDate: string,
  sleepOnsetTime: string,
  wakeTime: string,
): NightGlucoseWindow | null {
  const onsetMin = parseHHMM(sleepOnsetTime);
  const wakeMin = parseHHMM(wakeTime);
  if (onsetMin == null || wakeMin == null) return null;
  if (onsetMin === wakeMin) return null;

  const onsetDate =
    onsetMin > wakeMin ? addCalendarDaysTokyo(analysisDate, -1) : analysisDate;

  const onsetH = Math.floor(onsetMin / 60);
  const onsetM = onsetMin % 60;
  const wakeH = Math.floor(wakeMin / 60);
  const wakeM = wakeMin % 60;

  const startAtIso = new Date(
    `${onsetDate}T${pad2(onsetH)}:${pad2(onsetM)}:00+09:00`,
  ).toISOString();
  const endAtIso = new Date(
    `${analysisDate}T${pad2(wakeH)}:${pad2(wakeM)}:00+09:00`,
  ).toISOString();

  if (!(Date.parse(startAtIso) < Date.parse(endAtIso))) return null;

  return {
    analysisDate,
    sleepOnsetTime: `${pad2(onsetH)}:${pad2(onsetM)}`,
    wakeTime: `${pad2(wakeH)}:${pad2(wakeM)}`,
    startAtIso,
    endAtIso,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 夜間帯内の historic 血糖から統計を算出。
 * 6点未満・血糖値なしは null。
 */
export function computeNightGlucoseStats(options: {
  analysisDate: string;
  sleepOnsetTime: string | null | undefined;
  wakeTime: string | null | undefined;
  readings: NightGlucoseReading[];
}): NightGlucoseDayResult {
  const { analysisDate, sleepOnsetTime, wakeTime, readings } = options;

  if (!sleepOnsetTime?.trim() || !wakeTime?.trim()) {
    return { ok: false, analysisDate, reason: "missing_sleep_times" };
  }

  const window = resolveNightGlucoseWindow(
    analysisDate,
    sleepOnsetTime,
    wakeTime,
  );
  if (!window) {
    return { ok: false, analysisDate, reason: "invalid_sleep_times" };
  }

  const startMs = Date.parse(window.startAtIso);
  const endMs = Date.parse(window.endAtIso);

  const samples = readings
    .filter((r) => r.recordType === HISTORIC_RECORD_TYPE)
    .filter((r) => r.glucoseMgDl != null && Number.isFinite(r.glucoseMgDl))
    .filter((r) => {
      const t = Date.parse(r.recordedAtIso);
      return Number.isFinite(t) && t >= startMs && t <= endMs;
    })
    .map((r) => ({
      glucoseMgDl: r.glucoseMgDl as number,
      recordedAtIso: r.recordedAtIso,
    }))
    .sort((a, b) => a.recordedAtIso.localeCompare(b.recordedAtIso));

  if (samples.length < NIGHT_GLUCOSE_MIN_POINTS) {
    return {
      ok: false,
      analysisDate,
      reason: "insufficient_points",
      sampleCount: samples.length,
    };
  }

  const values = samples.map((s) => s.glucoseMgDl);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  let min = samples[0]!;
  let max = samples[0]!;
  for (const s of samples) {
    if (s.glucoseMgDl < min.glucoseMgDl) min = s;
    if (s.glucoseMgDl > max.glucoseMgDl) max = s;
  }

  // 標本標準偏差（n-1）。最低6点のため n>=2 保証。
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  const sd = Math.sqrt(variance);
  const cvPercent = mean === 0 ? 0 : (sd / mean) * 100;

  return {
    ok: true,
    stats: {
      analysisDate,
      window,
      sampleCount: samples.length,
      averageMgDl: round1(mean),
      min: {
        glucoseMgDl: min.glucoseMgDl,
        recordedAtIso: min.recordedAtIso,
      },
      max: {
        glucoseMgDl: max.glucoseMgDl,
        recordedAtIso: max.recordedAtIso,
      },
      rangeMgDl: max.glucoseMgDl - min.glucoseMgDl,
      cvPercent: round1(cvPercent),
    },
  };
}
