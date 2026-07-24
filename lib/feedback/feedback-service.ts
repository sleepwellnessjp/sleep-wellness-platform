import { APP_VERSION } from "@/lib/app-version";
import {
  getCurrentProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isFeedbackCategory,
  isFeedbackPriority,
  isFeedbackSeverity,
  isFeedbackStatus,
  isFeedbackTargetScreen,
  isUsabilityRating,
} from "./constants";
import type {
  CreateFeedbackInput,
  FeedbackDeviceType,
  FeedbackPriority,
  FeedbackRecord,
  FeedbackStatus,
  UpdateFeedbackAdminInput,
} from "./types";

function asDeviceType(value: unknown): FeedbackDeviceType {
  if (value === "pc" || value === "mobile" || value === "tablet") {
    return value;
  }
  return "";
}

function asPriority(value: unknown): FeedbackPriority {
  const raw = String(value ?? "p2");
  return isFeedbackPriority(raw) ? raw : "p2";
}

function asUsabilityRating(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return isUsabilityRating(num) ? num : null;
}

function mapRow(row: Record<string, unknown>): FeedbackRecord {
  const category = String(row.category);
  const targetScreen = String(row.target_screen);
  const severity = String(row.severity);
  const status = String(row.status);

  return {
    id: String(row.id),
    userId: String(row.user_id),
    userEmail: row.user_email ? String(row.user_email) : null,
    userDisplayName: row.user_display_name
      ? String(row.user_display_name)
      : null,
    category: isFeedbackCategory(category) ? category : "other",
    targetScreen: isFeedbackTargetScreen(targetScreen)
      ? targetScreen
      : "other",
    severity: isFeedbackSeverity(severity) ? severity : "medium",
    content: String(row.content ?? ""),
    reproductionSteps: String(row.reproduction_steps ?? ""),
    device: String(row.device ?? ""),
    browser: String(row.browser ?? ""),
    currentUrl: String(row.current_url ?? ""),
    screenName: String(row.screen_name ?? ""),
    deviceType: asDeviceType(row.device_type),
    browserInfo: String(row.browser_info ?? ""),
    appVersion: String(row.app_version ?? ""),
    usabilityRating: asUsabilityRating(row.usability_rating),
    priority: asPriority(row.priority),
    status: isFeedbackStatus(status) ? status : "unconfirmed",
    adminMemo: String(row.admin_memo ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function validateCreateInput(input: CreateFeedbackInput): string | null {
  if (!isFeedbackCategory(input.category)) {
    return "カテゴリーが不正です";
  }
  if (!isFeedbackTargetScreen(input.targetScreen)) {
    return "対象画面が不正です";
  }
  if (!isFeedbackSeverity(input.severity)) {
    return "重要度が不正です";
  }
  if (!input.content || !input.content.trim()) {
    return "内容を入力してください";
  }
  if (input.content.trim().length > 5000) {
    return "内容は5000文字以内で入力してください";
  }
  if ((input.reproductionSteps ?? "").length > 5000) {
    return "再現手順は5000文字以内で入力してください";
  }
  if (
    input.usabilityRating != null &&
    !isUsabilityRating(input.usabilityRating)
  ) {
    return "使いやすさ評価は1〜5で選択してください";
  }
  return null;
}

export async function createFeedback(
  input: CreateFeedbackInput,
): Promise<FeedbackRecord> {
  const validationError = validateCreateInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("ログインが必要です");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }

  const { data, error } = await supabase
    .from("beta_feedback")
    .insert({
      user_id: profile.id,
      user_email: profile.email,
      user_display_name: profile.displayName,
      category: input.category,
      target_screen: input.targetScreen,
      severity: input.severity,
      content: input.content.trim(),
      reproduction_steps: (input.reproductionSteps ?? "").trim(),
      device: (input.device ?? "").trim().slice(0, 120),
      browser: (input.browser ?? "").trim().slice(0, 120),
      current_url: (input.currentUrl ?? "").trim().slice(0, 1000),
      screen_name: (input.screenName ?? "").trim().slice(0, 200),
      device_type: input.deviceType ?? "",
      browser_info: (input.browserInfo ?? "").trim().slice(0, 500),
      app_version: (input.appVersion ?? APP_VERSION).trim().slice(0, 40),
      usability_rating: input.usabilityRating ?? null,
      priority: "p2",
      status: "unconfirmed",
      admin_memo: "",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[feedback] create failed:", error?.message);
    throw new Error("フィードバックの送信に失敗しました");
  }

  return mapRow(data as Record<string, unknown>);
}

export async function listMyFeedback(): Promise<FeedbackRecord[]> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("ログインが必要です");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }

  const { data, error } = await supabase
    .from("beta_feedback")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[feedback] list mine failed:", error.message);
    throw new Error("フィードバック一覧の取得に失敗しました");
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function listAllFeedback(filters?: {
  category?: string;
  severity?: string;
  status?: string;
}): Promise<FeedbackRecord[]> {
  await requireAdminProfile();

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }

  let query = supabase
    .from("beta_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters?.severity && filters.severity !== "all") {
    query = query.eq("severity", filters.severity);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[feedback] list all failed:", error.message);
    throw new Error("フィードバック一覧の取得に失敗しました");
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function updateFeedbackAdmin(
  input: UpdateFeedbackAdminInput,
): Promise<FeedbackRecord> {
  await requireAdminProfile();

  if (!input.id) {
    throw new Error("対象が指定されていません");
  }
  if (input.status !== undefined && !isFeedbackStatus(input.status)) {
    throw new Error("対応状況が不正です");
  }
  if (input.priority !== undefined && !isFeedbackPriority(input.priority)) {
    throw new Error("優先順位が不正です");
  }
  if (input.adminMemo !== undefined && input.adminMemo.length > 5000) {
    throw new Error("管理者メモは5000文字以内で入力してください");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }

  const patch: {
    status?: FeedbackStatus;
    admin_memo?: string;
    priority?: FeedbackPriority;
  } = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.adminMemo !== undefined) patch.admin_memo = input.adminMemo;
  if (input.priority !== undefined) patch.priority = input.priority;

  if (Object.keys(patch).length === 0) {
    throw new Error("更新内容がありません");
  }

  const { data, error } = await supabase
    .from("beta_feedback")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[feedback] update failed:", error?.message);
    throw new Error("フィードバックの更新に失敗しました");
  }

  return mapRow(data as Record<string, unknown>);
}

export function toJapaneseAuthError(message: string): {
  error: string;
  status: number;
} {
  if (message === "Unauthorized" || message === "ログインが必要です") {
    return { error: "ログインが必要です", status: 401 };
  }
  if (message === "Forbidden") {
    return { error: "この操作を行う権限がありません", status: 403 };
  }
  return { error: message, status: 400 };
}
