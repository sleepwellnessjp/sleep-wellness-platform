import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InstructorActivitySchedule,
  InstructorActivityScheduleInput,
  InstructorActivityScheduleRow,
  PublicActivityScheduleItem,
  ScheduleInstructorOption,
} from "@/lib/instructor-activity-schedules/types";
import { getOwnInstructorProfile } from "@/lib/instructors/instructor-profile-service";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { connection } from "next/server";

type Client = SupabaseClient<Database>;

const SCHEDULE_SELECT_BASE =
  "id, instructor_id, created_by, activity_date, title, summary, external_url, instructor_name, created_at, updated_at";
const SCHEDULE_SELECT = `${SCHEDULE_SELECT_BASE}, published`;

const HOME_LIMIT = 6;
const TITLE_MAX = 80;
const SUMMARY_MAX = 160;
const URL_MAX = 500;

function schedulesFrom(client: Client) {
  return (client as unknown as SupabaseClient).from(
    "instructor_activity_schedules",
  );
}

function tokyoToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

function revalidateHomeSchedules() {
  revalidatePath("/");
}

async function requireClient(): Promise<Client> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function isMissingTable(message: string): boolean {
  return /Could not find the table ['"]?public\.instructor_activity_schedules|relation ["']instructor_activity_schedules["'] does not exist/i.test(
    message,
  );
}

function isMissingPublished(message: string): boolean {
  return /published/i.test(message) && /does not exist|Could not find/i.test(message);
}

function dbSetupError(message: string): Error {
  if (isMissingTable(message) || isMissingPublished(message)) {
    return new Error(
      "活動予定のデータベースが未設定です。supabase/instructor-activity-schedules-published.sql を実行してください。",
    );
  }
  return new Error(message);
}

function mapSchedule(row: InstructorActivityScheduleRow): InstructorActivitySchedule {
  return {
    id: row.id,
    instructorId: row.instructor_id,
    createdBy: row.created_by,
    activityDate: text(row.activity_date),
    title: text(row.title),
    summary: text(row.summary),
    externalUrl: text(row.external_url),
    instructorName: text(row.instructor_name) || "認定インストラクター",
    published: row.published !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPublicItem(
  schedule: InstructorActivitySchedule,
): PublicActivityScheduleItem {
  return {
    id: schedule.id,
    activityDate: schedule.activityDate,
    title: schedule.title,
    summary: schedule.summary,
    externalUrl: schedule.externalUrl,
    instructorName: schedule.instructorName,
  };
}

function asRow(data: unknown): InstructorActivityScheduleRow {
  return data as InstructorActivityScheduleRow;
}

async function insertSchedule(
  supabase: Client,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const first = await schedulesFrom(supabase)
    .insert(payload as never)
    .select(SCHEDULE_SELECT)
    .single();
  if (!first.error) return first.data;
  if (!isMissingPublished(first.error.message)) {
    throw dbSetupError(first.error.message);
  }
  const rest = { ...payload };
  delete rest.published;
  const fallback = await schedulesFrom(supabase)
    .insert(rest as never)
    .select(SCHEDULE_SELECT_BASE)
    .single();
  if (fallback.error) throw dbSetupError(fallback.error.message);
  return fallback.data;
}

async function updateScheduleById(
  supabase: Client,
  id: string,
  payload: Record<string, unknown>,
  extraEq?: { column: string; value: string },
): Promise<unknown> {
  let query = schedulesFrom(supabase)
    .update(payload as never)
    .eq("id", id);
  if (extraEq) query = query.eq(extraEq.column, extraEq.value);
  const first = await query.select(SCHEDULE_SELECT).single();
  if (!first.error) return first.data;
  if (!isMissingPublished(first.error.message)) {
    throw new Error(first.error.message);
  }
  const rest = { ...payload };
  delete rest.published;
  if ("published" in payload && Object.keys(rest).length === 0) {
    throw dbSetupError(first.error.message);
  }
  let fallbackQuery = schedulesFrom(supabase)
    .update(rest as never)
    .eq("id", id);
  if (extraEq) fallbackQuery = fallbackQuery.eq(extraEq.column, extraEq.value);
  const fallback = await fallbackQuery.select(SCHEDULE_SELECT_BASE).single();
  if (fallback.error) throw new Error(fallback.error.message);
  if (!fallback.data) throw new Error("活動予定の保存に失敗しました");
  return fallback.data;
}

function mapRows(data: unknown): InstructorActivitySchedule[] {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows.map((row) => mapSchedule(asRow(row)));
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateInput(input: InstructorActivityScheduleInput): {
  activityDate: string;
  title: string;
  summary: string;
  externalUrl: string;
} {
  const activityDate = text(input.activityDate);
  const title = text(input.title).slice(0, TITLE_MAX);
  const summary = text(input.summary).slice(0, SUMMARY_MAX);
  const externalUrl = normalizeUrl(input.externalUrl).slice(0, URL_MAX);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(activityDate)) {
    throw new Error("日付を入力してください");
  }
  if (!title) throw new Error("活動タイトルを入力してください");
  if (!summary) throw new Error("短い説明を入力してください");
  if (!externalUrl) throw new Error("外部リンクを入力してください");
  if (!isHttpUrl(externalUrl)) {
    throw new Error("外部リンクは http または https のURLを入力してください");
  }

  return { activityDate, title, summary, externalUrl };
}

function instructorDisplayName(row: {
  public_name?: string | null;
  public_display_name?: string | null;
  display_name?: string | null;
  legal_name?: string | null;
}): string {
  const publicName = text(row.public_name) || text(row.public_display_name);
  const legalName = text(row.legal_name);
  const displayName = text(row.display_name);
  if (publicName && legalName && publicName !== legalName) {
    return `${publicName} / ${legalName}`;
  }
  return publicName || legalName || displayName || "認定インストラクター";
}

export async function listHomeActivitySchedules(
  limit = HOME_LIMIT,
  client?: Client,
): Promise<PublicActivityScheduleItem[]> {
  if (!client && !isSupabaseConfigured()) return [];
  try {
    await connection();
    const supabase = client ?? (await requireClient());
    const today = tokyoToday();
    let { data, error } = await schedulesFrom(supabase)
      .select(SCHEDULE_SELECT)
      .eq("published", true)
      .gte("activity_date", today)
      .order("activity_date", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error && isMissingPublished(error.message)) {
      const fallback = await schedulesFrom(supabase)
        .select(SCHEDULE_SELECT_BASE)
        .gte("activity_date", today)
        .order("activity_date", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(limit);
      data = fallback.data as typeof data;
      error = fallback.error;
    }
    if (error) {
      if (isMissingTable(error.message)) {
        return [];
      }
      console.error("[activity-schedules] listHome:", error.message);
      return [];
    }
    return mapRows(data).map(toPublicItem);
  } catch (error) {
    console.error("[activity-schedules] listHome:", error);
    return [];
  }
}

export async function listOwnActivitySchedules(
  client?: Client,
): Promise<InstructorActivitySchedule[]> {
  const supabase = client ?? (await requireClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  let { data, error } = await schedulesFrom(supabase)
    .select(SCHEDULE_SELECT)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .order("activity_date", { ascending: false });
  if (error && isMissingPublished(error.message)) {
    const fallback = await schedulesFrom(supabase)
      .select(SCHEDULE_SELECT_BASE)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .order("activity_date", { ascending: false });
    data = fallback.data as typeof data;
    error = fallback.error;
  }
  if (error) throw dbSetupError(error.message);
  return mapRows(data);
}

async function getOwnScheduleById(
  id: string,
  supabase: Client,
): Promise<InstructorActivitySchedule | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  let { data, error } = await schedulesFrom(supabase)
    .select(SCHEDULE_SELECT)
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();
  if (error && isMissingPublished(error.message)) {
    const fallback = await schedulesFrom(supabase)
      .select(SCHEDULE_SELECT_BASE)
      .eq("id", id)
      .eq("created_by", user.id)
      .maybeSingle();
    data = fallback.data as typeof data;
    error = fallback.error;
  }
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapSchedule(asRow(data));
}

async function payloadForOwnSave(
  supabase: Client,
  input: InstructorActivityScheduleInput,
): Promise<Record<string, unknown>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const profile = await getOwnInstructorProfile(supabase);
  if (!profile?.id) {
    throw new Error("認定講師レコードが見つかりません");
  }
  const fields = validateInput(input);
  return {
    instructor_id: profile.id,
    created_by: user.id,
    instructor_name: profile.publicDisplayName.trim() || profile.displayName,
    activity_date: fields.activityDate,
    title: fields.title,
    summary: fields.summary,
    external_url: fields.externalUrl,
  };
}

export async function createOwnActivitySchedule(
  input: InstructorActivityScheduleInput,
  client?: Client,
): Promise<InstructorActivitySchedule> {
  const supabase = client ?? (await requireClient());
  const payload = {
    ...(await payloadForOwnSave(supabase, input)),
    published: true,
  };
  const schedule = mapSchedule(asRow(await insertSchedule(supabase, payload)));
  revalidateHomeSchedules();
  return schedule;
}

export async function updateOwnActivitySchedule(
  id: string,
  input: InstructorActivityScheduleInput,
  client?: Client,
): Promise<InstructorActivitySchedule> {
  const supabase = client ?? (await requireClient());
  const existing = await getOwnScheduleById(id, supabase);
  if (!existing) throw new Error("活動予定が見つからないか、編集できません");
  const payload = await payloadForOwnSave(supabase, input);
  const data = await updateScheduleById(supabase, id, payload, {
    column: "created_by",
    value: existing.createdBy,
  });
  revalidateHomeSchedules();
  return mapSchedule(asRow(data));
}

export async function deleteOwnActivitySchedule(
  id: string,
  client?: Client,
): Promise<void> {
  const supabase = client ?? (await requireClient());
  const existing = await getOwnScheduleById(id, supabase);
  if (!existing) throw new Error("活動予定が見つからないか、削除できません");
  const { error } = await schedulesFrom(supabase)
    .delete()
    .eq("id", id)
    .eq("created_by", existing.createdBy);
  if (error) throw new Error(error.message);
  revalidateHomeSchedules();
}

async function getScheduleRowById(
  id: string,
  supabase: Client,
): Promise<InstructorActivitySchedule | null> {
  let { data, error } = await schedulesFrom(supabase)
    .select(SCHEDULE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error && isMissingPublished(error.message)) {
    const fallback = await schedulesFrom(supabase)
      .select(SCHEDULE_SELECT_BASE)
      .eq("id", id)
      .maybeSingle();
    data = fallback.data as typeof data;
    error = fallback.error;
  }
  if (error) throw dbSetupError(error.message);
  if (!data) return null;
  return mapSchedule(asRow(data));
}

export async function listAllSchedulesForAdmin(): Promise<
  InstructorActivitySchedule[]
> {
  await requireAdminProfile();
  const supabase = await requireClient();
  let { data, error } = await schedulesFrom(supabase)
    .select(SCHEDULE_SELECT)
    .order("created_at", { ascending: false })
    .order("activity_date", { ascending: false });
  if (error && isMissingPublished(error.message)) {
    const fallback = await schedulesFrom(supabase)
      .select(SCHEDULE_SELECT_BASE)
      .order("created_at", { ascending: false })
      .order("activity_date", { ascending: false });
    data = fallback.data as typeof data;
    error = fallback.error;
  }
  if (error) throw dbSetupError(error.message);
  return mapRows(data);
}

export async function getScheduleByIdForAdmin(
  id: string,
): Promise<InstructorActivitySchedule | null> {
  await requireAdminProfile();
  const supabase = await requireClient();
  return getScheduleRowById(id, supabase);
}

export async function listInstructorsForScheduleAdmin(): Promise<
  ScheduleInstructorOption[]
> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const { data, error } = await supabase
    .from("certified_instructors")
    .select(
      "id, public_name, public_display_name, display_name, legal_name, status",
    )
    .eq("status", "active");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => ({
      id: String(row.id),
      name: instructorDisplayName(row),
      email: "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export async function createScheduleAsAdmin(
  input: InstructorActivityScheduleInput,
  instructorId: string,
): Promise<InstructorActivitySchedule> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const selectedId = instructorId.trim() || text(input.instructorId);
  if (!selectedId) {
    throw new Error("担当認定インストラクターを選択してください");
  }

  const { data: instructor, error: instructorError } = await supabase
    .from("certified_instructors")
    .select(
      "id, user_id, public_name, public_display_name, display_name, legal_name, status",
    )
    .eq("id", selectedId)
    .maybeSingle();
  if (instructorError) throw new Error(instructorError.message);
  if (!instructor) throw new Error("認定講師が見つかりません");
  if (instructor.status !== "active") {
    throw new Error("有効な認定講師を選択してください");
  }

  const fields = validateInput(input);
  const payload = {
    instructor_id: instructor.id,
    created_by: instructor.user_id || user.id,
    instructor_name: instructorDisplayName(instructor),
    activity_date: fields.activityDate,
    title: fields.title,
    summary: fields.summary,
    external_url: fields.externalUrl,
    published: input.published !== false,
  };
  const schedule = mapSchedule(asRow(await insertSchedule(supabase, payload)));
  revalidateHomeSchedules();
  return schedule;
}

export async function updateScheduleAsAdmin(
  id: string,
  input: InstructorActivityScheduleInput,
): Promise<InstructorActivitySchedule> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getScheduleRowById(id, supabase);
  if (!existing) throw new Error("活動予定が見つかりません");
  const fields = validateInput(input);
  const payload: Record<string, unknown> = {
    activity_date: fields.activityDate,
    title: fields.title,
    summary: fields.summary,
    external_url: fields.externalUrl,
  };
  if (typeof input.published === "boolean") {
    payload.published = input.published;
  }
  const data = await updateScheduleById(supabase, id, payload);
  revalidateHomeSchedules();
  return mapSchedule(asRow(data));
}

export async function setSchedulePublishedAsAdmin(
  id: string,
  published: boolean,
): Promise<InstructorActivitySchedule> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getScheduleRowById(id, supabase);
  if (!existing) throw new Error("活動予定が見つかりません");
  const data = await updateScheduleById(supabase, id, { published });
  revalidateHomeSchedules();
  return mapSchedule(asRow(data));
}

export async function deleteScheduleAsAdmin(id: string): Promise<void> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getScheduleRowById(id, supabase);
  if (!existing) throw new Error("活動予定が見つかりません");
  const { error } = await schedulesFrom(supabase).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateHomeSchedules();
}
