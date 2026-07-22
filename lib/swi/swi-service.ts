/**
 * Sleep Wellness Intelligence — データ取得とスコープ制御。
 * 管理者: 全体 / 認定講師: 担当クライアントのみ。個人情報は返さない。
 */

import { isAdminRole } from "@/lib/platform/constants";
import { getCurrentProfile } from "@/lib/platform/platform-service";
import type { PlatformProfile } from "@/lib/platform/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildSwiInsightsOverview,
  type SwiAnalysisRow,
  type SwiClientRow,
  type SwiHomeworkRow,
} from "./aggregate";
import type { SwiInsightsOverview, SwiScope } from "./types";

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function stressFromRow(row: Record<string, unknown>): number | null {
  const direct = parseNumeric(row.stress_average);
  if (direct != null) return direct;
  const confirmed = row.confirmed_metrics;
  if (confirmed && typeof confirmed === "object" && !Array.isArray(confirmed)) {
    const metrics = confirmed as Record<string, unknown>;
    return (
      parseNumeric(metrics.stress) ??
      parseNumeric(metrics.stressAverage) ??
      parseNumeric(metrics.stress_average)
    );
  }
  return null;
}

function requireInstructorOrAdmin(
  profile: PlatformProfile | null,
): PlatformProfile {
  if (!profile) throw new Error("Unauthorized");
  if (
    profile.role !== "instructor" &&
    profile.role !== "admin" &&
    profile.role !== "super_admin"
  ) {
    throw new Error("Forbidden");
  }
  return profile;
}

async function loadScopedClientIds(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  profile: PlatformProfile,
): Promise<{ scope: SwiScope; clientIds: string[] | null }> {
  if (isAdminRole(profile.role)) {
    return { scope: "platform", clientIds: null };
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("instructor_id", profile.id)
    .limit(5000);

  if (error) throw new Error(error.message);
  return {
    scope: "instructor",
    clientIds: (data ?? []).map((row) => String((row as { id: string }).id)),
  };
}

function mapClient(row: Record<string, unknown>): SwiClientRow {
  return {
    id: String(row.id),
    gender: row.gender != null ? String(row.gender) : null,
    age: parseNumeric(row.age),
    birthDate: row.birth_date != null ? String(row.birth_date) : null,
    registeredAt:
      row.registered_at != null ? String(row.registered_at) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapAnalysis(row: Record<string, unknown>): SwiAnalysisRow {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    sleepScore: parseNumeric(row.sleep_score),
    sleepDuration: parseNumeric(row.sleep_duration),
    sleepEfficiency: parseNumeric(row.sleep_efficiency),
    hrv: parseNumeric(row.hrv),
    stress: stressFromRow(row),
    analyzedAt: String(row.analyzed_at ?? row.created_at ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapHomework(row: Record<string, unknown>): SwiHomeworkRow {
  return {
    clientId: String(row.client_id),
    title: String(row.title ?? ""),
    isCompleted: Boolean(row.is_completed),
    dueDate: String(row.due_date ?? "").slice(0, 10),
  };
}

export async function getSwiInsightsOverview(): Promise<SwiInsightsOverview> {
  const profile = requireInstructorOrAdmin(await getCurrentProfile());
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { scope, clientIds } = await loadScopedClientIds(supabase, profile);
  if (scope === "instructor" && (clientIds?.length ?? 0) === 0) {
    return buildSwiInsightsOverview({
      scope,
      clients: [],
      analyses: [],
      homeworks: [],
    });
  }

  // age / stress_average は一部環境の追加列。未反映でも落ちないよう緩く読む。
  let clientsQuery = supabase
    .from("clients")
    .select("id, gender, birth_date, registered_at, created_at")
    .limit(5000);
  if (clientIds) {
    clientsQuery = clientsQuery.in("id", clientIds);
  }

  let analysesQuery = supabase
    .from("analyses")
    .select(
      "id, client_id, sleep_score, sleep_duration, sleep_efficiency, hrv, confirmed_metrics, analyzed_at, created_at",
    )
    .order("analyzed_at", { ascending: true })
    .limit(10000);
  if (clientIds) {
    analysesQuery = analysesQuery.in("client_id", clientIds);
  }

  let homeworksQuery = supabase
    .from("client_homeworks")
    .select("client_id, title, is_completed, due_date")
    .limit(10000);
  if (clientIds) {
    homeworksQuery = homeworksQuery.in("client_id", clientIds);
  } else if (scope === "instructor") {
    homeworksQuery = homeworksQuery.eq("instructor_id", profile.id);
  }

  const [clientsRes, analysesRes, homeworksRes] = await Promise.all([
    clientsQuery,
    analysesQuery,
    homeworksQuery,
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (analysesRes.error) throw new Error(analysesRes.error.message);

  let homeworkRows: Record<string, unknown>[] = [];
  if (homeworksRes.error) {
    if (!/does not exist|schema cache/i.test(homeworksRes.error.message)) {
      throw new Error(homeworksRes.error.message);
    }
  } else {
    homeworkRows = (homeworksRes.data ?? []) as Record<string, unknown>[];
  }

  const clients = ((clientsRes.data ?? []) as Record<string, unknown>[]).map(
    mapClient,
  );
  const analyses = (
    (analysesRes.data ?? []) as Record<string, unknown>[]
  ).map(mapAnalysis);
  const homeworks = homeworkRows.map(mapHomework);

  return buildSwiInsightsOverview({
    scope,
    clients,
    analyses,
    homeworks,
  });
}
