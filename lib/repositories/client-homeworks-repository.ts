import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOCAL_STORAGE_KEY = "swij-client-homeworks-v1";

export type ClientHomeworkCategory =
  | "homework"
  | "breathing"
  | "yoga"
  | "other";

export type ClientHomeworkMediaType = "none" | "video" | "pdf";

export type ClientHomework = {
  id: string;
  clientId: string;
  instructorId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  category: ClientHomeworkCategory;
  mediaType: ClientHomeworkMediaType;
  mediaUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientHomeworkInput = {
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  category?: ClientHomeworkCategory;
  mediaType?: ClientHomeworkMediaType;
  mediaUrl?: string;
};

export type HomeworkStatus = "pending" | "completed" | "overdue";

export type HomeworkAchievementStats = {
  /** null = 対象宿題が0件（「まだ記録がありません」） */
  rate: number | null;
  completed: number;
  dueTotal: number;
};

type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
};

type DbHomeworkRow = {
  id: string;
  client_id: string;
  instructor_id: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  category?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeCategory(value: string | null | undefined): ClientHomeworkCategory {
  if (
    value === "breathing" ||
    value === "yoga" ||
    value === "other" ||
    value === "homework"
  ) {
    return value;
  }
  return "homework";
}

function normalizeMediaType(
  value: string | null | undefined,
): ClientHomeworkMediaType {
  if (value === "video" || value === "pdf" || value === "none") return value;
  return "none";
}

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
  return `hw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function todayInTokyo(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalizeDate(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return todayInTokyo();
}

function normalizeTitle(value: string): string {
  return value.trim();
}

function normalizeDescription(value: string): string {
  return value.trim();
}

function mapDbRow(row: DbHomeworkRow): ClientHomework {
  return {
    id: row.id,
    clientId: row.client_id,
    instructorId: row.instructor_id,
    title: row.title,
    description: row.description ?? "",
    assignedDate: row.assigned_date,
    dueDate: row.due_date,
    isCompleted: Boolean(row.is_completed),
    completedAt: row.completed_at,
    category: normalizeCategory(row.category),
    mediaType: normalizeMediaType(row.media_type),
    mediaUrl: (row.media_url ?? "").trim(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + delta));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function completedDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    // timestamptz ISO → Asia/Tokyo の暦日
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return todayInTokyo(parsed);
    }
    return trimmed.slice(0, 10);
  }
  return null;
}

export function homeworkStatusOf(
  homework: ClientHomework,
  today = todayInTokyo(),
): HomeworkStatus {
  if (homework.isCompleted) return "completed";
  if (homework.dueDate < today) return "overdue";
  return "pending";
}

export function homeworkStatusLabel(status: HomeworkStatus): string {
  switch (status) {
    case "completed":
      return "完了";
    case "overdue":
      return "期限切れ";
    default:
      return "未完了";
  }
}

/** 例: 2026-07-22 → 7/22 */
export function formatHomeworkDate(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || "—";
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return value;
  return `${month}/${day}`;
}

export function sortHomeworksForInstructor(
  items: ClientHomework[],
  today = todayInTokyo(),
): ClientHomework[] {
  const rank = (item: ClientHomework) => {
    const status = homeworkStatusOf(item, today);
    if (status === "overdue") return 0;
    if (status === "pending") return 1;
    return 2;
  };
  return [...items].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    const byDue = a.dueDate.localeCompare(b.dueDate);
    if (byDue !== 0) return byDue;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** 今日の宿題: 開始済みかつ（期限内 or 未完了） */
export function filterTodaysHomeworks(
  items: ClientHomework[],
  today = todayInTokyo(),
): ClientHomework[] {
  return items
    .filter(
      (item) =>
        item.assignedDate <= today &&
        (item.dueDate >= today || !item.isCompleted),
    )
    .sort((a, b) => {
      const byDue = a.dueDate.localeCompare(b.dueDate);
      if (byDue !== 0) return byDue;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

/**
 * 直近30日の宿題達成率。
 * 完了数 ÷ 期限到来数 × 100。期限未到来は分母に入れない。
 */
export function computeAssignedHomeworkAchievement(
  items: ClientHomework[],
  today = todayInTokyo(),
): HomeworkAchievementStats {
  const windowStart = addDays(today, -29);
  const dueItems = items.filter(
    (item) => item.dueDate <= today && item.dueDate >= windowStart,
  );
  if (dueItems.length === 0) {
    return { rate: null, completed: 0, dueTotal: 0 };
  }
  const completed = dueItems.filter((item) => item.isCompleted).length;
  return {
    rate: Math.round((completed / dueItems.length) * 100),
    completed,
    dueTotal: dueItems.length,
  };
}

/**
 * 宿題を1つ以上完了した日を活動日とし、今日までの連続日数。
 * 今日未完了でも昨日まで連続ならその日数を返す。
 */
export function computeHomeworkStreakDays(
  items: ClientHomework[],
  today = todayInTokyo(),
): number {
  const activityDays = new Set<string>();
  for (const item of items) {
    if (!item.isCompleted) continue;
    const key = completedDateKey(item.completedAt);
    if (key) activityDays.add(key);
  }
  if (activityDays.size === 0) return 0;

  let cursor = today;
  if (!activityDays.has(today)) {
    const yesterday = addDays(today, -1);
    if (!activityDays.has(yesterday)) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  while (activityDays.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function readLocalStore(): Record<string, ClientHomework[]> {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, ClientHomework[]> = {};
    for (const [clientId, entries] of Object.entries(parsed)) {
      if (!Array.isArray(entries)) continue;
      result[clientId] = entries
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const hw = entry as Partial<ClientHomework>;
          const title = normalizeTitle(String(hw.title ?? ""));
          if (!title) return null;
          const assignedDate = normalizeDate(hw.assignedDate);
          let dueDate = normalizeDate(hw.dueDate);
          if (dueDate < assignedDate) dueDate = assignedDate;
          return {
            id: typeof hw.id === "string" ? hw.id : createId(),
            clientId:
              typeof hw.clientId === "string" ? hw.clientId : clientId,
            instructorId:
              typeof hw.instructorId === "string" ? hw.instructorId : "local",
            title,
            description: normalizeDescription(String(hw.description ?? "")),
            assignedDate,
            dueDate,
            isCompleted: Boolean(hw.isCompleted),
            completedAt:
              typeof hw.completedAt === "string" ? hw.completedAt : null,
            category: normalizeCategory(
              typeof hw.category === "string" ? hw.category : null,
            ),
            mediaType: normalizeMediaType(
              typeof hw.mediaType === "string" ? hw.mediaType : null,
            ),
            mediaUrl:
              typeof hw.mediaUrl === "string" ? hw.mediaUrl.trim() : "",
            createdAt:
              typeof hw.createdAt === "string"
                ? hw.createdAt
                : new Date().toISOString(),
            updatedAt:
              typeof hw.updatedAt === "string"
                ? hw.updatedAt
                : new Date().toISOString(),
          } satisfies ClientHomework;
        })
        .filter((item): item is ClientHomework => item !== null);
    }
    return result;
  } catch {
    return {};
  }
}

function writeLocalStore(store: Record<string, ClientHomework[]>) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

function listLocalHomeworks(clientId: string): ClientHomework[] {
  const store = readLocalStore();
  return sortHomeworksForInstructor(store[clientId] ?? []);
}

function createLocalHomework(
  clientId: string,
  input: ClientHomeworkInput,
): ClientHomework {
  const now = new Date().toISOString();
  const assignedDate = normalizeDate(input.assignedDate);
  let dueDate = normalizeDate(input.dueDate);
  if (dueDate < assignedDate) dueDate = assignedDate;
  const homework: ClientHomework = {
    id: createId(),
    clientId,
    instructorId: "local",
    title: normalizeTitle(input.title),
    description: normalizeDescription(input.description),
    assignedDate,
    dueDate,
    isCompleted: false,
    completedAt: null,
    category: input.category ?? "homework",
    mediaType: input.mediaType ?? "none",
    mediaUrl: (input.mediaUrl ?? "").trim(),
    createdAt: now,
    updatedAt: now,
  };
  const store = readLocalStore();
  store[clientId] = sortHomeworksForInstructor([
    ...(store[clientId] ?? []),
    homework,
  ]);
  writeLocalStore(store);
  return homework;
}

function updateLocalHomework(
  clientId: string,
  homeworkId: string,
  input: ClientHomeworkInput,
): ClientHomework | null {
  const store = readLocalStore();
  const list = store[clientId] ?? [];
  const index = list.findIndex((item) => item.id === homeworkId);
  if (index < 0) return null;

  const assignedDate = normalizeDate(input.assignedDate);
  let dueDate = normalizeDate(input.dueDate);
  if (dueDate < assignedDate) dueDate = assignedDate;

  const updated: ClientHomework = {
    ...list[index]!,
    title: normalizeTitle(input.title),
    description: normalizeDescription(input.description),
    assignedDate,
    dueDate,
    category: input.category ?? list[index]!.category ?? "homework",
    mediaType: input.mediaType ?? list[index]!.mediaType ?? "none",
    mediaUrl:
      input.mediaUrl !== undefined
        ? input.mediaUrl.trim()
        : list[index]!.mediaUrl ?? "",
    updatedAt: new Date().toISOString(),
  };
  list[index] = updated;
  store[clientId] = sortHomeworksForInstructor(list);
  writeLocalStore(store);
  return updated;
}

function deleteLocalHomework(clientId: string, homeworkId: string): boolean {
  const store = readLocalStore();
  const list = store[clientId] ?? [];
  const next = list.filter((item) => item.id !== homeworkId);
  if (next.length === list.length) return false;
  store[clientId] = next;
  writeLocalStore(store);
  return true;
}

function setLocalHomeworkCompletion(
  clientId: string,
  homeworkId: string,
  isCompleted: boolean,
): ClientHomework | null {
  const store = readLocalStore();
  const list = store[clientId] ?? [];
  const index = list.findIndex((item) => item.id === homeworkId);
  if (index < 0) return null;

  const current = list[index]!;
  const updated: ClientHomework = {
    ...current,
    isCompleted,
    completedAt: isCompleted
      ? current.completedAt ?? new Date().toISOString()
      : null,
    updatedAt: new Date().toISOString(),
  };
  list[index] = updated;
  store[clientId] = list;
  writeLocalStore(store);
  return updated;
}

const SELECT_COLUMNS =
  "id, client_id, instructor_id, title, description, assigned_date, due_date, is_completed, completed_at, category, media_type, media_url, created_at, updated_at";

const SELECT_COLUMNS_LEGACY =
  "id, client_id, instructor_id, title, description, assigned_date, due_date, is_completed, completed_at, created_at, updated_at";

export async function listClientHomeworks(
  clientId: string,
): Promise<ClientHomework[]> {
  const auth = await getSupabaseAuth();
  if (!auth) return listLocalHomeworks(clientId);

  let data: DbHomeworkRow[] | null = null;
  let error: { message: string } | null = null;

  {
    const primary = await auth.supabase
      .from("client_homeworks")
      .select(SELECT_COLUMNS)
      .eq("client_id", clientId)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });
    data = (primary.data as DbHomeworkRow[] | null) ?? null;
    error = primary.error;
  }

  if (error && /category|media_type|media_url/i.test(error.message)) {
    const fallback = await auth.supabase
      .from("client_homeworks")
      .select(SELECT_COLUMNS_LEGACY)
      .eq("client_id", clientId)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false });
    data = (fallback.data as DbHomeworkRow[] | null) ?? null;
    error = fallback.error;
  }

  if (error) {
    console.error("[client-homeworks] list failed:", error);
    throw new Error(error.message || "宿題の取得に失敗しました。");
  }

  return sortHomeworksForInstructor(data?.map(mapDbRow) ?? []);
}

export async function createClientHomework(
  clientId: string,
  input: ClientHomeworkInput,
): Promise<ClientHomework> {
  const title = normalizeTitle(input.title);
  if (!title) {
    throw new Error("宿題タイトルを入力してください。");
  }
  const description = normalizeDescription(input.description);
  const assignedDate = normalizeDate(input.assignedDate);
  const dueDate = normalizeDate(input.dueDate);
  if (dueDate < assignedDate) {
    throw new Error("期限は開始日以降にしてください。");
  }

  const auth = await getSupabaseAuth();
  if (!auth) {
    return createLocalHomework(clientId, {
      title,
      description,
      assignedDate,
      dueDate,
      category: input.category,
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
    });
  }

  const { data, error } = await auth.supabase
    .from("client_homeworks")
    .insert({
      client_id: clientId,
      instructor_id: auth.userId,
      title,
      description,
      assigned_date: assignedDate,
      due_date: dueDate,
      is_completed: false,
      completed_at: null,
      category: input.category ?? "homework",
      media_type: input.mediaType ?? "none",
      media_url: (input.mediaUrl ?? "").trim(),
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[client-homeworks] create failed:", error);
    throw new Error(error?.message || "宿題の追加に失敗しました。");
  }

  // Client Portal 通知（失敗しても宿題作成は成功扱い）
  void auth.supabase
    .from("client_notifications")
    .insert({
      client_id: clientId,
      kind: "homework",
      title: "新しい宿題が追加されました",
      body: title,
      href: "/client/homework",
    })
    .then(({ error: notifyError }) => {
      if (notifyError) {
        console.warn(
          "[client-homeworks] notification skipped:",
          notifyError.message,
        );
      }
    });

  return mapDbRow(data as DbHomeworkRow);
}

export async function updateClientHomework(
  clientId: string,
  homeworkId: string,
  input: ClientHomeworkInput,
): Promise<ClientHomework> {
  const title = normalizeTitle(input.title);
  if (!title) {
    throw new Error("宿題タイトルを入力してください。");
  }
  const description = normalizeDescription(input.description);
  const assignedDate = normalizeDate(input.assignedDate);
  const dueDate = normalizeDate(input.dueDate);
  if (dueDate < assignedDate) {
    throw new Error("期限は開始日以降にしてください。");
  }

  const auth = await getSupabaseAuth();
  if (!auth) {
    const updated = updateLocalHomework(clientId, homeworkId, {
      title,
      description,
      assignedDate,
      dueDate,
      category: input.category,
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
    });
    if (!updated) throw new Error("宿題が見つかりません。");
    return updated;
  }

  const { data, error } = await auth.supabase
    .from("client_homeworks")
    .update({
      title,
      description,
      assigned_date: assignedDate,
      due_date: dueDate,
      category: input.category ?? "homework",
      media_type: input.mediaType ?? "none",
      media_url: (input.mediaUrl ?? "").trim(),
    })
    .eq("id", homeworkId)
    .eq("client_id", clientId)
    .eq("instructor_id", auth.userId)
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[client-homeworks] update failed:", error);
    throw new Error(error?.message || "宿題の更新に失敗しました。");
  }

  return mapDbRow(data as DbHomeworkRow);
}

export async function deleteClientHomework(
  clientId: string,
  homeworkId: string,
): Promise<void> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    if (!deleteLocalHomework(clientId, homeworkId)) {
      throw new Error("宿題が見つかりません。");
    }
    return;
  }

  const { error } = await auth.supabase
    .from("client_homeworks")
    .delete()
    .eq("id", homeworkId)
    .eq("client_id", clientId)
    .eq("instructor_id", auth.userId);

  if (error) {
    console.error("[client-homeworks] delete failed:", error);
    throw new Error(error.message || "宿題の削除に失敗しました。");
  }
}

/**
 * クライアント本人による完了チェック更新。
 * Supabase では RPC（他人の client_id 指定でも自分以外は拒否）。
 */
export async function setOwnHomeworkCompletion(
  homeworkId: string,
  isCompleted: boolean,
  clientIdForLocal?: string,
): Promise<ClientHomework> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    if (!clientIdForLocal) {
      throw new Error("宿題の更新に失敗しました。");
    }
    const updated = setLocalHomeworkCompletion(
      clientIdForLocal,
      homeworkId,
      isCompleted,
    );
    if (!updated) throw new Error("宿題が見つかりません。");
    return updated;
  }

  const { data, error } = await auth.supabase.rpc(
    "set_own_homework_completion",
    {
      p_homework_id: homeworkId,
      p_is_completed: isCompleted,
    },
  );

  if (error || !data) {
    console.error("[client-homeworks] set completion failed:", error);
    throw new Error(error?.message || "宿題の保存に失敗しました。");
  }

  return mapDbRow(data as DbHomeworkRow);
}

export function defaultHomeworkAssignedDate(): string {
  return todayInTokyo();
}

export function defaultHomeworkDueDate(): string {
  return addDays(todayInTokyo(), 7);
}
