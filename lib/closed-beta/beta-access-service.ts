/**
 * Closed Beta 配布ゲート — ログイン可否判定（Supabase 照会）
 * ブラウザ / サーバー双方の Supabase クライアントで利用可能。
 *
 * 認定講師の根拠（優先順）:
 * 1. certified_instructors（運営レコード・停止/退会を最優先で反映）
 * 2. membership（signup の handle_new_user が作成）
 * 3. beta_instructor_invitations（accepted）
 * 4. profiles.role === "instructor"（認定講師として新規登録）
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { todayTokyoDate } from "./beta-invitation-constants";
import {
  evaluateClosedBetaInstructorAccess,
  isExemptFromClosedBetaGate,
  type BetaAccessResult,
} from "./beta-access";

function asDateOnly(value: unknown): string | null {
  const start = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : null;
}

export async function evaluateClosedBetaLoginAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  options?: { email?: string | null; role?: string | null },
): Promise<BetaAccessResult> {
  let role = options?.role ?? "";
  let email = (options?.email ?? "").trim().toLowerCase();

  if (!role || !email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", userId)
      .maybeSingle();

    if (!role) role = String(profile?.role ?? "");
    if (!email) email = String(profile?.email ?? "").trim().toLowerCase();
  }

  if (isExemptFromClosedBetaGate(role)) {
    return { allowed: true };
  }

  const { data: certifiedRow, error: certError } = await supabase
    .from("certified_instructors")
    .select("status, usage_start_date, email")
    .eq("user_id", userId)
    .maybeSingle();

  if (certError) {
    // テーブル未適用・一時障害時は後続フォールバックへ（即 not_certified にしない）
    console.error(
      "[closed-beta-access] certified_instructors:",
      certError.message,
    );
  }

  const certifiedEmail = String(certifiedRow?.email ?? email)
    .trim()
    .toLowerCase();
  let invitationStartDate: string | null = null;
  let hasAcceptedInvitation = false;

  if (certifiedEmail) {
    const { data: invite, error: inviteError } = await supabase
      .from("beta_instructor_invitations")
      .select("start_date")
      .eq("status", "accepted")
      .ilike("instructor_email", certifiedEmail)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError) {
      console.error(
        "[closed-beta-access] beta_instructor_invitations:",
        inviteError.message,
      );
    } else if (invite) {
      hasAcceptedInvitation = true;
      invitationStartDate = asDateOnly(invite.start_date);
    }
  }

  let hasActiveMembership = false;
  if (!certifiedRow) {
    const { data: memberships, error: membershipError } = await supabase
      .from("membership")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1);

    if (membershipError) {
      console.error(
        "[closed-beta-access] membership:",
        membershipError.message,
      );
    } else {
      hasActiveMembership = (memberships?.length ?? 0) > 0;
    }
  }

  const certified = certifiedRow
    ? {
        status: String(certifiedRow.status ?? ""),
        usageStartDate: asDateOnly(certifiedRow.usage_start_date),
      }
    : hasActiveMembership || hasAcceptedInvitation
      ? {
          status: "active",
          usageStartDate: null,
        }
      : null;

  return evaluateClosedBetaInstructorAccess({
    certified,
    invitationStartDate,
    today: todayTokyoDate(),
  });
}
