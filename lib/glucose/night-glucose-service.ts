/**
 * クライアントの SOXAI 分析日ごとに夜間帯グルコースを算出。
 * 画面表示は別ステップ。ここでは DB 取得 + 純関数集計のみ。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeNightGlucoseStats,
  type NightGlucoseDayResult,
  type NightGlucoseReading,
  type NightGlucoseStats,
} from "@/lib/glucose/night-glucose-stats";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type NightGlucoseComputeSummary = {
  clientId: string;
  analysisCount: number;
  computed: NightGlucoseStats[];
  skipped: Array<{
    analysisDate: string;
    reason: Exclude<NightGlucoseDayResult, { ok: true }>["reason"];
    sampleCount?: number;
  }>;
};

function addDaysYmd(ymd: string, days: number): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utc));
}

/**
 * client_id の analyses（analysis_date あり）を走査し、
 * historic 血糖から夜間帯指標を算出する。
 * SOXAI 行が無い日・入眠/起床が欠ける日・夜間6点未満はスキップ。
 */
export async function computeNightGlucoseForClient(options: {
  supabase: Client;
  clientId: string;
  /** 指定時はその analysis_date のみ */
  analysisDate?: string;
}): Promise<NightGlucoseComputeSummary> {
  const { supabase, clientId, analysisDate } = options;

  let analysisQuery = supabase
    .from("analyses")
    .select("id, analysis_date, sleep_onset_time, wake_time")
    .eq("client_id", clientId)
    .not("analysis_date", "is", null)
    .order("analysis_date", { ascending: true });

  if (analysisDate) {
    analysisQuery = analysisQuery.eq("analysis_date", analysisDate);
  }

  const { data: analyses, error: analysisError } = await analysisQuery;
  if (analysisError) {
    throw new Error(analysisError.message || "analyses の取得に失敗しました");
  }

  const rows = analyses ?? [];
  if (rows.length === 0) {
    return {
      clientId,
      analysisCount: 0,
      computed: [],
      skipped: analysisDate
        ? [{ analysisDate, reason: "missing_analysis" }]
        : [],
    };
  }

  // 夜間帯は最大で analysis_date の前日 onset 〜 当日 wake。余裕を見て ±1 日分を読む。
  const dates = rows
    .map((r) => r.analysis_date)
    .filter((d): d is string => Boolean(d));
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));
  const rangeStart = `${addDaysYmd(minDate, -1)}T00:00:00+09:00`;
  const rangeEnd = `${addDaysYmd(maxDate, 1)}T00:00:00+09:00`;

  const { data: glucoseRows, error: glucoseError } = await supabase
    .from("glucose_readings")
    .select("recorded_at, record_type, glucose_mg_dl")
    .eq("client_id", clientId)
    .eq("record_type", 0)
    .gte("recorded_at", new Date(rangeStart).toISOString())
    .lt("recorded_at", new Date(rangeEnd).toISOString())
    .order("recorded_at", { ascending: true });

  if (glucoseError) {
    throw new Error(
      glucoseError.message || "glucose_readings の取得に失敗しました",
    );
  }

  const readings: NightGlucoseReading[] = (glucoseRows ?? []).map((r) => ({
    recordedAtIso: r.recorded_at,
    recordType: r.record_type,
    glucoseMgDl: r.glucose_mg_dl,
  }));

  const computed: NightGlucoseStats[] = [];
  const skipped: NightGlucoseComputeSummary["skipped"] = [];

  for (const row of rows) {
    const date = row.analysis_date;
    if (!date) {
      skipped.push({ analysisDate: "", reason: "missing_analysis" });
      continue;
    }

    const result = computeNightGlucoseStats({
      analysisDate: date,
      sleepOnsetTime: row.sleep_onset_time,
      wakeTime: row.wake_time,
      readings,
    });

    if (result.ok) {
      computed.push(result.stats);
    } else {
      skipped.push({
        analysisDate: result.analysisDate,
        reason: result.reason,
        sampleCount: result.sampleCount,
      });
    }
  }

  return {
    clientId,
    analysisCount: rows.length,
    computed,
    skipped,
  };
}
