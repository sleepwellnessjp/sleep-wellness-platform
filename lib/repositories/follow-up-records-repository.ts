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
import {
  clientsInstructorFilterColumn,
  resolveClientsInstructorColumn,
} from "@/lib/supabase/clients-instructor-column";
import type {
  FollowUpMethod,
  FollowUpRecord,
} from "@/lib/homework-followup";

export type FollowUpInput = {
  followUpDate?: string;
  method: FollowUpMethod;
  sleepScore?: number | null;
  clientChanges: string;
  instructorNotes: string;
  nextAction: string;
};

type DbRow = {
  id: string;
  client_id: string;
  instructor_id: string;
  follow_up_date: string;
  method: string;
  sleep_score: number | null;
  client_changes: string;
  instructor_notes: string;
  next_action: string;
  created_at: string;
};

function asMethod(value: string): FollowUpMethod {
  if (
    value === "in_person" ||
    value === "online" ||
    value === "phone" ||
    value === "message"
  ) {
    return value;
  }
  return "online";
}

function mapRow(row: DbRow): FollowUpRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    conductedAt: row.follow_up_date,
    method: asMethod(row.method),
    sleepScore: row.sleep_score,
    clientChange: row.client_changes ?? "",
    instructorFinding: row.instructor_notes ?? "",
    nextAction: row.next_action ?? "",
  };
}

export async function listFollowUpRecords(
  clientId: string,
): Promise<FollowUpRecord[]> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const { data, error } = await auth.supabase
    .from("follow_up_records")
    .select("*")
    .eq("instructor_id", auth.userId)
    .eq("client_id", clientId)
    .order("follow_up_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw mapLoadError(error, "listFollowUpRecords");
  return ((data ?? []) as DbRow[]).map(mapRow);
}

export async function createFollowUpRecord(
  clientId: string,
  input: FollowUpInput,
): Promise<FollowUpRecord> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  if (!input.clientChanges.trim() && !input.instructorNotes.trim()) {
    throw new DataAccessError(
      "save_failed",
      "クライアントの変化または講師所見を入力してください。",
    );
  }

  const payload = {
    client_id: clientId,
    instructor_id: auth.userId,
    follow_up_date: input.followUpDate?.trim() || todayInTokyo(),
    method: input.method,
    sleep_score: input.sleepScore ?? null,
    client_changes: input.clientChanges.trim(),
    instructor_notes: input.instructorNotes.trim(),
    next_action: input.nextAction.trim(),
  };

  const { data, error } = await auth.supabase
    .from("follow_up_records")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw mapSaveError(error, "createFollowUpRecord");

  // 次回フォロー予定を clients に反映（任意）
  const nextDate = (() => {
    const base = payload.follow_up_date;
    const date = new Date(`${base}T12:00:00+09:00`);
    date.setDate(date.getDate() + 14);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  })();

  const instructorCol = await resolveClientsInstructorColumn(auth.supabase);
  await auth.supabase
    .from("clients")
    .update({
      next_follow_up_date: nextDate,
      ...(payload.sleep_score != null
        ? { current_sleep_score: payload.sleep_score }
        : {}),
    })
    .eq("id", clientId)
    .eq(clientsInstructorFilterColumn(instructorCol), auth.userId);

  return mapRow(data as DbRow);
}
