/**
 * レポート用の夜間グルコース表示ヘルパ（文言・フォールバック窓）。
 */

import {
  addCalendarDaysTokyo,
  computeNightGlucoseStats,
  resolveNightGlucoseWindow,
  type NightGlucoseDayResult,
  type NightGlucoseReading,
  type NightGlucoseStats,
  type NightGlucoseWindow,
} from "@/lib/glucose/night-glucose-stats";

export const NIGHT_GLUCOSE_SKIP_MESSAGE =
  "この日は睡眠データがないため、夜間の集計は表示していません";

export const NIGHT_GLUCOSE_DISCLAIMER =
  "このデータは間質液から推定された参考値です。\n医療的な判断や診断には使用できません。\n体調について気になることがある場合は、医療機関にご相談ください。";

/** 入眠・起床が無いときのグラフ用フォールバック（典型的な夜間帯） */
export function resolveFallbackNightWindow(
  analysisDate: string,
): NightGlucoseWindow {
  const prev = addCalendarDaysTokyo(analysisDate, -1);
  return {
    analysisDate,
    sleepOnsetTime: "20:00",
    wakeTime: "08:00",
    startAtIso: new Date(`${prev}T20:00:00+09:00`).toISOString(),
    endAtIso: new Date(`${analysisDate}T08:00:00+09:00`).toISOString(),
  };
}

export function formatGlucoseClockTokyo(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export type NightGlucoseReportPoint = {
  recordedAtIso: string;
  recordType: number;
  glucoseMgDl: number;
};

export type NightGlucoseReportPayload = {
  analysisDate: string;
  /** グラフ描画用（historic + scan、血糖値あり） */
  points: NightGlucoseReportPoint[];
  /** 縦線用。睡眠時刻が取れたときだけ */
  markers: { sleepOnsetTime: string; wakeTime: string } | null;
  window: NightGlucoseWindow;
  stats: NightGlucoseStats | null;
  skipMessage: string | null;
};

export function buildNightGlucoseReportPayload(options: {
  analysisDate: string;
  sleepOnsetTime: string | null | undefined;
  wakeTime: string | null | undefined;
  readings: NightGlucoseReading[];
}): NightGlucoseReportPayload {
  const { analysisDate, sleepOnsetTime, wakeTime, readings } = options;

  const resolved = resolveNightGlucoseWindow(
    analysisDate,
    sleepOnsetTime ?? "",
    wakeTime ?? "",
  );
  const hasSleepTimes = Boolean(
    sleepOnsetTime?.trim() && wakeTime?.trim() && resolved,
  );
  const window = resolved ?? resolveFallbackNightWindow(analysisDate);

  const startMs = Date.parse(window.startAtIso);
  const endMs = Date.parse(window.endAtIso);

  const points: NightGlucoseReportPoint[] = readings
    .filter((r) => r.glucoseMgDl != null && Number.isFinite(r.glucoseMgDl))
    .filter((r) => {
      const t = Date.parse(r.recordedAtIso);
      return Number.isFinite(t) && t >= startMs && t <= endMs;
    })
    .map((r) => ({
      recordedAtIso: r.recordedAtIso,
      recordType: r.recordType,
      glucoseMgDl: r.glucoseMgDl as number,
    }))
    .sort((a, b) => a.recordedAtIso.localeCompare(b.recordedAtIso));

  let stats: NightGlucoseStats | null = null;
  let skipMessage: string | null = null;

  if (!hasSleepTimes) {
    skipMessage = NIGHT_GLUCOSE_SKIP_MESSAGE;
  } else {
    const result: NightGlucoseDayResult = computeNightGlucoseStats({
      analysisDate,
      sleepOnsetTime,
      wakeTime,
      readings,
    });
    if (result.ok) {
      stats = result.stats;
    } else {
      skipMessage = NIGHT_GLUCOSE_SKIP_MESSAGE;
    }
  }

  return {
    analysisDate,
    points,
    markers: hasSleepTimes
      ? {
          sleepOnsetTime: window.sleepOnsetTime,
          wakeTime: window.wakeTime,
        }
      : null,
    window,
    stats,
    skipMessage,
  };
}
