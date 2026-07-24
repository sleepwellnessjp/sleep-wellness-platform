import type { Json } from "@/lib/supabase/database.types";
import {
  DataAccessError,
  mapLoadError,
  mapSaveError,
  unauthenticatedError,
} from "@/lib/data-access-errors";
import { getInstructorAuth } from "@/lib/repositories/v1-beta-auth";
import type { ReportListItem, ReportStatus } from "@/lib/reports-list";

export type ReportDataPayload = {
  title?: string;
  status?: ReportStatus;
  sleepScore?: number | null;
  clientName?: string;
  excerpt?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ReportRecord = {
  id: string;
  clientId: string;
  instructorId: string;
  analysisId: string | null;
  reportData: ReportDataPayload;
  createdAt: string;
  updatedAt: string;
};

export type SaveReportInput = {
  clientId: string;
  analysisId?: string | null;
  reportData: ReportDataPayload;
};

type DbRow = {
  id: string;
  client_id: string;
  instructor_id: string;
  analysis_id: string | null;
  report_data: Json;
  created_at: string;
  updated_at: string;
};

function asPayload(value: Json | null | undefined): ReportDataPayload {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ReportDataPayload;
  }
  return {};
}

function mapRow(row: DbRow): ReportRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    instructorId: row.instructor_id,
    analysisId: row.analysis_id,
    reportData: asPayload(row.report_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function statusOf(payload: ReportDataPayload): ReportStatus {
  if (
    payload.status === "ready" ||
    payload.status === "draft" ||
    payload.status === "pending"
  ) {
    return payload.status;
  }
  return "ready";
}

export function toReportListItem(
  record: ReportRecord,
  clientNameFallback = "クライアント",
): ReportListItem {
  const payload = record.reportData;
  const status = statusOf(payload);
  const sleepScore =
    typeof payload.sleepScore === "number" ? payload.sleepScore : null;
  const analysisHref = record.analysisId
    ? `/analysis/result?analysisId=${encodeURIComponent(record.analysisId)}`
    : null;
  return {
    id: record.id,
    clientId: record.clientId,
    clientName:
      typeof payload.clientName === "string" && payload.clientName.trim()
        ? payload.clientName
        : clientNameFallback,
    title:
      typeof payload.title === "string" && payload.title.trim()
        ? payload.title
        : "Sleep Wellness Report",
    createdAt: record.createdAt.slice(0, 10),
    sleepScore,
    status,
    href:
      analysisHref ??
      (status === "ready"
        ? `/clients/${encodeURIComponent(record.clientId)}`
        : `/analysis/new?clientId=${encodeURIComponent(record.clientId)}`),
  };
}

export async function listReportsForInstructor(): Promise<ReportRecord[]> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const { data, error } = await auth.supabase
    .from("reports")
    .select("*")
    .eq("instructor_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) throw mapLoadError(error, "listReportsForInstructor");
  return ((data ?? []) as DbRow[]).map(mapRow);
}

export async function listReportsForClient(
  clientId: string,
): Promise<ReportRecord[]> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const { data, error } = await auth.supabase
    .from("reports")
    .select("*")
    .eq("instructor_id", auth.userId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw mapLoadError(error, "listReportsForClient");
  return ((data ?? []) as DbRow[]).map(mapRow);
}

export async function saveReport(
  input: SaveReportInput,
): Promise<ReportRecord> {
  const auth = await getInstructorAuth();
  if (!auth) throw unauthenticatedError();

  const clientId = input.clientId.trim();
  if (!clientId) {
    throw new DataAccessError("save_failed", "クライアントが指定されていません。");
  }

  const analysisId = input.analysisId?.trim() || null;

  // 同一 analysis へのレポート二重作成を避ける
  if (analysisId) {
    const { data: existing, error: existingError } = await auth.supabase
      .from("reports")
      .select("*")
      .eq("instructor_id", auth.userId)
      .eq("analysis_id", analysisId)
      .maybeSingle();

    if (existingError) throw mapLoadError(existingError, "saveReport:existing");
    if (existing) return mapRow(existing as DbRow);
  }

  const payload = {
    client_id: clientId,
    instructor_id: auth.userId,
    analysis_id: analysisId,
    report_data: input.reportData as Json,
  };

  const { data, error } = await auth.supabase
    .from("reports")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw mapSaveError(error, "saveReport");
  return mapRow(data as DbRow);
}
