import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activitySlugCandidates,
  composeLocation,
  isUpcomingEventDate,
  locationLabelOf,
  makeActivitySlug,
} from "@/lib/instructor-activities/format";
import type {
  InstructorActivity,
  InstructorActivityInput,
  InstructorActivityJoin,
  InstructorActivityRow,
  InstructorActivityStatus,
  PublicActivityCard,
} from "@/lib/instructor-activities/types";
import { getOwnInstructorProfile } from "@/lib/instructors/instructor-profile-service";
import { listAdminCertifiedInstructors } from "@/lib/instructor-license/instructor-license-service";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Client = SupabaseClient<Database>;

const ACTIVITY_SELECT = `
  id, slug, instructor_id, created_by, title, image_url, event_date,
  start_time, end_time, location, is_online, summary, description,
  target, capacity, price, application_url, application_method, notes,
  instructor_name, status, published, featured, approval_status,
  created_at, updated_at
`;

function activitiesFrom(client: Client) {
  return client.from("instructor_activities");
}

async function requireClient(): Promise<Client> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

function asRow(data: unknown): InstructorActivityRow {
  return data as InstructorActivityRow;
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function joinedInstructor(
  value: InstructorActivityRow["certified_instructors"],
): InstructorActivityJoin | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapActivity(row: InstructorActivityRow): InstructorActivity {
  const instructor = joinedInstructor(row.certified_instructors);
  const joinedName = instructor ? instructorDisplayName(instructor) : "";
  return {
    id: row.id,
    slug: row.slug,
    instructorId: row.instructor_id,
    createdBy: row.created_by,
    title: text(row.title),
    imageUrl: text(row.image_url),
    eventDate: text(row.event_date),
    startTime: text(row.start_time),
    endTime: text(row.end_time),
    location: text(row.location),
    isOnline: Boolean(row.is_online),
    summary: text(row.summary),
    description: text(row.description),
    target: text(row.target),
    capacity: text(row.capacity),
    price: text(row.price),
    applicationUrl: text(row.application_url),
    applicationMethod: text(row.application_method),
    notes: text(row.notes),
    instructorName: joinedName || text(row.instructor_name) || "認定インストラクター",
    instructorHeadline: text(instructor?.headline),
    instructorBio: text(instructor?.bio),
    instructorProfileImageUrl: text(instructor?.profile_image_url),
    instructorPublicId: instructor?.id || row.instructor_id,
    status: row.status,
    published: Boolean(row.published),
    featured: Boolean(row.featured),
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCard(activity: InstructorActivity): PublicActivityCard {
  return {
    id: activity.id,
    slug: activity.slug,
    title: activity.title,
    imageUrl: activity.imageUrl,
    eventDate: activity.eventDate,
    locationLabel: locationLabelOf(activity),
    instructorName: activity.instructorName,
    instructorId: activity.instructorPublicId,
  };
}

function isMissingTable(message: string): boolean {
  return /Could not find the table ['"]?public\.instructor_activities|relation ["']instructor_activities["'] does not exist/i.test(
    message,
  );
}

async function attachInstructors(
  supabase: Client,
  rows: InstructorActivityRow[],
): Promise<InstructorActivity[]> {
  const ids = [...new Set(rows.map((row) => row.instructor_id).filter(Boolean))];
  const byId = new Map<string, InstructorActivityJoin>();
  if (ids.length > 0) {
    const { data } = await supabase
      .from("certified_instructors")
      .select(
        "id, public_name, public_display_name, display_name, legal_name, headline, bio, profile_image_url",
      )
      .in("id", ids);
    for (const item of data ?? []) {
      const instructor = item as InstructorActivityJoin;
      if (instructor.id) byId.set(instructor.id, instructor);
    }
  }
  return rows.map((row) =>
    mapActivity({
      ...row,
      certified_instructors: byId.get(row.instructor_id) ?? null,
    }),
  );
}

async function mapQueryRows(
  supabase: Client,
  data: unknown,
): Promise<InstructorActivity[]> {
  const rows = (Array.isArray(data) ? data : data ? [data] : []).map(asRow);
  return attachInstructors(supabase, rows);
}

async function mapOne(
  supabase: Client,
  data: unknown,
): Promise<InstructorActivity | null> {
  if (!data) return null;
  const [activity] = await mapQueryRows(supabase, data);
  return activity ?? null;
}

function normalizeOptional(value: string | undefined): string {
  return (value ?? "").trim();
}

function normalizeUrl(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function listPublishedActivities(options?: {
  sort?: "date" | "new";
  instructorId?: string;
  client?: Client;
}): Promise<InstructorActivity[]> {
  if (!options?.client && !isSupabaseConfigured()) return [];
  try {
    const supabase = options?.client ?? (await requireClient());
    let query = activitiesFrom(supabase)
      .select(ACTIVITY_SELECT)
      .eq("published", true)
      .eq("status", "published");
    if (options?.instructorId) {
      query = query.eq("instructor_id", options.instructorId);
    }
    query =
      options?.sort === "new"
        ? query.order("created_at", { ascending: false })
        : query.order("event_date", { ascending: true }).order("start_time", {
            ascending: true,
          });
    const { data, error } = await query;
    if (error) {
      if (isMissingTable(error.message)) return [];
      console.error("[instructor-activities] listPublished:", error.message);
      return [];
    }
    const items = await mapQueryRows(supabase, data);
    return items.sort((a, b) => {
      const aUp = isUpcomingEventDate(a.eventDate) ? 0 : 1;
      const bUp = isUpcomingEventDate(b.eventDate) ? 0 : 1;
      if (aUp !== bUp) return aUp - bUp;
      if (options?.sort === "new") return 0;
      return a.eventDate.localeCompare(b.eventDate);
    });
  } catch (error) {
    console.error("[instructor-activities] listPublished:", error);
    return [];
  }
}

export async function listHomeFeaturedActivities(
  limit = 4,
  client?: Client,
): Promise<PublicActivityCard[]> {
  const published = await listPublishedActivities({ sort: "date", client });
  const upcoming = published.filter((item) => isUpcomingEventDate(item.eventDate));
  const featured = upcoming.filter((item) => item.featured);
  const rest = upcoming.filter((item) => !item.featured);
  return [...featured, ...rest].slice(0, limit).map(toCard);
}

export async function getPublishedActivityBySlug(
  slug: string,
  client?: Client,
): Promise<InstructorActivity | null> {
  const candidates = activitySlugCandidates(slug);
  if (candidates.length === 0) return null;
  if (!client && !isSupabaseConfigured()) return null;
  try {
    const supabase = client ?? (await requireClient());
    for (const candidate of candidates) {
      const { data, error } = await activitiesFrom(supabase)
        .select(ACTIVITY_SELECT)
        .eq("slug", candidate)
        .eq("published", true)
        .eq("status", "published")
        .maybeSingle();
      if (error) {
        if (isMissingTable(error.message)) return null;
        console.error("[instructor-activities] getBySlug:", error.message);
        continue;
      }
      if (data) return mapOne(supabase, data);
    }
    return null;
  } catch (error) {
    console.error("[instructor-activities] getBySlug:", error);
    return null;
  }
}

export async function listOwnActivities(
  client?: Client,
): Promise<InstructorActivity[]> {
  const supabase = client ?? (await requireClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await activitiesFrom(supabase)
    .select(ACTIVITY_SELECT)
    .eq("created_by", user.id)
    .order("event_date", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) {
    if (isMissingTable(error.message)) {
      throw new Error(
        "イベント機能のデータベースが未設定です。運営にお問い合わせください。",
      );
    }
    throw new Error(error.message);
  }
  return mapQueryRows(supabase, data);
}

export async function getOwnActivityById(
  id: string,
  client?: Client,
): Promise<InstructorActivity | null> {
  const supabase = client ?? (await requireClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await activitiesFrom(supabase)
    .select(ACTIVITY_SELECT)
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return mapOne(supabase, data);
}

function validateInput(input: InstructorActivityInput): void {
  if (!text(input.title)) throw new Error("イベントタイトルを入力してください");
  if (!text(input.imageUrl)) throw new Error("メイン画像を登録してください");
  if (!text(input.eventDate)) throw new Error("開催日を入力してください");
  if (!text(input.startTime)) throw new Error("開始時間を入力してください");
  if (!text(input.endTime)) throw new Error("終了時間を入力してください");
  if (!text(input.summary)) throw new Error("イベント概要を入力してください");
  const location = composeLocation(input.region, input.venue) || text(input.location);
  if (!input.isOnline && !location) {
    throw new Error("開催地域または会場名を入力するか、オンラインを選んでください");
  }
}

function fieldsFromInput(
  input: InstructorActivityInput,
  status: InstructorActivityStatus,
): Record<string, unknown> {
  validateInput(input);
  return {
    title: text(input.title),
    image_url: text(input.imageUrl),
    event_date: text(input.eventDate),
    start_time: text(input.startTime) || null,
    end_time: text(input.endTime) || null,
    location:
      composeLocation(input.region, input.venue) || normalizeOptional(input.location),
    is_online: Boolean(input.isOnline),
    summary: text(input.summary),
    description: normalizeOptional(input.description),
    target: normalizeOptional(input.target),
    capacity: normalizeOptional(input.capacity),
    price: normalizeOptional(input.price),
    application_url: normalizeUrl(input.applicationUrl),
    application_method: normalizeOptional(input.applicationMethod),
    notes: normalizeOptional(input.notes),
    featured: Boolean(input.featured),
    status,
  };
}

async function payloadForSave(
  supabase: Client,
  input: InstructorActivityInput,
  status: InstructorActivityStatus,
): Promise<Record<string, unknown>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  const profile = await getOwnInstructorProfile(supabase);
  if (!profile?.id) {
    throw new Error("認定講師レコードが見つかりません");
  }
  validateInput(input);
  return {
    instructor_id: profile.id,
    created_by: user.id,
    instructor_name: profile.publicDisplayName.trim() || profile.displayName,
    ...fieldsFromInput(input, status),
  };
}

export async function createOwnActivity(
  input: InstructorActivityInput,
  status: InstructorActivityStatus,
  client?: Client,
): Promise<InstructorActivity> {
  const supabase = client ?? (await requireClient());
  const payload = await payloadForSave(supabase, input, status);
  return insertActivityWithSlug(supabase, payload, input.title, input.eventDate);
}

export async function updateOwnActivity(
  id: string,
  input: InstructorActivityInput,
  status: InstructorActivityStatus,
  client?: Client,
): Promise<InstructorActivity> {
  const supabase = client ?? (await requireClient());
  const existing = await getOwnActivityById(id, supabase);
  if (!existing) throw new Error("イベントが見つからないか、編集できません");
  const payload = await payloadForSave(supabase, input, status);
  const { data, error } = await activitiesFrom(supabase)
    .update(payload as never)
    .eq("id", id)
    .eq("created_by", existing.createdBy)
    .select(ACTIVITY_SELECT)
    .single();
  if (error) throw new Error(error.message);
  const saved = await mapOne(supabase, data);
  if (!saved) throw new Error("イベントの保存に失敗しました");
  return saved;
}

export async function setOwnActivityStatus(
  id: string,
  status: InstructorActivityStatus,
  client?: Client,
): Promise<InstructorActivity> {
  const supabase = client ?? (await requireClient());
  const existing = await getOwnActivityById(id, supabase);
  if (!existing) throw new Error("イベントが見つからないか、編集できません");
  if (status === "published") {
    validateInput({
      title: existing.title,
      imageUrl: existing.imageUrl,
      eventDate: existing.eventDate,
      startTime: existing.startTime,
      endTime: existing.endTime,
      location: existing.location,
      isOnline: existing.isOnline,
      summary: existing.summary,
    });
  }
  const { data, error } = await activitiesFrom(supabase)
    .update({ status } as never)
    .eq("id", id)
    .eq("created_by", existing.createdBy)
    .select(ACTIVITY_SELECT)
    .single();
  if (error) throw new Error(error.message);
  const saved = await mapOne(supabase, data);
  if (!saved) throw new Error("イベントの保存に失敗しました");
  return saved;
}

export async function deleteOwnActivity(
  id: string,
  client?: Client,
): Promise<void> {
  const supabase = client ?? (await requireClient());
  const existing = await getOwnActivityById(id, supabase);
  if (!existing) throw new Error("イベントが見つからないか、削除できません");
  const { error } = await activitiesFrom(supabase)
    .delete()
    .eq("id", id)
    .eq("created_by", existing.createdBy);
  if (error) throw new Error(error.message);
}

async function getActivityRowById(
  id: string,
  supabase: Client,
): Promise<InstructorActivity | null> {
  const { data, error } = await activitiesFrom(supabase)
    .select(ACTIVITY_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return mapOne(supabase, data);
}

export async function listAllActivitiesForAdmin(): Promise<InstructorActivity[]> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const { data, error } = await activitiesFrom(supabase)
    .select(ACTIVITY_SELECT)
    .order("event_date", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[instructor-activities] listAll:", error.message);
    if (isMissingTable(error.message)) {
      throw new Error(
        "イベント機能のデータベースが未設定です。supabase/instructor-activities.sql を実行してください。",
      );
    }
    throw new Error(error.message);
  }
  return mapQueryRows(supabase, data);
}

export async function getActivityByIdForAdmin(
  id: string,
): Promise<InstructorActivity | null> {
  await requireAdminProfile();
  const supabase = await requireClient();
  return getActivityRowById(id, supabase);
}

export async function updateActivityAsAdmin(
  id: string,
  input: InstructorActivityInput,
  status: InstructorActivityStatus,
): Promise<InstructorActivity> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getActivityRowById(id, supabase);
  if (!existing) throw new Error("イベントが見つかりません");
  const { data, error } = await activitiesFrom(supabase)
    .update(fieldsFromInput(input, status) as never)
    .eq("id", id)
    .select(ACTIVITY_SELECT)
    .single();
  if (error) throw new Error(error.message);
  const saved = await mapOne(supabase, data);
  if (!saved) throw new Error("イベントの保存に失敗しました");
  return saved;
}

export async function setActivityStatusAsAdmin(
  id: string,
  status: InstructorActivityStatus,
): Promise<InstructorActivity> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getActivityRowById(id, supabase);
  if (!existing) throw new Error("イベントが見つかりません");
  if (status === "published") {
    validateInput({
      title: existing.title,
      imageUrl: existing.imageUrl,
      eventDate: existing.eventDate,
      startTime: existing.startTime,
      endTime: existing.endTime,
      location: existing.location,
      isOnline: existing.isOnline,
      summary: existing.summary,
    });
  }
  const { data, error } = await activitiesFrom(supabase)
    .update({ status } as never)
    .eq("id", id)
    .select(ACTIVITY_SELECT)
    .single();
  if (error) throw new Error(error.message);
  const saved = await mapOne(supabase, data);
  if (!saved) throw new Error("イベントの保存に失敗しました");
  return saved;
}

export async function deleteActivityAsAdmin(id: string): Promise<void> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getActivityRowById(id, supabase);
  if (!existing) throw new Error("イベントが見つかりません");
  const { error } = await activitiesFrom(supabase).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type AssignableInstructor = {
  id: string;
  name: string;
  email: string;
};

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

export async function listAssignableInstructorsForAdmin(): Promise<
  AssignableInstructor[]
> {
  const instructors = await listAdminCertifiedInstructors();
  return instructors
    .filter((item) => {
      const status = item.instructorStatus.trim() || "active";
      return status !== "suspended" && status !== "withdrawn";
    })
    .map((item) => {
      const activity = item.activityName.trim();
      const legal = item.legalName.trim();
      const name =
        activity && legal && activity !== legal
          ? `${activity} / ${legal}`
          : activity || legal || "認定インストラクター";
      return {
        id: item.instructorId,
        name,
        email: item.email,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

async function insertActivityWithSlug(
  supabase: Client,
  payload: Record<string, unknown>,
  title: string,
  eventDate: string,
): Promise<InstructorActivity> {
  let lastError = "イベントの登録に失敗しました";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = makeActivitySlug(title, eventDate);
    const { data, error } = await activitiesFrom(supabase)
      .insert({ ...payload, slug } as never)
      .select(ACTIVITY_SELECT)
      .single();
    if (!error && data) {
      const created = await mapOne(supabase, data);
      if (created) return created;
    }
    if (error) {
      if (isMissingTable(error.message)) {
        throw new Error(
          "イベント機能のデータベースが未設定です。運営にお問い合わせください。",
        );
      }
      lastError = error.message;
      if (error.code === "23505") continue;
      throw new Error(error.message);
    }
  }
  throw new Error(lastError);
}

export async function createActivityAsAdmin(
  input: InstructorActivityInput,
  status: InstructorActivityStatus,
  instructorId: string,
): Promise<InstructorActivity> {
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
    .select("id, user_id, public_name, public_display_name, display_name, legal_name, status")
    .eq("id", selectedId)
    .maybeSingle();
  if (instructorError) throw new Error(instructorError.message);
  if (!instructor) throw new Error("認定講師が見つかりません");
  if (instructor.status !== "active") {
    throw new Error("有効な認定講師を選択してください");
  }

  const payload = {
    instructor_id: instructor.id,
    created_by: instructor.user_id || user.id,
    instructor_name: instructorDisplayName(instructor),
    ...fieldsFromInput(input, status),
  };
  return insertActivityWithSlug(
    supabase,
    payload,
    input.title,
    input.eventDate,
  );
}

export function toPublicCard(activity: InstructorActivity): PublicActivityCard {
  return toCard(activity);
}
