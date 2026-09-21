/**
 * レポート用の夜間グルコース表示ヘルパ（文言・ペイロード）。
 */

import {
  computeNightGlucoseStats,
  hasGlucoseChangeDuringAwake,
  NIGHT_GLUCOSE_COVERAGE_WARN_RATIO,
  resolveFallbackNightWindow,
  resolveNightGlucoseWindow,
  type NightGlucoseReading,
  type NightGlucoseStats,
  type NightGlucoseWindow,
} from "@/lib/glucose/night-glucose-stats";

export const NIGHT_GLUCOSE_LOW_COVERAGE_NOTE =
  "記録が不足しているため参考表示";

export const NIGHT_GLUCOSE_DISCLAIMER =
  "間質液での計測のため目安として扱います。医療的な判断や診断には使用できません。";

export const NIGHT_GLUCOSE_ATTENTION_NOTE =
  "気になる値が続く場合は医療機関へ";

export const NIGHT_GLUCOSE_PRIORITY_NOTE =
  "参考：同じ時間帯にグルコースの変化あり";

export {
  resolveFallbackNightWindow,
  NIGHT_GLUCOSE_COVERAGE_WARN_RATIO,
} from "@/lib/glucose/night-glucose-stats";

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
  /** クライアントに夜間帯のグルコースが1件でもあるか（セクション表示判定） */
  hasData: boolean;
  /** グラフ描画用（historic + scan、血糖値あり） */
  points: NightGlucoseReportPoint[];
  /** 縦線用。睡眠時刻が取れたときだけ */
  markers: { sleepOnsetTime: string; wakeTime: string } | null;
  window: NightGlucoseWindow;
  stats: NightGlucoseStats | null;
  coverageBelowThreshold: boolean;
  showAttentionNote: boolean;
  /** ⑤改善優先順位への添文が必要か */
  suggestPriorityNote: boolean;
};

export function buildNightGlucoseReportPayload(options: {
  analysisDate: string;
  sleepOnsetTime: string | null | undefined;
  wakeTime: string | null | undefined;
  readings: NightGlucoseReading[];
  awakeSegments?: Array<{ startTime?: string; endTime?: string }>;
}): NightGlucoseReportPayload {
  const {
    analysisDate,
    sleepOnsetTime,
    wakeTime,
    readings,
    awakeSegments = [],
  } = options;

  const resolved =
    sleepOnsetTime?.trim() && wakeTime?.trim()
      ? resolveNightGlucoseWindow(
          analysisDate,
          sleepOnsetTime,
          wakeTime,
        )
      : null;
  const hasSleepTimes = Boolean(resolved);
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

  const result = computeNightGlucoseStats({
    analysisDate,
    sleepOnsetTime,
    wakeTime,
    readings,
  });

  const stats: NightGlucoseStats | null = result.ok ? result.stats : null;
  const coverageRatio = stats?.coverageRatio ?? 0;
  const coverageBelowThreshold =
    stats != null && coverageRatio < NIGHT_GLUCOSE_COVERAGE_WARN_RATIO;

  const suggestPriorityNote =
    stats != null &&
    hasGlucoseChangeDuringAwake({
      coverageRatio,
      glucosePoints: points
        .filter((p) => p.recordType === 0)
        .map((p) => ({
          recordedAtIso: p.recordedAtIso,
          glucoseMgDl: p.glucoseMgDl,
        })),
      awakeSegments,
      analysisDate,
    });

  return {
    analysisDate,
    hasData: points.length > 0 || stats != null,
    points,
    markers: hasSleepTimes
      ? {
          sleepOnsetTime: window.sleepOnsetTime,
          wakeTime: window.wakeTime,
        }
      : null,
    window,
    stats,
    coverageBelowThreshold,
    showAttentionNote: Boolean(stats?.hasAttentionValues),
    suggestPriorityNote,
  };
}
