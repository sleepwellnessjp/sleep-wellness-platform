/**
 * 夜間帯グルコース集計（純関数）。
 * 集計は record_type = 0（historic）のみ。scan はグラフ表示用。
 * Libre の想定間隔は 15 分。
 */

import { parseHHMM } from "@/lib/soxai-graphs";

export const NIGHT_GLUCOSE_INTERVAL_MS = 15 * 60_000;
export const HISTORIC_RECORD_TYPE = 0;
export const NIGHT_GLUCOSE_TIME_ZONE = "Asia/Tokyo";
/** データ取得率がこれ未満なら「参考表示」 */
export const NIGHT_GLUCOSE_COVERAGE_WARN_RATIO = 0.7;
export const GLUCOSE_ATTENTION_LOW_MG_DL = 70;
export const GLUCOSE_ATTENTION_HIGH_MG_DL = 180;

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
  /** 15分間隔で窓を埋めた場合の本来件数 */
  expectedCount: number;
  /** sampleCount / expectedCount（0–1） */
  coverageRatio: number;
  averageMgDl: number;
  min: NightGlucoseExtremum;
  max: NightGlucoseExtremum;
  /** 最高 − 最低 */
  rangeMgDl: number;
  /** 70未満 or 180超の値がある */
  hasAttentionValues: boolean;
  /** 記録開始（窓内の最初の historic） */
  firstRecordedAtIso: string;
};

export type NightGlucoseSkipReason =
  | "missing_analysis"
  | "invalid_sleep_times"
  | "no_samples";

export type NightGlucoseDayResult =
  | { ok: true; stats: NightGlucoseStats }
  | {
      ok: false;
      analysisDate: string;
      reason: NightGlucoseSkipReason;
      sampleCount?: number;
      expectedCount?: number;
      window?: NightGlucoseWindow;
    };

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

/** 入眠・起床が取れないときのフォールバック（22:00〜07:00） */
export function resolveFallbackNightWindow(
  analysisDate: string,
): NightGlucoseWindow {
  const prev = addCalendarDaysTokyo(analysisDate, -1);
  return {
    analysisDate,
    sleepOnsetTime: "22:00",
    wakeTime: "07:00",
    startAtIso: new Date(`${prev}T22:00:00+09:00`).toISOString(),
    endAtIso: new Date(`${analysisDate}T07:00:00+09:00`).toISOString(),
  };
}

/** 本来の件数 = floor(duration / 15分) + 1 */
export function expectedHistoricCount(
  startAtIso: string,
  endAtIso: string,
): number {
  const startMs = Date.parse(startAtIso);
  const endMs = Date.parse(endAtIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return 0;
  }
  return Math.floor((endMs - startMs) / NIGHT_GLUCOSE_INTERVAL_MS) + 1;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function filterHistoricInWindow(
  readings: NightGlucoseReading[],
  startMs: number,
  endMs: number,
) {
  return readings
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
}

/**
 * 夜間帯内の historic 血糖から統計を算出。
 * サンプルが1件も無い場合のみ ok:false。
 */
export function computeNightGlucoseStats(options: {
  analysisDate: string;
  sleepOnsetTime: string | null | undefined;
  wakeTime: string | null | undefined;
  readings: NightGlucoseReading[];
}): NightGlucoseDayResult {
  const { analysisDate, sleepOnsetTime, wakeTime, readings } = options;

  const resolved =
    sleepOnsetTime?.trim() && wakeTime?.trim()
      ? resolveNightGlucoseWindow(analysisDate, sleepOnsetTime, wakeTime)
      : null;
  const window = resolved ?? resolveFallbackNightWindow(analysisDate);
  if (
    sleepOnsetTime?.trim() &&
    wakeTime?.trim() &&
    !resolved
  ) {
    return { ok: false, analysisDate, reason: "invalid_sleep_times" };
  }

  const startMs = Date.parse(window.startAtIso);
  const endMs = Date.parse(window.endAtIso);
  const expectedCount = expectedHistoricCount(window.startAtIso, window.endAtIso);
  const samples = filterHistoricInWindow(readings, startMs, endMs);

  if (samples.length === 0) {
    return {
      ok: false,
      analysisDate,
      reason: "no_samples",
      sampleCount: 0,
      expectedCount,
      window,
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

  const hasAttentionValues = values.some(
    (v) =>
      v < GLUCOSE_ATTENTION_LOW_MG_DL || v > GLUCOSE_ATTENTION_HIGH_MG_DL,
  );

  return {
    ok: true,
    stats: {
      analysisDate,
      window,
      sampleCount: samples.length,
      expectedCount,
      coverageRatio:
        expectedCount > 0 ? samples.length / expectedCount : 0,
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
      hasAttentionValues,
      firstRecordedAtIso: samples[0]!.recordedAtIso,
    },
  };
}

function resolveClockWindowOnAnalysisNight(
  analysisDate: string,
  startTime: string,
  endTime: string,
): { startMs: number; endMs: number } | null {
  const startMin = parseHHMM(startTime);
  const endMin = parseHHMM(endTime);
  if (startMin == null || endMin == null || startMin === endMin) return null;
  const startDate =
    startMin > endMin ? addCalendarDaysTokyo(analysisDate, -1) : analysisDate;
  const endDate = analysisDate;
  const startAtIso = new Date(
    `${startDate}T${pad2(Math.floor(startMin / 60))}:${pad2(startMin % 60)}:00+09:00`,
  ).toISOString();
  const endAtIso = new Date(
    `${endDate}T${pad2(Math.floor(endMin / 60))}:${pad2(endMin % 60)}:00+09:00`,
  ).toISOString();
  const startMs = Date.parse(startAtIso);
  const endMs = Date.parse(endAtIso);
  if (!(startMs < endMs)) return null;
  return { startMs, endMs };
}

/**
 * 覚醒セグメントとグルコース変化の重なり判定（⑤用）。
 * 取得率70%未満、または覚醒時刻が無い場合は false。
 * 「変化」= その帯での変動幅が 15 mg/dL 以上。
 */
export function hasGlucoseChangeDuringAwake(options: {
  coverageRatio: number;
  glucosePoints: Array<{ recordedAtIso: string; glucoseMgDl: number }>;
  awakeSegments: Array<{ startTime?: string; endTime?: string }>;
  analysisDate: string;
}): boolean {
  const { coverageRatio, glucosePoints, awakeSegments, analysisDate } = options;
  if (coverageRatio < NIGHT_GLUCOSE_COVERAGE_WARN_RATIO) return false;
  if (glucosePoints.length < 2) return false;

  const awakeWindows = awakeSegments
    .map((seg) => {
      if (!seg.startTime?.trim() || !seg.endTime?.trim()) return null;
      return resolveClockWindowOnAnalysisNight(
        analysisDate,
        seg.startTime,
        seg.endTime,
      );
    })
    .filter((w): w is { startMs: number; endMs: number } => w != null);

  if (awakeWindows.length === 0) return false;

  for (const win of awakeWindows) {
    const inBand = glucosePoints.filter((p) => {
      const t = Date.parse(p.recordedAtIso);
      return t >= win.startMs && t <= win.endMs;
    });
    if (inBand.length < 2) continue;
    const vals = inBand.map((p) => p.glucoseMgDl);
    const range = Math.max(...vals) - Math.min(...vals);
    if (range >= 15) return true;
  }
  return false;
}
