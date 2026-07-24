import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import {
  acceptDemoInvitation,
  createDemoInvitation,
  listAllDemoInvitations,
  listDemoInvitations,
  revokeDemoInvitation,
  sendDemoInvitation,
  getDemoInvitationByCode,
} from "./demo-invitation-store";
import {
  addDaysIso,
  buildInviteEmail,
  DEFAULT_INVITE_EXPIRY_DAYS,
  generateInviteCode,
} from "./constants";
import type {
  CreateInvitationInput,
  InvitationListFilters,
  InvitationRecord,
} from "./types";

function mapInvitation(row: Record<string, unknown>): InvitationRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    instructorId: String(row.instructor_id),
    instructorEmail:
      typeof row.instructor_email === "string" ? row.instructor_email : null,
    instructorName:
      typeof row.instructor_name === "string" ? row.instructor_name : null,
    clientName: String(row.client_name ?? ""),
    clientEmail: String(row.client_email ?? ""),
    clientId: typeof row.client_id === "string" ? row.client_id : null,
    status: row.status as InvitationRecord["status"],
    emailSubject: String(row.email_subject ?? ""),
    emailBody: String(row.email_body ?? ""),
    expiresAt: String(row.expires_at),
    sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
    acceptedAt: typeof row.accepted_at === "string" ? row.accepted_at : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function requireInstructor() {
  return getCurrentProfile().then((profile) => {
    if (!profile) throw new Error("Unauthorized");
    if (profile.role !== "instructor" && profile.role !== "admin" && profile.role !== "super_admin") {
      throw new Error("Forbidden");
    }
    return profile;
  });
}

const DEMO_INSTRUCTOR_PROFILE = {
  id: "demo-instructor",
  email: "demo@swij.local",
  displayName: "デモ インストラクター",
  role: "instructor" as const,
  createdAt: new Date().toISOString(),
};

export async function listMyInvitations(
  filters?: InvitationListFilters,
): Promise<InvitationRecord[]> {
  if (!isSupabaseConfigured()) {
    return listDemoInvitations("demo-instructor", filters);
  }
  const profile = await requireInstructor();
  if (profile.role === "admin" || profile.role === "super_admin") {
    return listAdminInvitations(filters);
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("invitations")
    .select("*")
    .eq("instructor_id", profile.id)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = (data ?? []).map((row) =>
    mapInvitation(row as Record<string, unknown>),
  );
  if (filters?.q) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter((row) =>
      `${row.clientName} ${row.clientEmail} ${row.code}`
        .toLowerCase()
        .includes(q),
    );
  }
  return rows;
}

export async function listAdminInvitations(
  filters?: InvitationListFilters,
): Promise<InvitationRecord[]> {
  if (!isSupabaseConfigured()) {
    return listAllDemoInvitations(filters);
  }
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("invitations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = (data ?? []).map((row) =>
    mapInvitation(row as Record<string, unknown>),
  );
  if (filters?.q) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter((row) =>
      `${row.clientName} ${row.clientEmail} ${row.code}`
        .toLowerCase()
        .includes(q),
    );
  }
  return rows;
}

export async function createInvitation(
  input: CreateInvitationInput,
  origin?: string,
): Promise<InvitationRecord> {
  if (!isSupabaseConfigured()) {
    return createDemoInvitation({
      instructorId: DEMO_INSTRUCTOR_PROFILE.id,
      instructorEmail: DEMO_INSTRUCTOR_PROFILE.email,
      instructorName: DEMO_INSTRUCTOR_PROFILE.displayName,
      input,
      origin,
    });
  }

  const profile = await requireInstructor();
  if (profile.role !== "instructor") {
    throw new Error("Forbidden: 認定講師のみ招待を発行できます");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database unavailable");

  const code = generateInviteCode();
  const inviteUrl = `${origin ?? ""}/invite/${encodeURIComponent(code)}`;
  const email = buildInviteEmail({
    clientName: input.clientName.trim(),
    instructorName: profile.displayName ?? "認定講師",
    code,
    inviteUrl: inviteUrl || `/invite/${code}`,
  });

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      code,
      instructor_id: profile.id,
      instructor_email: profile.email,
      instructor_name: profile.displayName,
      client_name: input.clientName.trim(),
      client_email: input.clientEmail.trim().toLowerCase(),
      client_id: input.clientId ?? null,
      status: "pending",
      email_subject: email.subject,
      email_body: email.body,
      expires_at: addDaysIso(input.expiresInDays ?? DEFAULT_INVITE_EXPIRY_DAYS),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapInvitation(data as Record<string, unknown>);
}

export async function sendInvitation(id: string): Promise<InvitationRecord> {
  if (!isSupabaseConfigured()) {
    const updated = sendDemoInvitation(id);
    if (!updated) throw new Error("招待が見つかりません");
    return updated;
  }

  const profile = await requireInstructor();
  if (profile.role !== "instructor") {
    throw new Error("Forbidden: 認定講師のみ招待メールを送信できます");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database unavailable");

  const { data, error } = await supabase
    .from("invitations")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("instructor_id", profile.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  // 実メール送信は将来接続。現状はレコード更新 + 本文保存のみ。
  return mapInvitation(data as Record<string, unknown>);
}

export async function revokeInvitation(id: string): Promise<InvitationRecord> {
  if (!isSupabaseConfigured()) {
    const updated = revokeDemoInvitation(id);
    if (!updated) throw new Error("招待が見つかりません");
    return updated;
  }

  const profile = await requireInstructor();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database unavailable");

  let query = supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", id);

  if (profile.role === "instructor") {
    query = query.eq("instructor_id", profile.id);
  }

  const { data, error } = await query.select("*").single();
  if (error) throw new Error(error.message);
  return mapInvitation(data as Record<string, unknown>);
}

export async function acceptInvitationByCode(code: string): Promise<{
  ok: boolean;
  invitation: InvitationRecord | null;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return acceptDemoInvitation(code);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, invitation: null, error: "Database unavailable" };
  }

  const profile = await getCurrentProfile();
  const clientId =
    profile?.role === "client" ? profile.id : null;

  const { data, error } = await supabase.rpc("accept_invitation_by_code", {
    p_code: code.trim(),
    p_client_id: clientId,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("INVITE_NOT_FOUND")) {
      return { ok: false, invitation: null, error: "招待コードが見つかりません" };
    }
    if (message.includes("INVITE_REVOKED")) {
      return {
        ok: false,
        invitation: null,
        error: "この招待は取り消されています",
      };
    }
    if (message.includes("INVITE_EXPIRED")) {
      return {
        ok: false,
        invitation: null,
        error: "招待の有効期限が切れています",
      };
    }
    return { ok: false, invitation: null, error: message || "受諾に失敗しました" };
  }

  if (!data) {
    return { ok: false, invitation: null, error: "招待コードが見つかりません" };
  }

  return {
    ok: true,
    invitation: mapInvitation(data as Record<string, unknown>),
  };
}

export async function peekInvitationByCode(
  code: string,
): Promise<InvitationRecord | null> {
  if (!isSupabaseConfigured()) {
    return getDemoInvitationByCode(code);
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("peek_invitation_by_code", {
    p_code: code.trim(),
  });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapInvitation(row as Record<string, unknown>) : null;
}
