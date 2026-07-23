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

export type JourneyNextGoalPayload = {
  sleepScore?: number;
  sleepHours?: number;
  hrv?: number;
  stress?: number;
  [key: string]: unknown;
};

export type SleepJourneyRecord = {
  id: string;
  clientId: string;
  instructorId: string;
  recordedAt: string;
  sleepScore: number | null;
  hrv: number | null;
  stress: number | null;
  achievementRate: number | null;
  instructorComment: string;
  nextGoal: JourneyNextGoalPayload;
  createdAt: string;
};

export type SaveSleepJourneyInput = {
  clientId: string;
  recordedAt?: string;
  sleepScore?: number | null;
  hrv?: number | null;
  stress?: number | null;
  achievementRate?: number | null;
  instructorComment?: string;
  nextGoal?: JourneyNextGoalPayload;
};

type DbRow = {
  id: string;
  client_id: string;
  instructor_id: string;
  recorded_at: string;
  sleep_score: number | null;
  hrv: number | null;
  stress: number | null;
  achievement_rate: number | null;
  instructor_comment: string;
  next_goal: Json;
  created_at: string;
};

function asGoal(value: Json | null | undefined): JourneyNextGoalPayload {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JourneyNextGoalPayload;
  }
  return {};
}

function mapRow(row: DbRow): SleepJourneyRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    instructorId: row.instructor_id,
    recordedAt: row.recorded_at,
    sleepScore: row.sleep_score,
    hrv: row.hrv == null ? null : Number(row.hrv),
    stress: row.stress == null ? null : Number(row.stress),
    achievementRate: row.achievement_rate,
    instructorComment: row.instructor_comment ?? "",
    nextGoal: asGoal(row.next_goal),
    createdAt: row.created_at,
  };
}

export async function listSleepJourneysForClient(
  clientId: string,
): Promise<SleepJourneyRecord[]> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const { data, error } = await auth.supabase
    .from("sleep_journeys")
    .select("*")
    .eq("instructor_id", auth.userId)
    .eq("client_id", clientId)
    .order("recorded_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw mapLoadError(error, "listSleepJourneysForClient");
  return ((data ?? []) as DbRow[]).map(mapRow);
}

export async function saveSleepJourneyRecord(
  input: SaveSleepJourneyInput,
): Promise<SleepJourneyRecord> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const clientId = input.clientId.trim();
  if (!clientId) {
    throw new DataAccessError("save_failed", "クライアントが指定されていません。");
  }

  const payload = {
    client_id: clientId,
    instructor_id: auth.userId,
    recorded_at: input.recordedAt?.trim() || todayInTokyo(),
    sleep_score: input.sleepScore ?? null,
    hrv: input.hrv ?? null,
    stress: input.stress ?? null,
    achievement_rate: input.achievementRate ?? null,
    instructor_comment: input.instructorComment?.trim() ?? "",
    next_goal: (input.nextGoal ?? {}) as Json,
  };

  const { data, error } = await auth.supabase
    .from("sleep_journeys")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw mapSaveError(error, "saveSleepJourneyRecord");
  return mapRow(data as DbRow);
}
