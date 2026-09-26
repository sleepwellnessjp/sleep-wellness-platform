import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MELATONIN_YOGA_EVENT_TYPES,
  MELATONIN_YOGA_SESSION_FORMATS,
  type MelatoninYogaEventSessionRow,
  type MelatoninYogaEventType,
  type MelatoninYogaSession,
  type MelatoninYogaSessionDay,
  type MelatoninYogaSessionDayRow,
  type MelatoninYogaSessionFormat,
  type MelatoninYogaSessionInput,
} from "@/lib/melatonin-yoga/types";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Client = SupabaseClient<Database>;

const SESSION_SELECT =
  "id, event_type, starts_at, ends_at, format, location, capacity, registration_closed, published, archive_available, admin_note, schedule_note, fee_note, created_at, updated_at";

const DAY_SELECT = "id, session_id, starts_at, ends_at, sort_order";

type SessionRowWithDays = MelatoninYogaEventSessionRow & {
  melatonin_yoga_session_days?: MelatoninYogaSessionDayRow[] | null;
};

function sessionsFrom(client: Client) {
  return client.from("melatonin_yoga_event_sessions");
}

async function requireClient(): Promise<Client> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function isEventType(value: string): value is MelatoninYogaEventType {
  return (MELATONIN_YOGA_EVENT_TYPES as readonly string[]).includes(value);
}

function isSessionFormat(value: string): value is MelatoninYogaSessionFormat {
  return (MELATONIN_YOGA_SESSION_FORMATS as readonly string[]).includes(value);
}

function mapDay(row: MelatoninYogaSessionDayRow): MelatoninYogaSessionDay {
  return {
    id: row.id,
    sessionId: row.session_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    sortOrder: row.sort_order,
  };
}

function mapSession(
  row: MelatoninYogaEventSessionRow,
  days: MelatoninYogaSessionDay[],
  reservedCount = 0,
): MelatoninYogaSession {
  return {
    id: row.id,
    eventType: row.event_type as MelatoninYogaEventType,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    format: row.format as MelatoninYogaSessionFormat,
    location: text(row.location),
    capacity: row.capacity,
    registrationClosed: row.registration_closed,
    published: row.published,
    adminNote: text(row.admin_note),
    scheduleNote: text(row.schedule_note),
    feeNote: text(row.fee_note),
    archiveAvailable: row.archive_available,
    days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reservedCount,
  };
}

function mapSessionRow(
  row: SessionRowWithDays,
  reservedCount = 0,
): MelatoninYogaSession {
  const dayRows = [...(row.melatonin_yoga_session_days ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  return mapSession(row, dayRows.map(mapDay), reservedCount);
}

async function loadReservedCounts(
  supabase: Client,
  sessionIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (sessionIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("melatonin_yoga_registration_selections")
    .select("session_id, melatonin_yoga_registrations!inner(status)")
    .in("session_id", sessionIds)
    .eq("is_flexible", false);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const sessionId = row.session_id;
    if (!sessionId) continue;
    const registration = row.melatonin_yoga_registrations as { status: string };
    if (registration.status === "cancelled") continue;
    counts.set(sessionId, (counts.get(sessionId) ?? 0) + 1);
  }

  return counts;
}

function validateSessionInput(input: MelatoninYogaSessionInput): void {
  if (!isEventType(input.eventType)) {
    throw new Error("種類を選択してください");
  }
  if (!isSessionFormat(input.format)) {
    throw new Error("形式を選択してください");
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1) {
    throw new Error("定員は1以上の整数で入力してください");
  }
  if (!input.days.length) {
    throw new Error("開催日を1日以上入力してください");
  }
  for (let index = 0; index < input.days.length; index += 1) {
    const day = input.days[index];
    const label = `開催日${index + 1}`;
    if (!day.startsAt || Number.isNaN(new Date(day.startsAt).getTime())) {
      throw new Error(`${label}の開始日時が不正です`);
    }
    if (!day.endsAt || Number.isNaN(new Date(day.endsAt).getTime())) {
      throw new Error(`${label}の終了日時が不正です`);
    }
    if (new Date(day.endsAt).getTime() <= new Date(day.startsAt).getTime()) {
      throw new Error(`${label}の終了時刻は開始時刻より後にしてください`);
    }
  }
}

function daysToRpcPayload(input: MelatoninYogaSessionInput) {
  return input.days.map((day) => ({
    starts_at: day.startsAt,
    ends_at: day.endsAt,
  }));
}

async function saveSessionViaRpc(
  supabase: Client,
  id: string | null,
  input: MelatoninYogaSessionInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("save_melatonin_yoga_event_session", {
    p_id: id,
    p_event_type: input.eventType,
    p_format: input.format,
    p_location: text(input.location),
    p_capacity: input.capacity,
    p_registration_closed: input.registrationClosed,
    p_published: input.published,
    p_archive_available: input.archiveAvailable,
    p_admin_note: text(input.adminNote),
    p_schedule_note: text(input.scheduleNote),
    p_fee_note: text(input.feeNote),
    p_days: daysToRpcPayload(input),
  });

  if (error) {
    if (error.message.includes("my_session_days_required")) {
      throw new Error("開催日を1日以上入力してください");
    }
    if (error.message.includes("my_session_day_times_required")) {
      throw new Error("各開催日の開始・終了日時を入力してください");
    }
    if (error.message.includes("my_session_day_ends_before_starts")) {
      throw new Error("終了時刻は開始時刻より後にしてください");
    }
    if (error.message.includes("my_session_not_found")) {
      throw new Error("開催日程が見つかりません");
    }
    if (error.message.includes("Forbidden")) {
      throw new Error("Forbidden");
    }
    throw new Error(error.message);
  }

  if (!data) throw new Error("開催日程の保存に失敗しました");
  return data;
}

async function countAnySelectionForSession(
  supabase: Client,
  sessionId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("melatonin_yoga_registration_selections")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchSessionWithDays(
  supabase: Client,
  id: string,
): Promise<MelatoninYogaSession | null> {
  const { data, error } = await sessionsFrom(supabase)
    .select(`${SESSION_SELECT}, melatonin_yoga_session_days (${DAY_SELECT})`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const reservedCounts = await loadReservedCounts(supabase, [id]);
  return mapSessionRow(data as SessionRowWithDays, reservedCounts.get(id) ?? 0);
}

export async function listSessionsForAdmin(): Promise<MelatoninYogaSession[]> {
  await requireAdminProfile();
  const supabase = await requireClient();

  const { data, error } = await sessionsFrom(supabase)
    .select(`${SESSION_SELECT}, melatonin_yoga_session_days (${DAY_SELECT})`)
    .order("starts_at", { ascending: true })
    .order("sort_order", {
      referencedTable: "melatonin_yoga_session_days",
      ascending: true,
    });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SessionRowWithDays[];
  const reservedCounts = await loadReservedCounts(
    supabase,
    rows.map((row) => row.id),
  );

  return rows.map((row) =>
    mapSessionRow(row, reservedCounts.get(row.id) ?? 0),
  );
}

export async function getSessionByIdForAdmin(
  id: string,
): Promise<MelatoninYogaSession | null> {
  await requireAdminProfile();
  const supabase = await requireClient();
  return fetchSessionWithDays(supabase, id);
}

export async function createSessionAsAdmin(
  input: MelatoninYogaSessionInput,
): Promise<MelatoninYogaSession> {
  await requireAdminProfile();
  const supabase = await requireClient();

  validateSessionInput(input);
  const sessionId = await saveSessionViaRpc(supabase, null, input);
  const session = await fetchSessionWithDays(supabase, sessionId);
  if (!session) throw new Error("開催日程の登録に失敗しました");
  return session;
}

export async function updateSessionAsAdmin(
  id: string,
  input: MelatoninYogaSessionInput,
): Promise<MelatoninYogaSession> {
  await requireAdminProfile();
  const supabase = await requireClient();

  validateSessionInput(input);

  const existing = await getSessionByIdForAdmin(id);
  if (!existing) throw new Error("開催日程が見つかりません");

  if (input.capacity < existing.reservedCount) {
    throw new Error(
      `定員を申込数（${existing.reservedCount}件）未満にはできません`,
    );
  }

  const sessionId = await saveSessionViaRpc(supabase, id, input);
  const session = await fetchSessionWithDays(supabase, sessionId);
  if (!session) throw new Error("開催日程の更新に失敗しました");
  return session;
}

export async function setSessionPublishedAsAdmin(
  id: string,
  published: boolean,
): Promise<MelatoninYogaSession> {
  await requireAdminProfile();
  const supabase = await requireClient();

  const { data, error } = await sessionsFrom(supabase)
    .update({ published } as never)
    .eq("id", id)
    .select(SESSION_SELECT)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("開催日程が見つかりません");

  const session = await fetchSessionWithDays(supabase, id);
  if (!session) throw new Error("開催日程が見つかりません");
  return session;
}

export async function setSessionRegistrationClosedAsAdmin(
  id: string,
  registrationClosed: boolean,
): Promise<MelatoninYogaSession> {
  await requireAdminProfile();
  const supabase = await requireClient();

  const { error } = await sessionsFrom(supabase)
    .update({ registration_closed: registrationClosed } as never)
    .eq("id", id);

  if (error) throw new Error(error.message);

  const session = await fetchSessionWithDays(supabase, id);
  if (!session) throw new Error("開催日程が見つかりません");
  return session;
}

export async function deleteSessionAsAdmin(id: string): Promise<void> {
  await requireAdminProfile();
  const supabase = await requireClient();

  const selectionCount = await countAnySelectionForSession(supabase, id);
  if (selectionCount > 0) {
    throw new Error(
      "申し込みがあるため削除できません。非公開か受付終了にしてください",
    );
  }

  const { error } = await sessionsFrom(supabase).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
