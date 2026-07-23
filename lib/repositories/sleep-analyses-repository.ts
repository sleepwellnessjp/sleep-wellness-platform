import type { Json } from "@/lib/supabase/database.types";
import {
  DataAccessError,
  mapLoadError,
  mapSaveError,
  unauthenticatedError,
} from "@/lib/data-access-errors";
import {
  getInstructorAuth,
  todayInTokyo,
} from "@/lib/repositories/v1-beta-auth";

export type SleepAnalysisRecord = {
  id: string;
  clientId: string;
  instructorId: string;
  analysisDate: string;
  sleepData: Record<string, unknown>;
  lifestyleData: Record<string, unknown>;
  analysisResult: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SaveSleepAnalysisInput = {
  clientId: string;
  analysisDate?: string;
  sleepData?: Record<string, unknown>;
  lifestyleData?: Record<string, unknown>;
  analysisResult?: Record<string, unknown>;
  /** 既存 analyses.id を sleep_analyses.id として使う場合 */
  id?: string;
};

type DbRow = {
  id: string;
  client_id: string;
  instructor_id: string;
  analysis_date: string;
  sleep_data: Json;
  lifestyle_data: Json;
  analysis_result: Json;
  created_at: string;
  updated_at: string;
};

function asObject(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function mapRow(row: DbRow): SleepAnalysisRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    instructorId: row.instructor_id,
    analysisDate: row.analysis_date,
    sleepData: asObject(row.sleep_data),
    lifestyleData: asObject(row.lifestyle_data),
    analysisResult: asObject(row.analysis_result),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSleepAnalysesForClient(
  clientId: string,
): Promise<SleepAnalysisRecord[]> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const { data, error } = await auth.supabase
    .from("sleep_analyses")
    .select("*")
    .eq("instructor_id", auth.userId)
    .eq("client_id", clientId)
    .order("analysis_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw mapLoadError(error, "listSleepAnalysesForClient");
  return ((data ?? []) as DbRow[]).map(mapRow);
}

export async function getLatestSleepAnalysis(
  clientId: string,
): Promise<SleepAnalysisRecord | null> {
  const rows = await listSleepAnalysesForClient(clientId);
  return rows[0] ?? null;
}

export async function getSleepAnalysisById(
  id: string,
): Promise<SleepAnalysisRecord | null> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const { data, error } = await auth.supabase
    .from("sleep_analyses")
    .select("*")
    .eq("instructor_id", auth.userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw mapLoadError(error, "getSleepAnalysisById");
  if (!data) return null;
  return mapRow(data as DbRow);
}

export async function saveSleepAnalysis(
  input: SaveSleepAnalysisInput,
): Promise<SleepAnalysisRecord> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const clientId = input.clientId.trim();
  if (!clientId) {
    throw new DataAccessError("save_failed", "クライアントが指定されていません。");
  }

  // 同一 analysis id の二重保存を避ける
  const preferredId = input.id?.trim();
  if (preferredId) {
    const { data: existing, error: existingError } = await auth.supabase
      .from("sleep_analyses")
      .select("*")
      .eq("instructor_id", auth.userId)
      .eq("id", preferredId)
      .maybeSingle();

    if (existingError) throw mapLoadError(existingError, "saveSleepAnalysis:existing");
    if (existing) return mapRow(existing as DbRow);
  }

  const payload = {
    ...(preferredId ? { id: preferredId } : {}),
    client_id: clientId,
    instructor_id: auth.userId,
    analysis_date: input.analysisDate?.trim() || todayInTokyo(),
    sleep_data: (input.sleepData ?? {}) as Json,
    lifestyle_data: (input.lifestyleData ?? {}) as Json,
    analysis_result: (input.analysisResult ?? {}) as Json,
  };

  const { data, error } = await auth.supabase
    .from("sleep_analyses")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw mapSaveError(error, "saveSleepAnalysis");
  return mapRow(data as DbRow);
}
