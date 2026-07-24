import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import {
  listDemoAuditLogs,
  writeDemoAuditLog,
} from "./demo-audit-store";
import type {
  AuditListFilters,
  AuditLogRecord,
  WriteAuditLogInput,
} from "./types";

function mapAudit(row: Record<string, unknown>): AuditLogRecord {
  return {
    id: String(row.id),
    actorId: typeof row.actor_id === "string" ? row.actor_id : null,
    actorEmail: typeof row.actor_email === "string" ? row.actor_email : null,
    actorRole: typeof row.actor_role === "string" ? row.actor_role : null,
    action: row.action as AuditLogRecord["action"],
    resourceType:
      typeof row.resource_type === "string" ? row.resource_type : null,
    resourceId: typeof row.resource_id === "string" ? row.resource_id : null,
    summary: String(row.summary ?? ""),
    payload: (row.payload as Record<string, unknown>) ?? {},
    ipAddress: typeof row.ip_address === "string" ? row.ip_address : null,
    userAgent: typeof row.user_agent === "string" ? row.user_agent : null,
    createdAt: String(row.created_at),
  };
}

/**
 * 監査ログ書き込み。
 * actor / IP / UA はサーバー側セッションから確定し、クライアント指定は無視する。
 */
export async function writeAuditLog(
  input: WriteAuditLogInput,
): Promise<AuditLogRecord | null> {
  const profile = await getCurrentProfile();

  const actorId = profile?.id ?? null;
  const actorEmail = profile?.email ?? null;
  const actorRole = profile?.role ?? null;

  const record: WriteAuditLogInput = {
    action: input.action,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    summary: input.summary,
    payload: input.payload ?? {},
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    actorId,
    actorEmail,
    actorRole,
  };

  if (!isSupabaseConfigured()) {
    return writeDemoAuditLog(record);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      actor_id: actorId,
      actor_email: actorEmail,
      actor_role: actorRole,
      action: record.action,
      resource_type: record.resourceType ?? null,
      resource_id: record.resourceId ?? null,
      summary: record.summary,
      payload: (record.payload ?? {}) as import("@/lib/supabase/database.types").Json,
      ip_address: record.ipAddress ?? null,
      user_agent: record.userAgent ?? null,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[audit] write failed", error.message);
    return null;
  }
  return data ? mapAudit(data as Record<string, unknown>) : null;
}

export async function listAuditLogs(
  filters?: AuditListFilters,
): Promise<AuditLogRecord[]> {
  if (!isSupabaseConfigured()) {
    return listDemoAuditLogs(filters);
  }
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 100);

  if (filters?.action && filters.action !== "all") {
    query = query.eq("action", filters.action);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []).map((row) =>
    mapAudit(row as Record<string, unknown>),
  );
  if (filters?.q) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter((row) =>
      `${row.summary} ${row.actorEmail ?? ""} ${row.action}`
        .toLowerCase()
        .includes(q),
    );
  }
  return rows;
}

/** 失敗しても本処理を止めない安全ラッパー */
export async function safeAudit(
  input: WriteAuditLogInput,
): Promise<void> {
  try {
    await writeAuditLog(input);
  } catch (err) {
    console.error("[audit] safeAudit failed", err);
  }
}
