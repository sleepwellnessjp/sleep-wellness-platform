import {
  CREDIT_PACK_MAX_SETS,
  CREDIT_PACK_MIN_SETS,
  creditsForSets,
  isCreditRequestStatus,
  yenForSets,
} from "./credit-pack-constants";
import type {
  CreateCreditRequestInput,
  CreditRequestRecord,
  ReviewCreditRequestInput,
} from "./credit-request-types";
import {
  getCurrentProfile,
  grantCredits,
  requireAdminProfile,
} from "./platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function mapRow(
  row: Record<string, unknown>,
  applicant?: { displayName: string | null; email: string | null },
): CreditRequestRecord {
  const status = String(row.status);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sets: Number(row.sets),
    credits: Number(row.credits),
    amountYen: Number(row.amount_yen),
    status: isCreditRequestStatus(status) ? status : "pending",
    note: String(row.note ?? ""),
    adminMemo: String(row.admin_memo ?? ""),
    requestedAt: String(row.requested_at),
    approvedAt:
      typeof row.approved_at === "string" ? row.approved_at : null,
    approvedBy:
      typeof row.approved_by === "string" ? row.approved_by : null,
    applicantDisplayName: applicant?.displayName ?? null,
    applicantEmail: applicant?.email ?? null,
  };
}

function validateSets(sets: number): string | null {
  if (
    !Number.isFinite(sets) ||
    sets < CREDIT_PACK_MIN_SETS ||
    sets > CREDIT_PACK_MAX_SETS
  ) {
    return "セット数は1〜5の範囲で選択してください";
  }
  return null;
}

async function fetchApplicantMap(
  userIds: string[],
): Promise<Map<string, { displayName: string | null; email: string | null }>> {
  const map = new Map<
    string,
    { displayName: string | null; email: string | null }
  >();
  if (userIds.length === 0) return map;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return map;

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", userIds);

  for (const row of data ?? []) {
    map.set(String(row.id), {
      displayName:
        typeof row.display_name === "string" ? row.display_name : null,
      email: typeof row.email === "string" ? row.email : null,
    });
  }
  return map;
}

export async function listMyCreditRequests(): Promise<CreditRequestRecord[]> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("ログインが必要です");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }

  const { data, error } = await supabase
    .from("credit_requests")
    .select("*")
    .eq("user_id", profile.id)
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("[credit-request] list mine failed:", error.message);
    throw new Error("申請履歴の取得に失敗しました");
  }

  return (data ?? []).map((row) =>
    mapRow(row as Record<string, unknown>, {
      displayName: profile.displayName,
      email: profile.email,
    }),
  );
}

export async function createCreditRequest(
  input: CreateCreditRequestInput,
): Promise<CreditRequestRecord> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("ログインが必要です");
  }
  if (profile.role !== "instructor") {
    throw new Error("この機能は講師アカウント向けです");
  }

  const sets = Math.floor(Number(input.sets));
  const setsError = validateSets(sets);
  if (setsError) {
    throw new Error(setsError);
  }

  const note = (input.note ?? "").trim();
  if (note.length > 500) {
    throw new Error("備考は500文字以内で入力してください");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }

  const { data: pending } = await supabase
    .from("credit_requests")
    .select("id")
    .eq("user_id", profile.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (pending) {
    throw new Error("申請中のリクエストがあります。振込確認後にお待ちください。");
  }

  const { data, error } = await supabase
    .from("credit_requests")
    .insert({
      user_id: profile.id,
      sets,
      credits: creditsForSets(sets),
      amount_yen: yenForSets(sets),
      note,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[credit-request] create failed:", error?.message);
    if (error?.code === "23505") {
      throw new Error("申請中のリクエストがあります。振込確認後にお待ちください。");
    }
    throw new Error("申請の送信に失敗しました");
  }

  return mapRow(data as Record<string, unknown>, {
    displayName: profile.displayName,
    email: profile.email,
  });
}

export async function listAllCreditRequests(): Promise<CreditRequestRecord[]> {
  await requireAdminProfile();

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }

  const { data, error } = await supabase
    .from("credit_requests")
    .select("*")
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("[credit-request] list all failed:", error.message);
    throw new Error("申請一覧の取得に失敗しました");
  }

  const rows = data ?? [];
  const applicantMap = await fetchApplicantMap(
    [...new Set(rows.map((row) => String(row.user_id)))],
  );

  return rows.map((row) => {
    const userId = String((row as Record<string, unknown>).user_id);
    return mapRow(row as Record<string, unknown>, applicantMap.get(userId));
  });
}

export async function reviewCreditRequest(
  input: ReviewCreditRequestInput,
): Promise<CreditRequestRecord> {
  const actor = await requireAdminProfile();

  if (!input.id) {
    throw new Error("対象が指定されていません");
  }
  if (input.action !== "approve" && input.action !== "reject") {
    throw new Error("操作が不正です");
  }
  if (input.adminMemo !== undefined && input.adminMemo.length > 500) {
    throw new Error("管理者メモは500文字以内で入力してください");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase が設定されていません");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("credit_requests")
    .select("*")
    .eq("id", input.id)
    .single();

  if (fetchError || !existing) {
    throw new Error("申請が見つかりません");
  }

  const current = mapRow(existing as Record<string, unknown>);
  if (current.status === "approved") {
    return current;
  }
  if (current.status !== "pending") {
    throw new Error("この申請はすでに処理済みです");
  }

  if (input.action === "approve") {
    await grantCredits({
      targetUserId: current.userId,
      amount: current.credits,
      actorId: actor.id,
      description: `追加パック申請承認（${current.sets}セット / ¥${current.amountYen.toLocaleString("ja-JP")}）`,
    });
  }

  const now = new Date().toISOString();
  const patch: {
    status: "approved" | "rejected";
    approved_at: string;
    approved_by: string;
    admin_memo?: string;
  } = {
    status: input.action === "approve" ? "approved" : "rejected",
    approved_at: now,
    approved_by: actor.id,
  };
  if (input.adminMemo !== undefined) {
    patch.admin_memo = input.adminMemo.trim();
  }

  const { data: updated, error: updateError } = await supabase
    .from("credit_requests")
    .update(patch)
    .eq("id", input.id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[credit-request] review update failed:", updateError?.message);
    throw new Error("申請の更新に失敗しました");
  }

  const applicantMap = await fetchApplicantMap([current.userId]);
  return mapRow(updated as Record<string, unknown>, applicantMap.get(current.userId));
}

export function toJapaneseCreditRequestError(message: string): {
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
