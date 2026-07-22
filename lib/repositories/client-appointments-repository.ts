import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOCAL_STORAGE_KEY = "swij-client-appointments-v1";
const DEFAULT_TIME_ZONE = "Asia/Tokyo";
const DEFAULT_DURATION_MINUTES = 60;

export type AppointmentLocationType =
  | "online"
  | "in_person"
  | "phone"
  | "other";

export type AppointmentSyncStatus =
  | "local"
  | "pending"
  | "synced"
  | "error";

/**
 * Google Calendar Event 互換を意識した予定モデル。
 * 将来の sync では title→summary / description→description /
 * location→location / start+duration+timeZone→start/end にマッピングする。
 */
export type ClientAppointment = {
  id: string;
  clientId: string;
  title: string;
  startDate: string;
  startTime: string | null;
  durationMinutes: number;
  timeZone: string;
  locationType: AppointmentLocationType;
  location: string;
  description: string;
  googleEventId: string | null;
  googleCalendarId: string | null;
  syncStatus: AppointmentSyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClientAppointmentInput = {
  title?: string;
  startDate: string;
  startTime?: string | null;
  durationMinutes?: number;
  timeZone?: string;
  locationType?: AppointmentLocationType;
  location?: string;
  description?: string;
};

/** Google Calendar API insert/update 用のプレーンオブジェクト（未連携時の設計用） */
export type GoogleCalendarEventPayload = {
  summary: string;
  description: string;
  location: string;
  start: { dateTime?: string; date?: string; timeZone: string };
  end: { dateTime?: string; date?: string; timeZone: string };
};

type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
};

type DbAppointmentRow = {
  id: string;
  client_id: string;
  owner_id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  duration_minutes: number;
  time_zone: string;
  location_type: string;
  location: string;
  description: string;
  google_event_id: string | null;
  google_calendar_id: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
};

const LOCATION_TYPE_LABELS: Record<AppointmentLocationType, string> = {
  online: "オンライン",
  in_person: "対面",
  phone: "電話",
  other: "その他",
};

const SELECT_COLUMNS =
  "id, client_id, owner_id, title, start_date, start_time, duration_minutes, time_zone, location_type, location, description, google_event_id, google_calendar_id, sync_status, created_at, updated_at";

async function getSupabaseAuth(): Promise<SupabaseAuth | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return { supabase, userId: user.id };
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `appt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayInTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeDate(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return todayInTokyo();
}

function normalizeTime(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeDuration(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DURATION_MINUTES;
  }
  const rounded = Math.round(value);
  if (rounded <= 0 || rounded > 24 * 60) return DEFAULT_DURATION_MINUTES;
  return rounded;
}

function normalizeLocationType(
  value: string | null | undefined,
): AppointmentLocationType {
  if (
    value === "online" ||
    value === "in_person" ||
    value === "phone" ||
    value === "other"
  ) {
    return value;
  }
  return "online";
}

function normalizeSyncStatus(
  value: string | null | undefined,
): AppointmentSyncStatus {
  if (
    value === "local" ||
    value === "pending" ||
    value === "synced" ||
    value === "error"
  ) {
    return value;
  }
  return "local";
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function mapDbRow(row: DbAppointmentRow): ClientAppointment {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title ?? "",
    startDate: row.start_date,
    startTime: normalizeTime(row.start_time),
    durationMinutes: normalizeDuration(row.duration_minutes),
    timeZone: row.time_zone || DEFAULT_TIME_ZONE,
    locationType: normalizeLocationType(row.location_type),
    location: row.location ?? "",
    description: row.description ?? "",
    googleEventId: row.google_event_id,
    googleCalendarId: row.google_calendar_id,
    syncStatus: normalizeSyncStatus(row.sync_status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeAppointment(
  entry: Partial<ClientAppointment>,
  fallbackClientId: string,
): ClientAppointment | null {
  const startDate = normalizeDate(entry.startDate);
  return {
    id: typeof entry.id === "string" ? entry.id : createId(),
    clientId:
      typeof entry.clientId === "string" ? entry.clientId : fallbackClientId,
    title: normalizeText(entry.title),
    startDate,
    startTime: normalizeTime(entry.startTime),
    durationMinutes: normalizeDuration(entry.durationMinutes),
    timeZone:
      typeof entry.timeZone === "string" && entry.timeZone.trim()
        ? entry.timeZone.trim()
        : DEFAULT_TIME_ZONE,
    locationType: normalizeLocationType(entry.locationType),
    location: normalizeText(entry.location),
    description: normalizeText(entry.description),
    googleEventId:
      typeof entry.googleEventId === "string" ? entry.googleEventId : null,
    googleCalendarId:
      typeof entry.googleCalendarId === "string"
        ? entry.googleCalendarId
        : null,
    syncStatus: normalizeSyncStatus(entry.syncStatus),
    createdAt:
      typeof entry.createdAt === "string"
        ? entry.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof entry.updatedAt === "string"
        ? entry.updatedAt
        : new Date().toISOString(),
  };
}

/** 開始日時の昇順。同日時は作成順。 */
export function sortAppointmentsAscending(
  appointments: ClientAppointment[],
): ClientAppointment[] {
  return [...appointments].sort((a, b) => {
    const byDate = a.startDate.localeCompare(b.startDate);
    if (byDate !== 0) return byDate;
    const timeA = a.startTime ?? "99:99";
    const timeB = b.startTime ?? "99:99";
    const byTime = timeA.localeCompare(timeB);
    if (byTime !== 0) return byTime;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** 例: 2026-08-05 → 8/5 */
export function formatAppointmentDate(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || "—";
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return value;
  return `${month}/${day}`;
}

/** 曜日（日本語・短縮） */
export function formatAppointmentWeekday(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date);
}

export function formatAppointmentMonthLabel(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const month = Number(match[2]);
  if (!Number.isFinite(month)) return "";
  return `${month}月`;
}

export function formatAppointmentDayNumber(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "—";
  const day = Number(match[3]);
  if (!Number.isFinite(day)) return "—";
  return String(day);
}

export function formatLocationTypeLabel(
  type: AppointmentLocationType,
): string {
  return LOCATION_TYPE_LABELS[type];
}

export function appointmentDisplayTitle(
  appointment: ClientAppointment,
): string {
  const title = appointment.title.trim();
  if (title) return title;
  const description = appointment.description.trim();
  if (description) return description;
  return "次回予定";
}

/**
 * Google Calendar Events API 向けペイロード。
 * 実際の OAuth / insert は未実装。フィールド対応の契約として公開する。
 */
export function toGoogleCalendarEventPayload(
  appointment: ClientAppointment,
): GoogleCalendarEventPayload {
  const summary = appointmentDisplayTitle(appointment);
  const description = appointment.description.trim();
  const locationParts = [
    formatLocationTypeLabel(appointment.locationType),
    appointment.location.trim(),
  ].filter(Boolean);
  const location = locationParts.join(" · ");
  const timeZone = appointment.timeZone || DEFAULT_TIME_ZONE;

  if (!appointment.startTime) {
    const endDate = addDays(appointment.startDate, 1);
    return {
      summary,
      description,
      location,
      start: { date: appointment.startDate, timeZone },
      end: { date: endDate, timeZone },
    };
  }

  const startDateTime = `${appointment.startDate}T${appointment.startTime}:00`;
  const endDateTime = addMinutesToLocalDateTime(
    appointment.startDate,
    appointment.startTime,
    appointment.durationMinutes,
  );

  return {
    summary,
    description,
    location,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
  };
}

function addDays(dateYmd: string, days: number): string {
  const match = dateYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateYmd;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + days,
  );
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMinutesToLocalDateTime(
  dateYmd: string,
  timeHm: string,
  minutes: number,
): string {
  const [y, mo, d] = dateYmd.split("-").map(Number);
  const [h, mi] = timeHm.split(":").map(Number);
  const date = new Date(y, mo - 1, d, h, mi + minutes, 0, 0);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd}T${hh}:${min}:00`;
}

function readLocalStore(): Record<string, ClientAppointment[]> {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, ClientAppointment[]> = {};
    for (const [clientId, entries] of Object.entries(parsed)) {
      if (!Array.isArray(entries)) continue;
      result[clientId] = entries
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          return normalizeAppointment(
            entry as Partial<ClientAppointment>,
            clientId,
          );
        })
        .filter((item): item is ClientAppointment => item !== null);
    }
    return result;
  } catch {
    return {};
  }
}

function writeLocalStore(store: Record<string, ClientAppointment[]>) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

function listLocalAppointments(clientId: string): ClientAppointment[] {
  const store = readLocalStore();
  return sortAppointmentsAscending(store[clientId] ?? []);
}

function createLocalAppointment(
  clientId: string,
  input: ClientAppointmentInput,
): ClientAppointment {
  const now = new Date().toISOString();
  const appointment = normalizeAppointment(
    {
      ...input,
      id: createId(),
      clientId,
      googleEventId: null,
      googleCalendarId: null,
      syncStatus: "local",
      createdAt: now,
      updatedAt: now,
    },
    clientId,
  )!;
  const store = readLocalStore();
  store[clientId] = sortAppointmentsAscending([
    ...(store[clientId] ?? []),
    appointment,
  ]);
  writeLocalStore(store);
  return appointment;
}

function updateLocalAppointment(
  clientId: string,
  appointmentId: string,
  input: ClientAppointmentInput,
): ClientAppointment | null {
  const store = readLocalStore();
  const list = store[clientId] ?? [];
  const index = list.findIndex((item) => item.id === appointmentId);
  if (index < 0) return null;

  const current = list[index];
  const updated = normalizeAppointment(
    {
      ...current,
      ...input,
      id: current.id,
      clientId,
      googleEventId: current.googleEventId,
      googleCalendarId: current.googleCalendarId,
      syncStatus:
        current.syncStatus === "synced" ? "pending" : current.syncStatus,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    },
    clientId,
  )!;
  list[index] = updated;
  store[clientId] = sortAppointmentsAscending(list);
  writeLocalStore(store);
  return updated;
}

function deleteLocalAppointment(
  clientId: string,
  appointmentId: string,
): boolean {
  const store = readLocalStore();
  const list = store[clientId] ?? [];
  const next = list.filter((item) => item.id !== appointmentId);
  if (next.length === list.length) return false;
  store[clientId] = next;
  writeLocalStore(store);
  return true;
}

function buildInsertPayload(
  clientId: string,
  userId: string,
  input: ClientAppointmentInput,
) {
  return {
    client_id: clientId,
    owner_id: userId,
    title: normalizeText(input.title),
    start_date: normalizeDate(input.startDate),
    start_time: normalizeTime(input.startTime),
    duration_minutes: normalizeDuration(input.durationMinutes),
    time_zone: input.timeZone?.trim() || DEFAULT_TIME_ZONE,
    location_type: normalizeLocationType(input.locationType),
    location: normalizeText(input.location),
    description: normalizeText(input.description),
    sync_status: "local" as const,
  };
}

/** 今日以降（含む）で最も近い予定。なければ null。 */
export function findNextAppointment(
  appointments: ClientAppointment[],
  today = todayInTokyo(),
): ClientAppointment | null {
  const upcoming = sortAppointmentsAscending(appointments).filter(
    (item) => item.startDate >= today,
  );
  return upcoming[0] ?? null;
}

function listLocalAppointmentsOnDate(date: string): ClientAppointment[] {
  const store = readLocalStore();
  const all: ClientAppointment[] = [];
  for (const entries of Object.values(store)) {
    for (const entry of entries) {
      if (entry.startDate === date) all.push(entry);
    }
  }
  return sortAppointmentsAscending(all);
}

/** 担当クライアント横断で、指定日の予定を取得（ダッシュボード用）。 */
export async function listOwnerAppointmentsOnDate(
  date = todayInTokyo(),
): Promise<ClientAppointment[]> {
  const auth = await getSupabaseAuth();
  if (!auth) return listLocalAppointmentsOnDate(date);

  const { data, error } = await auth.supabase
    .from("client_appointments")
    .select(SELECT_COLUMNS)
    .eq("owner_id", auth.userId)
    .eq("start_date", date)
    .order("start_time", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[client-appointments] list by date failed:", error);
    throw new Error(error.message || "今日の予定の取得に失敗しました。");
  }

  return sortAppointmentsAscending(
    (data as DbAppointmentRow[] | null)?.map(mapDbRow) ?? [],
  );
}

export async function listTodayOwnerAppointments(): Promise<
  ClientAppointment[]
> {
  return listOwnerAppointmentsOnDate(todayInTokyo());
}

export async function listClientAppointments(
  clientId: string,
): Promise<ClientAppointment[]> {
  const auth = await getSupabaseAuth();
  if (!auth) return listLocalAppointments(clientId);

  const { data, error } = await auth.supabase
    .from("client_appointments")
    .select(SELECT_COLUMNS)
    .eq("client_id", clientId)
    .eq("owner_id", auth.userId)
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[client-appointments] list failed:", error);
    throw new Error(error.message || "次回予定の取得に失敗しました。");
  }

  return sortAppointmentsAscending(
    (data as DbAppointmentRow[] | null)?.map(mapDbRow) ?? [],
  );
}

export async function getNextClientAppointment(
  clientId: string,
): Promise<ClientAppointment | null> {
  const list = await listClientAppointments(clientId);
  return findNextAppointment(list);
}

export async function createClientAppointment(
  clientId: string,
  input: ClientAppointmentInput,
): Promise<ClientAppointment> {
  const payload = buildInsertPayload(clientId, "", input);

  const auth = await getSupabaseAuth();
  if (!auth) {
    return createLocalAppointment(clientId, {
      title: payload.title,
      startDate: payload.start_date,
      startTime: payload.start_time,
      durationMinutes: payload.duration_minutes,
      timeZone: payload.time_zone,
      locationType: payload.location_type,
      location: payload.location,
      description: payload.description,
    });
  }

  const { data, error } = await auth.supabase
    .from("client_appointments")
    .insert({
      ...payload,
      owner_id: auth.userId,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[client-appointments] create failed:", error);
    throw new Error(error?.message || "次回予定の追加に失敗しました。");
  }

  return mapDbRow(data as DbAppointmentRow);
}

export async function updateClientAppointment(
  clientId: string,
  appointmentId: string,
  input: ClientAppointmentInput,
): Promise<ClientAppointment> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    const updated = updateLocalAppointment(clientId, appointmentId, input);
    if (!updated) throw new Error("次回予定が見つかりません。");
    return updated;
  }

  const updatePayload = {
    title: normalizeText(input.title),
    start_date: normalizeDate(input.startDate),
    start_time: normalizeTime(input.startTime),
    duration_minutes: normalizeDuration(input.durationMinutes),
    time_zone: input.timeZone?.trim() || DEFAULT_TIME_ZONE,
    location_type: normalizeLocationType(input.locationType),
    location: normalizeText(input.location),
    description: normalizeText(input.description),
  };

  const { data: current, error: lookupError } = await auth.supabase
    .from("client_appointments")
    .select("sync_status")
    .eq("id", appointmentId)
    .eq("client_id", clientId)
    .eq("owner_id", auth.userId)
    .maybeSingle();

  if (lookupError) {
    console.error("[client-appointments] update lookup failed:", lookupError);
    throw new Error(lookupError.message || "次回予定の更新に失敗しました。");
  }

  const nextSyncStatus =
    current?.sync_status === "synced" ? "pending" : undefined;

  const { data, error } = await auth.supabase
    .from("client_appointments")
    .update({
      ...updatePayload,
      ...(nextSyncStatus ? { sync_status: nextSyncStatus } : {}),
    })
    .eq("id", appointmentId)
    .eq("client_id", clientId)
    .eq("owner_id", auth.userId)
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[client-appointments] update failed:", error);
    throw new Error(error?.message || "次回予定の更新に失敗しました。");
  }

  return mapDbRow(data as DbAppointmentRow);
}

export async function deleteClientAppointment(
  clientId: string,
  appointmentId: string,
): Promise<void> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    if (!deleteLocalAppointment(clientId, appointmentId)) {
      throw new Error("次回予定が見つかりません。");
    }
    return;
  }

  const { error } = await auth.supabase
    .from("client_appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("client_id", clientId)
    .eq("owner_id", auth.userId);

  if (error) {
    console.error("[client-appointments] delete failed:", error);
    throw new Error(error.message || "次回予定の削除に失敗しました。");
  }
}

export function defaultAppointmentDate(): string {
  return todayInTokyo();
}

export function defaultAppointmentTime(): string {
  return "19:00";
}

export const APPOINTMENT_LOCATION_OPTIONS: {
  value: AppointmentLocationType;
  label: string;
}[] = (
  Object.entries(LOCATION_TYPE_LABELS) as [
    AppointmentLocationType,
    string,
  ][]
).map(([value, label]) => ({ value, label }));
