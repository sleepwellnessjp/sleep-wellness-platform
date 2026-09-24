import {
  isNavigatorApplicationStatus,
  isNavigatorCohort,
  isNavigatorInviteStatus,
  type NavigatorApplicationInput,
  type NavigatorApplicationRecord,
  type NavigatorApplicationStatus,
  type NavigatorInviteAttempt,
} from "@/lib/navigator/application-types";
import {
  sendNavigatorApplicationReceivedEmails,
  sendNavigatorRegistrationCompleteEmail,
} from "@/lib/navigator/application-emails";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const APPLICATION_COLUMNS =
  "id, name_kanji, name_kana, email, phone, cohort, completion_date, region, teaching_status, motivation, activity_plan, payer_name_kana, fee_agreed, note, status, submitted_at, payment_confirmed_at, approved_at, review_memo, invite_status, invite_error, invited_at, auth_user_id";

const INVITE_STALE_MS = 10 * 60 * 1000;
const PRODUCTION_INVITE_ORIGIN = "https://www.swij.jp";

type AppSupabase = SupabaseClient<Database>;

function mapRow(row: Record<string, unknown>): NavigatorApplicationRecord | null {
  const cohort = String(row.cohort ?? "");
  const status = String(row.status ?? "");
  if (!isNavigatorCohort(cohort) || !isNavigatorApplicationStatus(status)) {
    return null;
  }
  const inviteStatusRaw =
    typeof row.invite_status === "string" ? row.invite_status : "";
  return {
    id: String(row.id),
    nameKanji: String(row.name_kanji ?? ""),
    nameKana: String(row.name_kana ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    cohort,
    completionDate: String(row.completion_date ?? ""),
    region: String(row.region ?? ""),
    teachingStatus: String(row.teaching_status ?? ""),
    motivation: String(row.motivation ?? ""),
    activityPlan: String(row.activity_plan ?? ""),
    payerNameKana: String(row.payer_name_kana ?? ""),
    feeAgreed: row.fee_agreed === true,
    note: String(row.note ?? ""),
    status,
    submittedAt: String(row.submitted_at ?? ""),
    paymentConfirmedAt:
      typeof row.payment_confirmed_at === "string"
        ? row.payment_confirmed_at
        : null,
    approvedAt: typeof row.approved_at === "string" ? row.approved_at : null,
    reviewMemo: String(row.review_memo ?? ""),
    inviteStatus: isNavigatorInviteStatus(inviteStatusRaw) ? inviteStatusRaw : null,
    inviteError: String(row.invite_error ?? ""),
    invitedAt: typeof row.invited_at === "string" ? row.invited_at : null,
    authUserId: typeof row.auth_user_id === "string" ? row.auth_user_id : null,
  };
}

function clipInviteError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "招待メールを送れませんでした";
  const clipped = raw.replace(/\s+/g, " ").trim().slice(0, 300);
  return clipped || "招待メールを送れませんでした";
}

function navigatorInviteRedirectTo(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const origin = /^https?:\/\//i.test(fromEnv) ? fromEnv : PRODUCTION_INVITE_ORIGIN;
  return `${origin}/auth/callback?flow=invite`;
}

function isExistingAuthUserError(error: { code?: string; message?: string }): boolean {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "email_exists" ||
    code === "user_already_exists" ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
}

function staleInviteCutoff(): string {
  return new Date(Date.now() - INVITE_STALE_MS).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function mapNavigatorApplicationWriteError(error: {
  code?: string;
  message?: string;
}): { error: string; status: number } {
  const message = error.message ?? "";
  if (error.code === "23505" || /duplicate key/i.test(message)) {
    return {
      error: "このメールアドレスでは、すでに申請を受け付けています。",
      status: 409,
    };
  }
  if (message.includes("navigator_fee_required")) {
    return {
      error: "年額12,000円の登録料への同意が必要です",
      status: 400,
    };
  }
  if (message.includes("navigator_rate_limited")) {
    return {
      error:
        "短時間に連続して送信されています。しばらくしてから再度お試しください。",
      status: 429,
    };
  }
  return {
    error: "申請を受け付けられませんでした。入力内容をご確認ください。",
    status: 400,
  };
}

export async function createNavigatorApplication(
  input: NavigatorApplicationInput,
  submitterIp: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("申請の保存先が設定されていません");
  }

  const { error } = await supabase.from("navigator_applications").insert({
    name_kanji: input.nameKanji,
    name_kana: input.nameKana,
    email: input.email,
    phone: input.phone,
    cohort: input.cohort,
    completion_date: input.completionDate,
    region: input.region,
    teaching_status: input.teachingStatus,
    motivation: input.motivation,
    activity_plan: input.activityPlan,
    payer_name_kana: input.payerNameKana,
    fee_agreed: true,
    note: input.note,
    status: "submitted",
    submitter_ip: submitterIp,
  });

  if (error) {
    const mapped = mapNavigatorApplicationWriteError(error);
    const wrapped = new Error(mapped.error);
    (wrapped as Error & { statusCode?: number }).statusCode = mapped.status;
    throw wrapped;
  }

  await sendNavigatorApplicationReceivedEmails(input);
}

export async function listNavigatorApplications(): Promise<
  NavigatorApplicationRecord[]
> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("申請の保存先が設定されていません");
  }

  const { data, error } = await supabase
    .from("navigator_applications")
    .select(APPLICATION_COLUMNS)
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error("申請一覧を取得できませんでした");
  }

  return (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter((row): row is NavigatorApplicationRecord => row !== null);
}

async function reloadApplication(
  supabase: AppSupabase,
  id: string,
): Promise<NavigatorApplicationRecord | null> {
  const { data, error } = await supabase
    .from("navigator_applications")
    .select(APPLICATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

async function recordInviteOutcome(
  supabase: AppSupabase,
  id: string,
  outcome: {
    inviteStatus: "sent" | "existing_account" | "failed";
    inviteError: string;
    invitedAt: string | null;
    authUserId: string | null;
  },
): Promise<NavigatorApplicationRecord | null> {
  const { data, error } = await supabase
    .from("navigator_applications")
    .update({
      invite_status: outcome.inviteStatus,
      invite_error: outcome.inviteError,
      invited_at: outcome.invitedAt,
      auth_user_id: outcome.authUserId,
    })
    .eq("id", id)
    .select(APPLICATION_COLUMNS)
    .maybeSingle();
  if (error || !data) {
    console.error("[navigator-invite] could not record invite result", {
      id,
      code: error?.code ?? null,
    });
    return null;
  }
  return mapRow(data as Record<string, unknown>);
}

async function recordInviteFailure(
  supabase: AppSupabase,
  id: string,
  error: unknown,
): Promise<NavigatorApplicationRecord | null> {
  const first = await recordInviteOutcome(supabase, id, {
    inviteStatus: "failed",
    inviteError: clipInviteError(error),
    invitedAt: null,
    authUserId: null,
  });
  if (first) return first;
  return recordInviteOutcome(supabase, id, {
    inviteStatus: "failed",
    inviteError: clipInviteError(error),
    invitedAt: null,
    authUserId: null,
  });
}

async function findProfileIdByEmail(
  supabase: AppSupabase,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email.replace(/[%_\\]/g, "\\$&"))
    .limit(1)
    .maybeSingle();
  if (error || !data || typeof data.id !== "string") return null;
  return data.id;
}

async function claimInviteSend(
  supabase: AppSupabase,
  id: string,
): Promise<boolean> {
  const cutoff = staleInviteCutoff();
  const { data, error } = await supabase
    .from("navigator_applications")
    .update({
      invite_status: "sending",
      invite_error: "",
    })
    .eq("id", id)
    .eq("status", "approved")
    .or(
      `invite_status.is.null,invite_status.eq.failed,and(invite_status.eq.sending,updated_at.lt.${cutoff})`,
    )
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error("招待の送信状態を更新できませんでした");
  }
  return Boolean(data);
}

async function deliverNavigatorInvite(
  supabase: AppSupabase,
  application: NavigatorApplicationRecord,
): Promise<NavigatorInviteAttempt> {
  const claimed = await claimInviteSend(supabase, application.id);
  if (!claimed) return "skipped";

  let sentUserId: string | null | undefined;
  try {
    const admin = createServiceRoleSupabaseClient();
    if (!admin) {
      const saved = await recordInviteFailure(
        supabase,
        application.id,
        new Error("招待メールの送信設定がありません"),
      );
      if (!saved) {
        throw new Error("招待メールの送信設定がありません");
      }
      return "failed";
    }

    const existingProfileId = await findProfileIdByEmail(
      supabase,
      application.email,
    );
    if (existingProfileId) {
      const saved = await recordInviteOutcome(supabase, application.id, {
        inviteStatus: "existing_account",
        inviteError: "",
        invitedAt: null,
        authUserId: existingProfileId,
      });
      if (!saved) throw new Error("既存アカウントの記録に失敗しました");
      return "existing_account";
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      application.email,
      {
        redirectTo: navigatorInviteRedirectTo(),
        data: {
          role: "instructor",
          certification_type: "navigator",
          display_name: application.nameKanji,
        },
      },
    );
    if (error) {
      if (isExistingAuthUserError(error)) {
        const authUserId = await findProfileIdByEmail(supabase, application.email);
        const saved = await recordInviteOutcome(supabase, application.id, {
          inviteStatus: "existing_account",
          inviteError: "",
          invitedAt: null,
          authUserId,
        });
        if (!saved) throw new Error("既存アカウントの記録に失敗しました");
        return "existing_account";
      }
      const saved = await recordInviteFailure(supabase, application.id, error);
      if (!saved) throw error;
      return "failed";
    }

    sentUserId = data.user?.id ?? null;
    const sentOutcome = {
      inviteStatus: "sent" as const,
      inviteError: "",
      invitedAt: new Date().toISOString(),
      authUserId: sentUserId,
    };
    const saved = await recordInviteOutcome(supabase, application.id, sentOutcome);
    if (!saved) {
      const retried = await recordInviteOutcome(supabase, application.id, sentOutcome);
      if (!retried) throw new Error("招待結果の記録に失敗しました");
    }
    return "sent";
  } catch (error) {
    if (sentUserId !== undefined) {
      const saved = await recordInviteOutcome(supabase, application.id, {
        inviteStatus: "sent",
        inviteError: "",
        invitedAt: new Date().toISOString(),
        authUserId: sentUserId,
      });
      if (saved) return "sent";
    }
    const saved = await recordInviteFailure(supabase, application.id, error);
    if (!saved) {
      console.error("[navigator-invite] invite failed and result was not saved", {
        id: application.id,
      });
    }
    return "failed";
  }
}

export async function updateNavigatorApplication(input: {
  id: string;
  status: NavigatorApplicationStatus;
  reviewMemo: string;
}): Promise<{
  application: NavigatorApplicationRecord;
  inviteAttempt: NavigatorInviteAttempt;
}> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("申請の保存先が設定されていません");
  }

  const reviewMemo = input.reviewMemo.trim();
  if (reviewMemo.length > 2000) {
    throw new Error("審査メモは2000文字以内で入力してください");
  }

  const { data, error } = await supabase
    .from("navigator_applications")
    .update({
      status: input.status,
      review_memo: reviewMemo,
    })
    .eq("id", input.id)
    .select(APPLICATION_COLUMNS)
    .maybeSingle();

  if (error || !data) {
    throw new Error("申請を更新できませんでした");
  }

  const mapped = mapRow(data as Record<string, unknown>);
  if (!mapped) {
    throw new Error("申請を更新できませんでした");
  }

  if (input.status !== "approved") {
    return { application: mapped, inviteAttempt: "skipped" };
  }

  const inviteAttempt = await deliverNavigatorInvite(supabase, mapped);
  if (inviteAttempt === "sent" || inviteAttempt === "existing_account") {
    await sendNavigatorRegistrationCompleteEmail(mapped, inviteAttempt);
  }
  const reloaded = await reloadApplication(supabase, mapped.id);
  return {
    application: reloaded ?? mapped,
    inviteAttempt,
  };
}

export function navigatorApplicationErrorStatus(error: unknown): {
  error: string;
  status: number;
} {
  if (error instanceof Error) {
    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    if (error.message === "Unauthorized") {
      return { error: "ログインが必要です", status: 401 };
    }
    if (error.message === "Forbidden") {
      return { error: "この操作を行う権限がありません", status: 403 };
    }
    if (typeof statusCode === "number") {
      return { error: error.message, status: statusCode };
    }
    return { error: error.message, status: 400 };
  }
  return { error: "処理に失敗しました", status: 400 };
}
