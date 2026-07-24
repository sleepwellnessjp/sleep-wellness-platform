/**
 * Version 2.7 — 認定講師 Closed Beta 招待
 * Supabase 未設定時のみデモストア。設定済み時は DB 失敗をデモへ落とさない。
 */

import { requireAdminProfile } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildBetaInviteEmail,
  generateBetaInviteCode,
} from "./beta-invitation-constants";
import {
  acceptDemoBetaInvitation,
  createDemoBetaInvitation,
  getDemoBetaInvitationByCode,
  listDemoBetaInvitations,
  revokeDemoBetaInvitation,
  sendDemoBetaInvitation,
} from "./demo-beta-invitation-store";
import type {
  AcceptBetaInvitationInput,
  BetaInstructorInvitation,
  CreateBetaInvitationInput,
} from "./beta-invitation-types";

function mapRow(row: Record<string, unknown>): BetaInstructorInvitation {
  return {
    id: String(row.id),
    code: String(row.code),
    instructorName: String(row.instructor_name ?? ""),
    instructorEmail: String(row.instructor_email ?? ""),
    startDate: String(row.start_date ?? "").slice(0, 10),
    status: row.status as BetaInstructorInvitation["status"],
    emailSubject: String(row.email_subject ?? ""),
    emailBody: String(row.email_body ?? ""),
    termsRequired: row.terms_required !== false,
    termsAcceptedAt:
      typeof row.terms_accepted_at === "string" ? row.terms_accepted_at : null,
    sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
    acceptedAt: typeof row.accepted_at === "string" ? row.accepted_at : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listBetaInstructorInvitations(): Promise<
  BetaInstructorInvitation[]
> {
  await requireAdminProfile();
  if (!isSupabaseConfigured()) return listDemoBetaInvitations();

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const { data, error } = await supabase
    .from("beta_instructor_invitations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[beta-invitation] list failed:", error.message);
    throw new Error(
      "招待一覧の取得に失敗しました。テーブル未作成の場合はマイグレーションを適用してください。",
    );
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function createBetaInstructorInvitation(
  input: CreateBetaInvitationInput,
): Promise<BetaInstructorInvitation> {
  await requireAdminProfile();
  if (!input.instructorName.trim() || !input.instructorEmail.trim()) {
    throw new Error("氏名とメールアドレスは必須です");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    throw new Error("利用開始日の形式が不正です");
  }

  if (!isSupabaseConfigured()) {
    return createDemoBetaInvitation(input);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const code = generateBetaInviteCode();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const email = buildBetaInviteEmail({
    instructorName: input.instructorName.trim(),
    code,
    startDate: input.startDate,
    inviteUrl: `${origin}/invite/${code}`,
  });

  const { data, error } = await supabase
    .from("beta_instructor_invitations")
    .insert({
      code,
      instructor_name: input.instructorName.trim(),
      instructor_email: input.instructorEmail.trim().toLowerCase(),
      start_date: input.startDate,
      status: "draft",
      email_subject: email.subject,
      email_body: email.body,
      terms_required: input.termsRequired !== false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[beta-invitation] create failed:", error.message);
    throw new Error(
      error.message ||
        "招待の作成に失敗しました。テーブル未作成の場合はマイグレーションを適用してください。",
    );
  }

  const invitation = mapRow(data as Record<string, unknown>);

  // 既存の認定講師レコードへ利用開始日を反映
  await supabase
    .from("certified_instructors")
    .update({ usage_start_date: invitation.startDate })
    .ilike("email", invitation.instructorEmail)
    .then(({ error: syncError }) => {
      if (syncError) {
        console.error(
          "[beta-invitation] usage_start_date sync on create:",
          syncError.message,
        );
      }
    });

  return invitation;
}

/** メール送信（モック） */
export async function sendBetaInstructorInvitation(
  id: string,
): Promise<BetaInstructorInvitation> {
  await requireAdminProfile();
  if (!isSupabaseConfigured()) {
    const sent = sendDemoBetaInvitation(id);
    if (!sent) throw new Error("招待が見つかりません");
    return sent;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("beta_instructor_invitations")
    .update({ status: "sent", sent_at: now, updated_at: now })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "招待が見つかりません");
  }
  return mapRow(data as Record<string, unknown>);
}

export async function revokeBetaInstructorInvitation(
  id: string,
): Promise<BetaInstructorInvitation> {
  await requireAdminProfile();
  if (!isSupabaseConfigured()) {
    const revoked = revokeDemoBetaInvitation(id);
    if (!revoked) throw new Error("招待が見つかりません");
    return revoked;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("beta_instructor_invitations")
    .update({ status: "revoked", updated_at: now })
    .eq("id", id)
    .neq("status", "accepted")
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "招待が見つかりません");
  }
  return mapRow(data as Record<string, unknown>);
}

export async function acceptBetaInstructorInvitation(
  input: AcceptBetaInvitationInput,
): Promise<BetaInstructorInvitation> {
  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error("招待コードを入力してください");

  if (!isSupabaseConfigured()) {
    return acceptDemoBetaInvitation({ ...input, code });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const { data: existing, error: findError } = await supabase
    .from("beta_instructor_invitations")
    .select("*")
    .ilike("code", code)
    .maybeSingle();

  if (findError) {
    throw new Error(
      findError.message ||
        "招待の照会に失敗しました。テーブル未作成の場合はマイグレーションを適用してください。",
    );
  }
  if (!existing) {
    throw new Error("招待コードが見つかりません");
  }

  const row = mapRow(existing as Record<string, unknown>);
  if (row.status === "revoked") throw new Error("この招待は取り消されています");
  if (row.status === "expired") throw new Error("この招待は期限切れです");
  if (row.status === "accepted") return row;
  if (row.termsRequired && !input.termsAccepted) {
    throw new Error("利用規約への同意が必要です");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("beta_instructor_invitations")
    .update({
      status: "accepted",
      accepted_at: now,
      terms_accepted_at: input.termsAccepted ? now : null,
      updated_at: now,
    })
    .eq("id", row.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "受諾に失敗しました");
  }

  // 認定講師レコードがあれば利用開始日を同期（ログインゲート用）
  await supabase
    .from("certified_instructors")
    .update({ usage_start_date: row.startDate })
    .ilike("email", row.instructorEmail)
    .then(({ error: syncError }) => {
      if (syncError) {
        console.error(
          "[beta-invitation] usage_start_date sync:",
          syncError.message,
        );
      }
    });

  return mapRow(data as Record<string, unknown>);
}

export async function lookupBetaInstructorInvitation(
  code: string,
): Promise<BetaInstructorInvitation | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  if (!isSupabaseConfigured()) {
    return getDemoBetaInvitationByCode(normalized);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const { data, error } = await supabase
    .from("beta_instructor_invitations")
    .select("*")
    .ilike("code", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ||
        "招待の照会に失敗しました。テーブル未作成の場合はマイグレーションを適用してください。",
    );
  }
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}
