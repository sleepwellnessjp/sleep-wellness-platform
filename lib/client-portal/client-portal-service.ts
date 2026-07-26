import {
  getCurrentProfile,
} from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isClientGoalCategory, isClientGoalStatus } from "./constants";
import type {
  ClientGoalProgress,
  ClientNotificationKind,
  ClientPortalMessage,
  ClientPortalNotification,
  ClientPortalPrefs,
  CreateClientGoalInput,
  CreateClientMessageInput,
} from "./types";

type ServerClient = NonNullable<
  Awaited<ReturnType<typeof createServerSupabaseClient>>
>;

export function toJapaneseAuthError(message: string): {
  error: string;
  status: number;
} {
  if (/not authenticated|jwt|auth/i.test(message)) {
    return { error: "ログインが必要です", status: 401 };
  }
  if (/permission|policy|rls|forbidden/i.test(message)) {
    return { error: "この操作を行う権限がありません", status: 403 };
  }
  return { error: message || "処理に失敗しました", status: 400 };
}

async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("ログインが必要です");
  }
  return profile;
}

async function requireSupabase(): Promise<ServerClient> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

async function resolveLinkedClientId(
  supabase: ServerClient,
  userId: string,
  preferredClientId?: string,
): Promise<string | null> {
  if (preferredClientId) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("id", preferredClientId)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }

  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", userId)
    .limit(1)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

function mapMessage(row: Record<string, unknown>): ClientPortalMessage {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    instructorId: String(row.instructor_id),
    senderRole: row.sender_role === "client" ? "client" : "instructor",
    senderId: String(row.sender_id),
    body: String(row.body ?? ""),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapNotification(row: Record<string, unknown>): ClientPortalNotification {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    kind: (String(row.kind) as ClientPortalNotification["kind"]) || "system",
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    href: String(row.href ?? ""),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapGoal(row: Record<string, unknown>): ClientGoalProgress {
  const category = String(row.category ?? "sleep");
  const status = String(row.status ?? "active");
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    instructorId: row.instructor_id ? String(row.instructor_id) : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: isClientGoalCategory(category) ? category : "other",
    targetValue:
      row.target_value == null || Number.isNaN(Number(row.target_value))
        ? null
        : Number(row.target_value),
    currentValue:
      row.current_value == null || Number.isNaN(Number(row.current_value))
        ? null
        : Number(row.current_value),
    unit: String(row.unit ?? ""),
    progressPercent: Math.max(
      0,
      Math.min(100, Math.round(Number(row.progress_percent ?? 0))),
    ),
    status: isClientGoalStatus(status) ? status : "active",
    startsOn: row.starts_on ? String(row.starts_on) : null,
    targetOn: row.target_on ? String(row.target_on) : null,
    achievedAt: row.achieved_at ? String(row.achieved_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getMyPortalPrefs(
  clientId?: string,
): Promise<ClientPortalPrefs | null> {
  const profile = await requireProfile();
  const supabase = await requireSupabase();
  const linkedId = await resolveLinkedClientId(
    supabase,
    profile.id,
    clientId,
  );
  if (!linkedId) return null;

  const { data, error } = await supabase
    .from("client_profiles")
    .select(
      "portal_enabled, current_goal_summary, improvement_target_score, notification_prefs, last_portal_seen_at",
    )
    .eq("client_id", linkedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    return {
      portalEnabled: true,
      currentGoalSummary: "",
      improvementTargetScore: null,
      notificationPrefs: {},
      lastPortalSeenAt: null,
    };
  }

  const prefs =
    data.notification_prefs &&
    typeof data.notification_prefs === "object" &&
    !Array.isArray(data.notification_prefs)
      ? (data.notification_prefs as Record<string, unknown>)
      : {};

  return {
    portalEnabled: data.portal_enabled !== false,
    currentGoalSummary: String(data.current_goal_summary ?? ""),
    improvementTargetScore:
      data.improvement_target_score == null
        ? null
        : Number(data.improvement_target_score),
    notificationPrefs: prefs,
    lastPortalSeenAt: data.last_portal_seen_at
      ? String(data.last_portal_seen_at)
      : null,
  };
}

export async function touchMyPortalSeen(clientId?: string): Promise<void> {
  const profile = await requireProfile();
  const supabase = await requireSupabase();
  const linkedId = await resolveLinkedClientId(
    supabase,
    profile.id,
    clientId,
  );
  if (!linkedId) return;

  await supabase
    .from("client_profiles")
    .update({ last_portal_seen_at: new Date().toISOString() })
    .eq("client_id", linkedId);
}

export async function listMyMessages(
  clientId?: string,
): Promise<ClientPortalMessage[]> {
  const profile = await requireProfile();
  const supabase = await requireSupabase();

  let query = supabase
    .from("client_messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (profile.role === "client") {
    const linkedId = await resolveLinkedClientId(supabase, profile.id, clientId);
    if (!linkedId) return [];
    query = query.eq("client_id", linkedId);
  } else if (clientId) {
    if (profile.role === "instructor") {
      const { data: owned, error: ownedError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .eq("instructor_id", profile.id)
        .maybeSingle();
      if (ownedError) throw new Error(ownedError.message);
      if (!owned) {
        throw new Error("担当外のクライアントのメッセージは閲覧できません");
      }
    }
    query = query.eq("client_id", clientId);
  } else {
    query = query.eq("instructor_id", profile.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapMessage(row as Record<string, unknown>));
}

export async function sendMessage(
  input: CreateClientMessageInput,
): Promise<ClientPortalMessage> {
  const profile = await requireProfile();
  const body = input.body.trim();
  if (!body) throw new Error("メッセージを入力してください");
  if (body.length > 4000) throw new Error("メッセージは4000文字以内です");

  const supabase = await requireSupabase();
  let clientId = input.clientId;
  let instructorId = profile.id;
  let senderRole = input.asRole ?? (profile.role === "client" ? "client" : "instructor");

  if (profile.role === "client") {
    const linkedId = await resolveLinkedClientId(supabase, profile.id, clientId);
    if (!linkedId) throw new Error("クライアント連携が見つかりません");
    clientId = linkedId;
    senderRole = "client";
    const { data: clientRow, error: clientError } = await supabase
      .from("clients")
      .select("instructor_id")
      .eq("id", clientId)
      .maybeSingle();
    if (clientError) throw new Error(clientError.message);
    if (!clientRow?.instructor_id) {
      throw new Error("担当認定講師が設定されていません");
    }
    instructorId = String(clientRow.instructor_id);
  } else {
    if (!clientId) throw new Error("クライアントが指定されていません");
    const { data: clientRow, error: clientError } = await supabase
      .from("clients")
      .select("id, instructor_id")
      .eq("id", clientId)
      .maybeSingle();
    if (clientError) throw new Error(clientError.message);
    if (!clientRow) throw new Error("クライアントが見つかりません");
    if (
      profile.role === "instructor" &&
      clientRow.instructor_id &&
      String(clientRow.instructor_id) !== profile.id
    ) {
      throw new Error("担当外のクライアントのメッセージは操作できません");
    }
    instructorId = String(clientRow.instructor_id ?? profile.id);
    senderRole = "instructor";
  }

  const { data, error } = await supabase
    .from("client_messages")
    .insert({
      client_id: clientId,
      instructor_id: instructorId,
      sender_role: senderRole,
      sender_id: profile.id,
      body,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapMessage(data as Record<string, unknown>);
}

export async function markMessagesRead(
  clientId?: string,
): Promise<number> {
  const profile = await requireProfile();
  const supabase = await requireSupabase();
  const linkedId =
    profile.role === "client"
      ? await resolveLinkedClientId(supabase, profile.id, clientId)
      : clientId;
  if (!linkedId) return 0;

  const oppositeRole = profile.role === "client" ? "instructor" : "client";
  const { data, error } = await supabase
    .from("client_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("client_id", linkedId)
    .eq("sender_role", oppositeRole)
    .is("read_at", null)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function listMyNotifications(
  clientId?: string,
): Promise<ClientPortalNotification[]> {
  const profile = await requireProfile();
  const supabase = await requireSupabase();
  const linkedId =
    profile.role === "client"
      ? await resolveLinkedClientId(supabase, profile.id, clientId)
      : clientId;
  if (!linkedId && profile.role === "client") return [];

  let query = supabase
    .from("client_notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (linkedId) query = query.eq("client_id", linkedId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    mapNotification(row as Record<string, unknown>),
  );
}

export async function createClientNotification(input: {
  clientId: string;
  kind: ClientNotificationKind;
  title: string;
  body?: string;
  href?: string;
}): Promise<ClientPortalNotification> {
  const profile = await requireProfile();
  if (profile.role === "client") {
    throw new Error("通知の作成は認定講師のみ可能です");
  }
  const clientId = input.clientId.trim();
  if (!clientId) throw new Error("クライアントが指定されていません");
  const title = input.title.trim();
  if (!title) throw new Error("通知タイトルを入力してください");

  const supabase = await requireSupabase();
  const { data, error } = await supabase
    .from("client_notifications")
    .insert({
      client_id: clientId,
      kind: input.kind,
      title,
      body: (input.body ?? "").trim(),
      href: (input.href ?? "").trim(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapNotification(data as Record<string, unknown>);
}

export async function markNotificationRead(
  id: string,
): Promise<ClientPortalNotification> {
  await requireProfile();
  const supabase = await requireSupabase();
  const { data, error } = await supabase
    .from("client_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapNotification(data as Record<string, unknown>);
}

export async function listMyGoals(
  clientId?: string,
): Promise<ClientGoalProgress[]> {
  const profile = await requireProfile();
  const supabase = await requireSupabase();

  let query = supabase
    .from("client_goal_progress")
    .select("*")
    .order("updated_at", { ascending: false });

  if (profile.role === "client") {
    const linkedId = await resolveLinkedClientId(supabase, profile.id, clientId);
    if (!linkedId) return [];
    query = query.eq("client_id", linkedId);
  } else if (clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapGoal(row as Record<string, unknown>));
}

export async function createGoal(
  input: CreateClientGoalInput,
): Promise<ClientGoalProgress> {
  const profile = await requireProfile();
  if (profile.role === "client") {
    throw new Error("目標の作成は認定講師のみ可能です");
  }
  const title = input.title.trim();
  if (!title) throw new Error("目標タイトルを入力してください");
  if (!input.clientId) throw new Error("クライアントが指定されていません");

  const supabase = await requireSupabase();
  const progress = Math.max(
    0,
    Math.min(100, Math.round(input.progressPercent ?? 0)),
  );

  const { data, error } = await supabase
    .from("client_goal_progress")
    .insert({
      client_id: input.clientId,
      instructor_id: profile.id,
      title,
      description: (input.description ?? "").trim(),
      category: input.category ?? "sleep",
      target_value: input.targetValue ?? null,
      current_value: input.currentValue ?? null,
      unit: input.unit ?? "",
      progress_percent: progress,
      status: progress >= 100 ? "achieved" : "active",
      starts_on: input.startsOn ?? new Date().toISOString().slice(0, 10),
      target_on: input.targetOn ?? null,
      achieved_at: progress >= 100 ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapGoal(data as Record<string, unknown>);
}

export async function updateGoalProgress(
  id: string,
  patch: {
    currentValue?: number | null;
    progressPercent?: number;
    status?: ClientGoalProgress["status"];
    title?: string;
    description?: string;
  },
): Promise<ClientGoalProgress> {
  await requireProfile();
  const supabase = await requireSupabase();
  const update: {
    current_value?: number | null;
    progress_percent?: number;
    status?: string;
    title?: string;
    description?: string;
    achieved_at?: string;
  } = {};
  if (patch.currentValue !== undefined) update.current_value = patch.currentValue;
  if (patch.progressPercent !== undefined) {
    update.progress_percent = Math.max(
      0,
      Math.min(100, Math.round(patch.progressPercent)),
    );
  }
  if (patch.status) update.status = patch.status;
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.description !== undefined) {
    update.description = patch.description.trim();
  }
  if (
    patch.status === "achieved" ||
    (typeof update.progress_percent === "number" &&
      update.progress_percent >= 100)
  ) {
    update.status = "achieved";
    update.achieved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("client_goal_progress")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapGoal(data as Record<string, unknown>);
}
