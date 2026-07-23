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
import type {
  HomeworkFrequency,
  HomeworkItem,
  HomeworkItemStatus,
  HomeworkPriority,
} from "@/lib/homework-followup";

export type BetaHomeworkInput = {
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  frequency: HomeworkFrequency;
  priority: HomeworkPriority;
  status?: HomeworkItemStatus;
  progress?: number;
  clientMessage?: string;
  instructorComment?: string;
};

type DbRow = {
  id: string;
  client_id: string;
  instructor_id: string;
  title: string;
  description: string;
  start_date: string;
  due_date: string;
  frequency: string;
  priority: string;
  status: string;
  progress: number;
  client_message: string;
  instructor_comment: string;
  created_at: string;
  updated_at: string;
};

function asFrequency(value: string): HomeworkFrequency {
  if (
    value === "daily" ||
    value === "weekdays" ||
    value === "weekly" ||
    value === "as_needed"
  ) {
    return value;
  }
  return "daily";
}

function asPriority(value: string): HomeworkPriority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

function asStatus(value: string): HomeworkItemStatus {
  if (
    value === "completed" ||
    value === "active" ||
    value === "not_started" ||
    value === "overdue"
  ) {
    return value;
  }
  return "not_started";
}

function mapRow(row: DbRow): HomeworkItem {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    description: row.description ?? "",
    startDate: row.start_date,
    dueDate: row.due_date,
    frequency: asFrequency(row.frequency),
    progressRate: Math.min(100, Math.max(0, Number(row.progress) || 0)),
    status: asStatus(row.status),
    instructorComment: row.instructor_comment ?? "",
    priority: asPriority(row.priority),
    clientMessage: row.client_message ?? "",
  };
}

function toPayload(
  clientId: string,
  instructorId: string,
  item: BetaHomeworkInput | HomeworkItem,
) {
  const startDate =
    "startDate" in item
      ? item.startDate
      : todayInTokyo();
  const dueDate = item.dueDate || startDate;
  return {
    client_id: clientId,
    instructor_id: instructorId,
    title: item.title.trim(),
    description: (item.description ?? "").trim(),
    start_date: startDate,
    due_date: dueDate,
    frequency: item.frequency,
    priority: item.priority,
    status: "status" in item && item.status ? item.status : "not_started",
    progress:
      "progressRate" in item
        ? item.progressRate
        : "progress" in item
          ? (item.progress ?? 0)
          : 0,
    client_message: (item.clientMessage ?? "").trim(),
    instructor_comment: (item.instructorComment ?? "").trim(),
  };
}

export async function listBetaHomeworks(
  clientId: string,
): Promise<HomeworkItem[]> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const { data, error } = await auth.supabase
    .from("homework")
    .select("*")
    .eq("instructor_id", auth.userId)
    .eq("client_id", clientId)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw mapLoadError(error, "listBetaHomeworks");
  return ((data ?? []) as DbRow[]).map(mapRow);
}

export async function createBetaHomework(
  clientId: string,
  input: BetaHomeworkInput,
): Promise<HomeworkItem> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  if (!input.title.trim()) {
    throw new DataAccessError("save_failed", "課題名を入力してください。");
  }

  const { data, error } = await auth.supabase
    .from("homework")
    .insert(toPayload(clientId, auth.userId, input))
    .select("*")
    .single();

  if (error) throw mapSaveError(error, "createBetaHomework");
  return mapRow(data as DbRow);
}

export async function updateBetaHomework(
  item: HomeworkItem,
): Promise<HomeworkItem> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const { data, error } = await auth.supabase
    .from("homework")
    .update(toPayload(item.clientId, auth.userId, item))
    .eq("id", item.id)
    .eq("instructor_id", auth.userId)
    .select("*")
    .single();

  if (error) throw mapSaveError(error, "updateBetaHomework");
  return mapRow(data as DbRow);
}

/**
 * 画面上の課題リストを DB と同期する。
 * - 既存 ID（UUID）は upsert
 * - ローカル仮 ID は insert
 * - DB にあってリストに無いものは削除
 */
export async function syncBetaHomeworks(
  clientId: string,
  items: HomeworkItem[],
): Promise<HomeworkItem[]> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const existing = await listBetaHomeworks(clientId);
  const existingIds = new Set(existing.map((row) => row.id));
  const keptIds = new Set<string>();
  const result: HomeworkItem[] = [];

  for (const item of items) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.id,
      );

    if (isUuid && existingIds.has(item.id)) {
      const updated = await updateBetaHomework(item);
      keptIds.add(updated.id);
      result.push(updated);
      continue;
    }

    const created = await createBetaHomework(clientId, {
      title: item.title,
      description: item.description,
      startDate: item.startDate,
      dueDate: item.dueDate,
      frequency: item.frequency,
      priority: item.priority,
      status: item.status,
      progress: item.progressRate,
      clientMessage: item.clientMessage,
      instructorComment: item.instructorComment,
    });
    keptIds.add(created.id);
    result.push(created);
  }

  const toDelete = existing.filter((row) => !keptIds.has(row.id));
  if (toDelete.length > 0) {
    const { error } = await auth.supabase
      .from("homework")
      .delete()
      .eq("instructor_id", auth.userId)
      .eq("client_id", clientId)
      .in(
        "id",
        toDelete.map((row) => row.id),
      );
    if (error) throw mapSaveError(error, "syncBetaHomeworks:delete");
  }

  return result;
}
