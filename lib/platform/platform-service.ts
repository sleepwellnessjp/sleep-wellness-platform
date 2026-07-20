import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";
import {
  ANALYSIS_CREDIT_COST,
  currentYearMonth,
  MONTHLY_CREDIT_ALLOWANCE,
} from "./constants";
import type {
  AdminLogRecord,
  InstructorSummary,
  MembershipRecord,
  MembershipStatus,
  PlatformAccessStatus,
  PlatformMeResponse,
  PlatformProfile,
  UserRole,
} from "./types";

function asRole(value: unknown): UserRole {
  if (
    value === "super_admin" ||
    value === "admin" ||
    value === "instructor" ||
    value === "client"
  ) {
    return value;
  }
  return "instructor";
}

function mapProfile(row: Record<string, unknown>): PlatformProfile {
  return {
    id: String(row.id),
    email: typeof row.email === "string" ? row.email : null,
    displayName:
      typeof row.display_name === "string" ? row.display_name : null,
    role: asRole(row.role),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapMembership(row: Record<string, unknown>): MembershipRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    certificationType: row.certification_type as MembershipRecord["certificationType"],
    certifiedAt:
      typeof row.certified_at === "string" ? row.certified_at.slice(0, 10) : null,
    expiresAt:
      typeof row.expires_at === "string" ? row.expires_at.slice(0, 10) : null,
    status: row.status as MembershipStatus,
    continuingEducation:
      (row.continuing_education as Record<string, unknown>) ?? {},
    adminMemo: typeof row.admin_memo === "string" ? row.admin_memo : "",
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function remainingCredits(granted: number, used: number): number {
  return Math.max(0, granted - used);
}

type AuthenticatedPlatformContext = {
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;
  userId: string;
  email: string | null;
  profile: PlatformProfile;
};

/**
 * membership 行が無い Instructor 向けに Melatonin Yoga™ Instructor を補完する。
 * DB 側 RPC（security definer）を呼び、monthly_credit / role は変更しない。
 */
async function ensureInstructorMembershipRow(
  supabase: AuthenticatedPlatformContext["supabase"],
  profile: PlatformProfile,
): Promise<MembershipRecord | null> {
  if (profile.role !== "instructor") return null;

  const { data: existing, error: selectError } = await supabase
    .from("membership")
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error("[platform] membership select failed", {
      userId: profile.id,
      message: selectError.message,
      code: selectError.code,
    });
    return null;
  }

  if (existing) {
    const mapped = mapMembership(existing as Record<string, unknown>);
    if (mapped.status === "active") return mapped;
  }

  const { data: ensured, error: rpcError } = await supabase.rpc(
    "ensure_instructor_membership",
    { p_certification_type: "melatonin_yoga_instructor" },
  );

  if (rpcError) {
    console.error("[platform] ensure_instructor_membership failed", {
      userId: profile.id,
      message: rpcError.message,
      code: rpcError.code,
      details: rpcError.details,
      hint: rpcError.hint,
    });
    return existing
      ? mapMembership(existing as Record<string, unknown>)
      : null;
  }

  if (ensured && typeof ensured === "object") {
    return mapMembership(ensured as Record<string, unknown>);
  }

  const { data: refreshed } = await supabase
    .from("membership")
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return refreshed
    ? mapMembership(refreshed as Record<string, unknown>)
    : null;
}

/**
 * 同一 Supabase クライアント上で getUser → profiles を行う。
 * クライアントを分けると、トークン refresh 後も 2 つ目が古い JWT のまま
 * RLS（auth.uid()）で profiles が空になることがある。
 */
async function resolveAuthenticatedPlatformContext(): Promise<AuthenticatedPlatformContext | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.error("[platform] resolveAuth: Supabase client is null");
    return null;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[platform] resolveAuth: auth.getUser failed", authError);
    return null;
  }

  if (!user) {
    console.error("[platform] resolveAuth: no authenticated user");
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[platform] resolveAuth: profiles select failed", {
      userId: user.id,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }

  if (data) {
    return {
      supabase,
      userId: user.id,
      email: user.email ?? null,
      profile: mapProfile(data as Record<string, unknown>),
    };
  }

  // トリガー前に作成されたユーザー等: profiles が無い場合は本人行を補完
  console.warn("[platform] resolveAuth: profile missing, bootstrapping", {
    userId: user.id,
    email: user.email,
  });

  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : user.email?.split("@")[0] ?? null;

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
      role: "instructor",
    })
    .select("id, email, display_name, role, created_at")
    .maybeSingle();

  if (insertError) {
    console.error("[platform] resolveAuth: profile bootstrap failed", {
      userId: user.id,
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
    });

    const { data: retry, error: retryError } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (retryError) {
      console.error("[platform] resolveAuth: profile retry failed", retryError);
      return null;
    }
    if (!retry) return null;

    return {
      supabase,
      userId: user.id,
      email: user.email ?? null,
      profile: mapProfile(retry as Record<string, unknown>),
    };
  }

  if (!created) {
    console.error("[platform] resolveAuth: bootstrap returned no row", {
      userId: user.id,
    });
    return null;
  }

  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    profile: mapProfile(created as Record<string, unknown>),
  };
}

export async function getCurrentUserId(): Promise<string | null> {
  const ctx = await resolveAuthenticatedPlatformContext();
  return ctx?.userId ?? null;
}

export async function getCurrentProfile(): Promise<PlatformProfile | null> {
  const ctx = await resolveAuthenticatedPlatformContext();
  return ctx?.profile ?? null;
}

export async function ensureMonthlyCredit(
  userId: string,
  client?: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
) {
  const supabase = client ?? (await createServerSupabaseClient());
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("ensure_monthly_credit", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[platform] ensureMonthlyCredit: RPC failed", {
      userId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  if (!error && data) return data;

  // RPC 未適用環境向けフォールバック
  const yearMonth = currentYearMonth();
  const { data: existing } = await supabase
    .from("monthly_credit")
    .select("*")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from("monthly_credit")
    .insert({
      user_id: userId,
      year_month: yearMonth,
      granted_amount: MONTHLY_CREDIT_ALLOWANCE,
      used_amount: 0,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("[platform] ensureMonthlyCredit: insert fallback failed", {
      userId,
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
    });
    const { data: retry } = await supabase
      .from("monthly_credit")
      .select("*")
      .eq("user_id", userId)
      .eq("year_month", yearMonth)
      .maybeSingle();
    return retry;
  }

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    type: "monthly_grant",
    amount: MONTHLY_CREDIT_ALLOWANCE,
    balance_after: MONTHLY_CREDIT_ALLOWANCE,
    reference_id: created.id,
    description: `${yearMonth} 月次付与`,
    created_by: null,
  });

  return created;
}

export async function buildAccessStatus(
  profile: PlatformProfile,
): Promise<PlatformAccessStatus> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      allowed: true,
      reason: "demo",
      message: "デモモード",
      remainingCredits: MONTHLY_CREDIT_ALLOWANCE,
      membershipStatus: "active",
      role: profile.role,
    };
  }

  if (profile.role === "super_admin" || profile.role === "admin") {
    return {
      allowed: true,
      reason: "ok",
      message: "管理者",
      remainingCredits: 999,
      membershipStatus: null,
      role: profile.role,
    };
  }

  const membership = await ensureInstructorMembershipRow(supabase, profile);

  const monthly = await ensureMonthlyCredit(profile.id);
  const granted = Number(monthly?.granted_amount ?? 0);
  const used = Number(monthly?.used_amount ?? 0);
  const remaining = remainingCredits(granted, used);

  if (!membership || membership.status !== "active") {
    return {
      allowed: false,
      reason: "membership",
      message:
        "認定資格の更新が必要です。Sleep Wellness Institute Japan までお問い合わせください。",
      remainingCredits: remaining,
      membershipStatus: membership?.status ?? null,
      role: profile.role,
    };
  }

  if (remaining < ANALYSIS_CREDIT_COST) {
    return {
      allowed: false,
      reason: "credits",
      message: "クレジットが不足しています。管理者にお問い合わせください。",
      remainingCredits: remaining,
      membershipStatus: membership.status,
      role: profile.role,
    };
  }

  return {
    allowed: true,
    reason: "ok",
    message: "分析可能",
    remainingCredits: remaining,
    membershipStatus: membership.status,
    role: profile.role,
  };
}

export async function getPlatformMe(): Promise<PlatformMeResponse | null> {
  const ctx = await resolveAuthenticatedPlatformContext();
  if (!ctx) {
    console.error("[platform] getPlatformMe: auth/profile unavailable");
    return null;
  }

  const { supabase, profile } = ctx;
  const yearMonth = currentYearMonth();
  const monthly = await ensureMonthlyCredit(profile.id, supabase);
  if (!monthly) {
    console.warn("[platform] getPlatformMe: monthly_credit unavailable", {
      userId: profile.id,
      yearMonth,
    });
  }

  const [membership, historyResult, notificationsResult, countResult] =
    await Promise.all([
      ensureInstructorMembershipRow(supabase, profile),
      supabase
        .from("analysis_history")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("analysis_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("created_at", `${yearMonth}-01T00:00:00.000Z`),
    ]);

  if (historyResult.error) {
    console.error("[platform] getPlatformMe: analysis_history select failed", {
      userId: profile.id,
      message: historyResult.error.message,
      code: historyResult.error.code,
      details: historyResult.error.details,
      hint: historyResult.error.hint,
    });
  }
  if (notificationsResult.error) {
    console.error("[platform] getPlatformMe: notifications select failed", {
      userId: profile.id,
      message: notificationsResult.error.message,
      code: notificationsResult.error.code,
      details: notificationsResult.error.details,
      hint: notificationsResult.error.hint,
    });
  }
  if (countResult.error) {
    console.error("[platform] getPlatformMe: analysis_history count failed", {
      userId: profile.id,
      message: countResult.error.message,
      code: countResult.error.code,
    });
  }

  const historyRows = historyResult.data;
  const notifications = notificationsResult.data;
  const analysesThisMonth = countResult.count;

  const granted = Number(monthly?.granted_amount ?? 0);
  const used = Number(monthly?.used_amount ?? 0);
  const remaining = remainingCredits(granted, used);

  const access = await buildAccessStatus(profile);

  return {
    profile,
    membership,
    monthlyCredit: monthly
      ? {
          id: String(monthly.id),
          userId: String(monthly.user_id),
          yearMonth: String(monthly.year_month),
          grantedAmount: Number(monthly.granted_amount),
          usedAmount: Number(monthly.used_amount),
          createdAt: String(monthly.created_at),
        }
      : null,
    remainingCredits: remaining,
    analysesThisMonth: analysesThisMonth ?? 0,
    recentAnalyses: (historyRows ?? []).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      clientId: row.client_id ? String(row.client_id) : null,
      analysisId: row.analysis_id ? String(row.analysis_id) : null,
      clientName: String(row.client_name ?? ""),
      measurementDate: row.measurement_date
        ? String(row.measurement_date).slice(0, 10)
        : null,
      sleepScore:
        typeof row.sleep_score === "number" ? row.sleep_score : null,
      creditsConsumed: Number(row.credits_consumed ?? 1),
      status: String(row.status ?? "completed"),
      createdAt: String(row.created_at),
    })),
    notifications: (notifications ?? []).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      title: String(row.title ?? ""),
      body: String(row.body ?? ""),
      type: String(row.type ?? "info"),
      readAt: row.read_at ? String(row.read_at) : null,
      createdAt: String(row.created_at),
    })),
    access,
  };
}

export async function getCreditBalance(userId?: string): Promise<{
  ok: boolean;
  remaining: number;
  granted: number;
  used: number;
  yearMonth: string | null;
  message?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      remaining: 0,
      granted: 0,
      used: 0,
      yearMonth: null,
      message: "データベースに接続できません。",
    };
  }

  const { data, error } = await supabase.rpc("get_credit_balance", {
    p_user_id: userId ?? null,
  });

  if (!error && data && typeof data === "object") {
    const row = data as {
      ok?: boolean;
      remaining?: number;
      granted?: number;
      used?: number;
      year_month?: string;
      message?: string;
    };
    return {
      ok: Boolean(row.ok),
      remaining: Number(row.remaining ?? 0),
      granted: Number(row.granted ?? 0),
      used: Number(row.used ?? 0),
      yearMonth: typeof row.year_month === "string" ? row.year_month : null,
      message: typeof row.message === "string" ? row.message : undefined,
    };
  }

  const targetId = userId ?? (await getCurrentUserId());
  if (!targetId) {
    return {
      ok: false,
      remaining: 0,
      granted: 0,
      used: 0,
      yearMonth: null,
      message: "ログインが必要です。",
    };
  }

  const monthly = await ensureMonthlyCredit(targetId);
  const granted = Number(monthly?.granted_amount ?? 0);
  const used = Number(monthly?.used_amount ?? 0);
  return {
    ok: true,
    remaining: remainingCredits(granted, used),
    granted,
    used,
    yearMonth: monthly ? String(monthly.year_month) : currentYearMonth(),
  };
}

export async function consumeAnalysisCredit(input: {
  clientName: string;
  measurementDate?: string;
  sleepScore?: number | null;
  clientId?: string;
  analysisId?: string;
}): Promise<{ ok: boolean; message: string }> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { ok: false, message: "ログインが必要です。" };
  }

  if (profile.role === "super_admin" || profile.role === "admin") {
    return { ok: true, message: "管理者は消費対象外" };
  }

  const access = await buildAccessStatus(profile);
  if (!access.allowed) {
    return { ok: false, message: access.message };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, message: "データベースに接続できません。" };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "consume_analysis_credit",
    {
      p_client_name: input.clientName,
      p_measurement_date: input.measurementDate ?? null,
      p_sleep_score: input.sleepScore ?? null,
      p_client_id: input.clientId ?? null,
      p_analysis_id: input.analysisId ?? null,
    },
  );

  if (!rpcError && rpcData && typeof rpcData === "object") {
    const result = rpcData as { ok?: boolean; message?: string };
    return {
      ok: Boolean(result.ok),
      message:
        typeof result.message === "string"
          ? result.message
          : result.ok
            ? "クレジットを消費しました"
            : "クレジット消費に失敗しました。",
    };
  }

  // RPC 未適用環境向けフォールバック
  if (input.analysisId) {
    const { data: existingHistory } = await supabase
      .from("analysis_history")
      .select("id")
      .eq("user_id", profile.id)
      .eq("analysis_id", input.analysisId)
      .maybeSingle();

    if (existingHistory) {
      return {
        ok: true,
        message: "already_consumed",
      };
    }
  }

  const monthly = await ensureMonthlyCredit(profile.id);
  if (!monthly) {
    return { ok: false, message: "クレジット情報を取得できません。" };
  }

  const granted = Number(monthly.granted_amount);
  const used = Number(monthly.used_amount);
  if (remainingCredits(granted, used) < ANALYSIS_CREDIT_COST) {
    return { ok: false, message: "クレジットが不足しています。" };
  }

  const newUsed = used + ANALYSIS_CREDIT_COST;
  const balanceAfter = remainingCredits(granted, newUsed);

  const { data: history, error: historyError } = await supabase
    .from("analysis_history")
    .insert({
      user_id: profile.id,
      client_id: input.clientId ?? null,
      analysis_id: input.analysisId ?? null,
      client_name: input.clientName,
      measurement_date: input.measurementDate ?? null,
      sleep_score: input.sleepScore ?? null,
      credits_consumed: ANALYSIS_CREDIT_COST,
      status: "completed",
    })
    .select("id")
    .single();

  if (historyError) {
    return { ok: false, message: "分析履歴の保存に失敗しました。" };
  }

  const { error: updateError } = await supabase
    .from("monthly_credit")
    .update({ used_amount: newUsed })
    .eq("id", monthly.id);

  if (updateError) {
    return { ok: false, message: "クレジット更新に失敗しました。" };
  }

  await supabase.from("credit_transactions").insert({
    user_id: profile.id,
    type: "analysis_use",
    amount: -ANALYSIS_CREDIT_COST,
    balance_after: balanceAfter,
    reference_id: history.id,
    description: `睡眠分析: ${input.clientName}`,
    created_by: profile.id,
  });

  return { ok: true, message: "クレジットを消費しました" };
}

export async function listInstructorSummaries(): Promise<InstructorSummary[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, created_at")
    .eq("role", "instructor")
    .order("display_name", { ascending: true });

  const yearMonth = currentYearMonth();
  const summaries: InstructorSummary[] = [];

  for (const row of profiles ?? []) {
    const profile = mapProfile(row as Record<string, unknown>);
    const monthly = await ensureMonthlyCredit(profile.id);
    const { data: membershipRow } = await supabase
      .from("membership")
      .select("*")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count } = await supabase
      .from("analysis_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("created_at", `${yearMonth}-01T00:00:00.000Z`);

    summaries.push({
      profile,
      membership: membershipRow
        ? mapMembership(membershipRow as Record<string, unknown>)
        : null,
      monthlyCredit: monthly
        ? {
            id: String(monthly.id),
            userId: String(monthly.user_id),
            yearMonth: String(monthly.year_month),
            grantedAmount: Number(monthly.granted_amount),
            usedAmount: Number(monthly.used_amount),
            createdAt: String(monthly.created_at),
          }
        : null,
      remainingCredits: remainingCredits(
        Number(monthly?.granted_amount ?? 0),
        Number(monthly?.used_amount ?? 0),
      ),
      analysesThisMonth: count ?? 0,
    });
  }

  return summaries;
}

export async function grantCredits(input: {
  targetUserId: string;
  amount: number;
  actorId: string;
  description?: string;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");

  const monthly = await ensureMonthlyCredit(input.targetUserId);
  if (!monthly) throw new Error("Monthly credit not found");

  const granted = Number(monthly.granted_amount) + input.amount;
  const used = Number(monthly.used_amount);
  const balanceAfter = remainingCredits(granted, used);

  await supabase
    .from("monthly_credit")
    .update({ granted_amount: granted })
    .eq("id", monthly.id);

  await supabase.from("credit_transactions").insert({
    user_id: input.targetUserId,
    type: "admin_grant",
    amount: input.amount,
    balance_after: balanceAfter,
    description: input.description ?? `管理者付与 +${input.amount}`,
    created_by: input.actorId,
  });

  await supabase.from("admin_logs").insert({
    actor_id: input.actorId,
    target_user_id: input.targetUserId,
    action: "credit_grant",
    payload: { amount: input.amount },
  });
}

export async function updateMembership(input: {
  targetUserId: string;
  status?: MembershipStatus;
  expiresAt?: string | null;
  adminMemo?: string;
  actorId: string;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase not configured");

  const { data: existing } = await supabase
    .from("membership")
    .select("id")
    .eq("user_id", input.targetUserId)
    .eq("certification_type", "melatonin_yoga_instructor")
    .maybeSingle();

  const patch: {
    updated_at: string;
    status?: MembershipStatus;
    expires_at?: string | null;
    admin_memo?: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (input.status) patch.status = input.status;
  if (input.expiresAt !== undefined) patch.expires_at = input.expiresAt;
  if (input.adminMemo !== undefined) patch.admin_memo = input.adminMemo;

  if (existing) {
    await supabase.from("membership").update(patch).eq("id", existing.id);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    await supabase.from("membership").insert({
      user_id: input.targetUserId,
      certification_type: "melatonin_yoga_instructor",
      certified_at: today,
      status: input.status ?? "active",
      expires_at:
        input.expiresAt ?? expires.toISOString().slice(0, 10),
      admin_memo: input.adminMemo ?? "",
      continuing_education: {},
    });
  }

  await supabase.from("admin_logs").insert({
    actor_id: input.actorId,
    target_user_id: input.targetUserId,
    action: "membership_update",
    payload: patch as Json,
  });
}

export async function listAdminLogs(): Promise<AdminLogRecord[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("admin_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    actorId: String(row.actor_id),
    targetUserId: row.target_user_id ? String(row.target_user_id) : null,
    action: String(row.action),
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  }));
}

export async function requireAdminProfile(): Promise<PlatformProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("Unauthorized");
  }
  if (profile.role !== "super_admin" && profile.role !== "admin") {
    throw new Error("Forbidden");
  }
  return profile;
}

export async function requireSuperAdminProfile(): Promise<PlatformProfile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  return profile;
}
