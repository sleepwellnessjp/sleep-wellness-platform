import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseLibreGlucoseCsv,
  type ParsedGlucoseReading,
} from "@/lib/glucose/parse-libre-csv";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type GlucoseImportSummary = {
  parsedCount: number;
  insertedCount: number;
  skippedDuplicateCount: number;
  periodStart: string | null;
  periodEnd: string | null;
};

function toInsertRows(
  clientId: string,
  ownerId: string,
  readings: ParsedGlucoseReading[],
) {
  return readings.map((row) => ({
    client_id: clientId,
    owner_id: ownerId,
    recorded_at: row.recordedAtIso,
    record_type: row.recordType,
    source: row.source,
    glucose_mg_dl: row.glucoseMgDl,
    device_name: row.deviceName,
    serial_number: row.serialNumber,
    note: row.note,
  }));
}

export async function importLibreGlucoseCsvForClient(options: {
  supabase: Client;
  clientId: string;
  ownerId: string;
  csvText: string;
}): Promise<GlucoseImportSummary> {
  const readings = parseLibreGlucoseCsv(options.csvText);
  if (readings.length === 0) {
    throw new Error("取り込み可能な血糖データが見つかりませんでした");
  }

  const periodStart = readings[0]?.recordedAtIso ?? null;
  const periodEnd = readings[readings.length - 1]?.recordedAtIso ?? null;

  const rows = toInsertRows(options.clientId, options.ownerId, readings);

  // 重複はスキップ（同一 client_id + recorded_at + record_type）
  // 注意: 夜間帯集計は record_type=0（historic）のみ使用すること。
  // scan(1) は表示可だが集計に含めない（同一時刻の二重計上防止）。
  const { data, error } = await options.supabase
    .from("glucose_readings")
    .upsert(rows, {
      onConflict: "client_id,recorded_at,record_type",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    throw new Error(error.message || "血糖データの保存に失敗しました");
  }

  const insertedCount = data?.length ?? 0;
  const skippedDuplicateCount = Math.max(0, rows.length - insertedCount);

  return {
    parsedCount: readings.length,
    insertedCount,
    skippedDuplicateCount,
    periodStart,
    periodEnd,
  };
}
