/**
 * Executive Dashboard service — 既存 Admin / SWI / Activity を束ねる。
 */

import { isAdminRole } from "@/lib/platform/constants";
import { getCurrentProfile } from "@/lib/platform/platform-service";
import {
  clientsInstructorFilterColumn,
  resolveClientsInstructorColumn,
} from "@/lib/supabase/clients-instructor-column";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildExecutiveDashboard,
  getDemoExecutiveDashboard,
  type ExecutiveDashboardData,
  type ExecutiveTimelineItem,
} from "@/lib/executive-dashboard";
import {
  getAdminDashboardStats,
  listSystemActivityLogs,
} from "@/lib/admin/admin-service";
import { getSwiInsightsOverview } from "@/lib/swi/swi-service";
import type {
  SwiAnalysisRow,
  SwiClientRow,
  SwiHomeworkRow,
} from "@/lib/swi/aggregate";
import { todayInTokyo } from "@/lib/repositories/client-homeworks-repository";
import type { SystemActivityLogRecord } from "@/lib/admin/types";

function dayKeyTokyo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function mapTimelineFromLogs(
  logs: Array<{
    id: string;
    category: string;
    action: string;
    summary: string;
    createdAt: string;
  }>,
  today: string,
): ExecutiveTimelineItem[] {
  const items: ExecutiveTimelineItem[] = [];

  for (const log of logs) {
    if (dayKeyTokyo(log.createdAt) !== today) continue;

    let kind: ExecutiveTimelineItem["kind"] | null = null;
    let label = "";

    if (log.category === "analysis" || log.action.includes("analy")) {
      kind = "analysis";
      label = "分析";
    } else if (
      log.category === "login" ||
      log.action === "sign_in" ||
      log.action.includes("login")
    ) {
      kind = "login";
      label = "ログイン";
    } else if (
      log.action.includes("homework") ||
      log.summary.includes("宿題")
    ) {
      kind = "homework";
      label = "宿題";
    } else if (
      log.action.includes("journey") ||
      log.summary.includes("Journey") ||
      log.summary.includes("ジャーニー")
    ) {
      kind = "journey";
      label = "Journey";
    } else if (
      log.action.includes("cert") ||
      log.summary.includes("認定") ||
      log.category === "admin"
    ) {
      kind = "certification";
      label = "認定";
    }

    if (!kind) continue;

    items.push({
      id: log.id,
      at: log.createdAt,
      kind,
      label,
      detail: log.summary || label,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 16);
}

async function loadOwnActivityLogs(
  actorId: string,
  limit = 80,
): Promise<SystemActivityLogRecord[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("system_activity_logs")
    .select("*")
    .eq("actor_id", actorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    actorId: row.actor_id ? String(row.actor_id) : null,
    actorName: null,
    category: String(row.category) as SystemActivityLogRecord["category"],
    action: String(row.action ?? ""),
    targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    summary: String(row.summary ?? ""),
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  }));
}

async function countLoginsToday(today: string, isAdmin: boolean, actorId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return 0;

  const dayStart = `${today}T00:00:00+09:00`;
  let query = supabase
    .from("system_activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("category", "login")
    .gte("created_at", dayStart);

  if (!isAdmin) {
    query = query.eq("actor_id", actorId);
  }

  const { count } = await query;
  return count ?? 0;
}

async function loadScopedRawData(profileId: string, isAdmin: boolean) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  let clientsQuery = supabase
    .from("clients")
    .select("id, gender, birth_date, registered_at, created_at")
    .limit(5000);
  let analysesQuery = supabase
    .from("analyses")
    .select(
      "id, client_id, sleep_score, sleep_duration, sleep_efficiency, hrv, analyzed_at, created_at",
    )
    .order("analyzed_at", { ascending: true })
    .limit(10000);
  let homeworksQuery = supabase
    .from("client_homeworks")
    .select("client_id, title, is_completed, due_date, completed_at")
    .limit(10000);

  if (!isAdmin) {
    const instructorCol = await resolveClientsInstructorColumn(supabase);
    const { data: owned } = await supabase
      .from("clients")
      .select("id")
      .eq(clientsInstructorFilterColumn(instructorCol), profileId)
      .limit(5000);
    const ids = (owned ?? []).map((row) => String((row as { id: string }).id));
    if (ids.length === 0) {
      return { clients: [], analyses: [], homeworks: [] as Array<SwiHomeworkRow & { completedAt?: string | null }> };
    }
    clientsQuery = clientsQuery.in("id", ids);
    analysesQuery = analysesQuery.in("client_id", ids);
    homeworksQuery = homeworksQuery.in("client_id", ids);
  }

  const [clientsRes, analysesRes, homeworksRes] = await Promise.all([
    clientsQuery,
    analysesQuery,
    homeworksQuery,
  ]);

  const clients: SwiClientRow[] = ((clientsRes.data ?? []) as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.id),
      gender: row.gender != null ? String(row.gender) : null,
      age: null,
      birthDate: row.birth_date != null ? String(row.birth_date) : null,
      registeredAt:
        row.registered_at != null ? String(row.registered_at) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
    }),
  );

  const analyses: SwiAnalysisRow[] = (
    (analysesRes.data ?? []) as Array<Record<string, unknown>>
  ).map((row) => ({
    id: String(row.id),
    clientId: String(row.client_id),
    sleepScore:
      typeof row.sleep_score === "number" ? row.sleep_score : null,
    sleepDuration:
      typeof row.sleep_duration === "number" ? row.sleep_duration : null,
    sleepEfficiency:
      typeof row.sleep_efficiency === "number" ? row.sleep_efficiency : null,
    hrv: typeof row.hrv === "number" ? row.hrv : null,
    stress: null,
    analyzedAt: String(row.analyzed_at ?? row.created_at ?? ""),
    createdAt: String(row.created_at ?? ""),
  }));

  let homeworks: Array<SwiHomeworkRow & { completedAt?: string | null }> = [];
  if (!homeworksRes.error) {
    homeworks = ((homeworksRes.data ?? []) as Array<Record<string, unknown>>).map(
      (row) => ({
        clientId: String(row.client_id),
        title: String(row.title ?? ""),
        isCompleted: Boolean(row.is_completed),
        dueDate: String(row.due_date ?? "").slice(0, 10),
        completedAt:
          row.completed_at != null ? String(row.completed_at) : null,
      }),
    );
  }

  return { clients, analyses, homeworks };
}

export async function getExecutiveDashboard(): Promise<ExecutiveDashboardData> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("Unauthorized");
  }
  if (
    profile.role !== "instructor" &&
    profile.role !== "admin" &&
    profile.role !== "super_admin"
  ) {
    throw new Error("Forbidden");
  }

  const admin = isAdminRole(profile.role);
  const scope = admin ? "platform" : "instructor";
  const today = todayInTokyo();

  const [raw, adminStats, insights, activityLogs, loginCountToday] =
    await Promise.all([
      loadScopedRawData(profile.id, admin),
      admin
        ? getAdminDashboardStats().catch(() => null)
        : Promise.resolve(null),
      getSwiInsightsOverview().catch(() => null),
      admin
        ? listSystemActivityLogs({ limit: 80 }).catch(() => [])
        : loadOwnActivityLogs(profile.id).catch(() => []),
      countLoginsToday(today, admin, profile.id).catch(() => 0),
    ]);

  const instructorCount = admin
    ? (adminStats?.instructorCount ?? 0)
    : 1;

  const timeline = mapTimelineFromLogs(activityLogs, today);

  // 今日の分析・宿題・Journey・認定がログに無い場合は raw から補完
  if (raw) {
    for (const analysis of raw.analyses) {
      if (dayKeyTokyo(analysis.createdAt || analysis.analyzedAt) !== today) {
        continue;
      }
      if (timeline.some((t) => t.id === `analysis-${analysis.id}`)) continue;
      timeline.push({
        id: `analysis-${analysis.id}`,
        at: analysis.createdAt || analysis.analyzedAt,
        kind: "analysis",
        label: "分析",
        detail: "睡眠ウェルネス分析が完了しました",
      });
    }
    for (const hw of raw.homeworks) {
      if (!hw.isCompleted || !hw.completedAt) continue;
      if (dayKeyTokyo(hw.completedAt) !== today) continue;
      const id = `homework-${hw.clientId}-${hw.completedAt}`;
      if (timeline.some((t) => t.id === id)) continue;
      timeline.push({
        id,
        at: hw.completedAt,
        kind: "homework",
        label: "宿題",
        detail: `${hw.title || "宿題"}が完了しました`,
      });
    }
  }

  timeline.sort((a, b) => b.at.localeCompare(a.at));

  if (!raw) {
    return getDemoExecutiveDashboard(scope);
  }

  const data = buildExecutiveDashboard({
    scope,
    instructorCount,
    clients: raw.clients,
    analyses: raw.analyses,
    homeworks: raw.homeworks,
    loginCountToday,
    timeline: timeline.slice(0, 16),
  });

  // SWI overall があれば平均指標を補強
  if (insights) {
    return {
      ...data,
      overview: {
        ...data.overview,
        clientCount: Math.max(
          data.overview.clientCount,
          insights.overall.clientCount,
        ),
        analysisCount: Math.max(
          data.overview.analysisCount,
          insights.overall.analysisCount,
        ),
        averageSleepWellnessScore:
          data.overview.averageSleepWellnessScore ??
          insights.overall.averageSleepWellnessScore,
      },
      improvement: {
        ...data.improvement,
        averageSleepEfficiency:
          data.improvement.averageSleepEfficiency ??
          insights.overall.averageSleepEfficiency,
        averageHrv:
          data.improvement.averageHrv ?? insights.overall.averageHrv,
        homeworkCompletionRate:
          data.improvement.homeworkCompletionRate ??
          (insights.homeworkAchievement.length > 0
            ? Math.round(
                insights.homeworkAchievement.reduce(
                  (sum, item) => sum + (item.completionRate ?? 0),
                  0,
                ) / insights.homeworkAchievement.length,
              )
            : null),
      },
    };
  }

  return data;
}
