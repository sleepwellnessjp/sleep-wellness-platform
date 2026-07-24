import { formatSupabaseError } from "@/lib/supabase/errors";

/** PostgREST: Could not find the 'col' column of 'analyses' */
export function missingAnalysesColumnFromError(error: unknown): string | null {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const match = message.match(
    /Could not find the '([^']+)' column of 'analyses'/i,
  );
  return match?.[1] ?? null;
}

const STRUCTURED_METRIC_COLUMNS = [
  "sleep_onset_time",
  "wake_time",
  "skin_temperature_value",
  "skin_temperature_type",
  "skin_temperature_unit",
  "stress_average",
  "stress_level",
  "stress_series",
  "ocr_source_images",
  "ocr_confidence",
] as const;

const ANALYSES_MINIMAL_INSERT_KEYS = new Set([
  "client_id",
  "owner_id",
  "analyzed_at",
  "sleep_score",
  "sleep_duration",
  "sleep_efficiency",
  "deep_sleep",
  "awakenings",
  "sleep_latency",
  "spo2",
  "hrv",
  "resting_heart_rate",
  "ocr_data",
  "ai_result",
]);

type AnalysesInsertBuilder = {
  insert: (payload: never) => {
    select: (columns: string) => {
      single: () => PromiseLike<{
        data: { id: string } | null;
        error: unknown;
      }>;
    };
  };
};

type InsertClient = {
  from: (table: string) => AnalysesInsertBuilder;
};


/**
 * migration 未適用 / PostgREST schema cache 未更新向けに、
 * PGRST204（未知カラム）を検出したら該当キーを落として再試行する。
 */
export async function insertAnalysisWithSchemaFallback(
  supabase: InsertClient,
  initialPayload: Record<string, unknown>,
): Promise<{ id: string }> {
  let payload: Record<string, unknown> = { ...initialPayload };
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const { data, error } = await supabase
      .from("analyses")
      .insert(payload as never)
      .select("id")
      .single();

    if (!error) {
      if (!data?.id) {
        throw new Error("analyses insert returned no id");
      }
      return data;
    }

    lastError = error;
    const missingColumn = missingAnalysesColumnFromError(error);
    if (missingColumn && missingColumn in payload) {
      const next = { ...payload };
      delete next[missingColumn];
      if (missingColumn === "analysis_date") {
        for (const key of STRUCTURED_METRIC_COLUMNS) {
          delete next[key];
        }
      }
      payload = next;
      continue;
    }

    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
    if (
      message.includes("confirmed_metrics") ||
      message.includes("report_payload") ||
      message.includes("credits_consumed")
    ) {
      const minimal: Record<string, unknown> = {};
      for (const key of ANALYSES_MINIMAL_INSERT_KEYS) {
        if (key in payload) minimal[key] = payload[key];
      }
      payload = minimal;
      continue;
    }

    break;
  }

  throw formatSupabaseError(lastError, "saveAnalysis:insertAnalysis");
}
