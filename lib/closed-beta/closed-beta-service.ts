/**
 * Version 2.4 Closed Beta 運営 — Supabase サービス
 * テーブル未作成時はデモデータへフォールバック。
 */

import { APP_VERSION } from "@/lib/app-version";
import {
  CLOSED_BETA_PHASE_LABEL,
  isHealthStatus,
  isRoadmapHorizon,
  isRoadmapStatus,
} from "./constants";
import { getDemoClosedBetaOpsBundle } from "./demo-closed-beta-store";
import type {
  BetaDashboardMetrics,
  ClosedBetaOpsBundle,
  HealthStatus,
  ReleaseNoteRecord,
  RoadmapItemRecord,
  SystemHealthComponent,
  SystemHealthSnapshot,
  UsageAnalyticsSnapshot,
  UsageDropOffPoint,
  UsageScreenStat,
} from "./types";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function mapReleaseNote(row: Record<string, unknown>): ReleaseNoteRecord {
  return {
    id: String(row.id),
    version: String(row.version ?? ""),
    releasedAt: String(row.released_at ?? "").slice(0, 10),
    title: String(row.title ?? ""),
    changes: asStringArray(row.changes),
    improvements: asStringArray(row.improvements),
    isCurrent: Boolean(row.is_current),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapRoadmapItem(row: Record<string, unknown>): RoadmapItemRecord {
  const horizon = String(row.horizon ?? "coming_soon");
  const status = String(row.status ?? "planned");
  return {
    id: String(row.id),
    horizon: isRoadmapHorizon(horizon) ? horizon : "coming_soon",
    versionLabel: String(row.version_label ?? ""),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    status: isRoadmapStatus(status) ? status : "planned",
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapHealthComponent(row: Record<string, unknown>): SystemHealthComponent {
  const status = String(row.status ?? "operational");
  return {
    id: String(row.component_id ?? row.id ?? ""),
    label: String(row.label ?? ""),
    status: isHealthStatus(status) ? status : "operational",
    detail: String(row.detail ?? ""),
    latencyMs:
      row.latency_ms == null || row.latency_ms === ""
        ? null
        : Number(row.latency_ms),
    updatedAt: String(row.updated_at ?? row.checked_at ?? ""),
  };
}

async function loadMetricsFromPlatform(): Promise<BetaDashboardMetrics | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const demo = getDemoClosedBetaOpsBundle().metrics;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString();

  try {
    const [
      instructors,
      clients,
      analyses,
      reports,
      feedback,
      bugs,
      journey,
      homeworks,
    ] = await Promise.all([
      supabase
        .from("certified_instructors")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgoIso),
      supabase
        .from("sleep_analyses")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgoIso),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgoIso),
      supabase
        .from("beta_feedback")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgoIso),
      supabase
        .from("beta_feedback")
        .select("id", { count: "exact", head: true })
        .eq("category", "bug")
        .gte("created_at", weekAgoIso),
      supabase.from("journey_progress").select("streak_days, stage_status"),
      supabase.from("client_homeworks").select("status, completed_at"),
    ]);

    const journeyRows = (journey.data ?? []) as Array<{
      streak_days?: number | null;
      stage_status?: string | null;
    }>;
    const activeJourney = journeyRows.filter(
      (row) =>
        row.stage_status !== "withdrawn" && row.stage_status !== "cancelled",
    );
    const continuing = activeJourney.filter(
      (row) => Number(row.streak_days ?? 0) >= 7,
    ).length;
    const journeyRate =
      activeJourney.length > 0
        ? Math.round((continuing / activeJourney.length) * 100)
        : demo.journeyContinuationRate;

    const hwRows = (homeworks.data ?? []) as Array<{
      status?: string | null;
      completed_at?: string | null;
    }>;
    const completedHw = hwRows.filter(
      (row) =>
        row.completed_at ||
        row.status === "completed" ||
        row.status === "done",
    ).length;
    const homeworkRate =
      hwRows.length > 0
        ? Math.round((completedHw / hwRows.length) * 100)
        : demo.homeworkCompletionRate;

    const instructorCount =
      typeof instructors.count === "number" && !instructors.error
        ? instructors.count
        : demo.certifiedInstructorCount;
    const clientCount =
      typeof clients.count === "number" && !clients.error
        ? clients.count
        : demo.registeredClientCount;
    const analysisCount =
      typeof analyses.count === "number" && !analyses.error
        ? analyses.count
        : demo.analysisCount;
    const reportCount =
      typeof reports.count === "number" && !reports.error
        ? reports.count
        : demo.reportCount;
    const feedbackCount =
      typeof feedback.count === "number" && !feedback.error
        ? feedback.count
        : demo.feedbackCount;
    const bugCount =
      typeof bugs.count === "number" && !bugs.error
        ? bugs.count
        : demo.bugCount;

    // 改善率: Homework 実施率をベースに Journey 継続の影響を加味（週次近似）
    const improvementRate = Math.min(
      100,
      Math.round(homeworkRate * 0.55 + journeyRate * 0.45),
    );

    const aiCount =
      analysisCount > 0
        ? Math.max(1, Math.round(analysisCount * 0.67))
        : demo.aiAnalysisCount;

    return {
      certifiedInstructorCount: instructorCount,
      registeredClientCount: clientCount,
      analysisCount,
      aiAnalysisCount: aiCount,
      reportCount,
      journeyContinuationRate: journeyRate,
      improvementRate,
      homeworkCompletionRate: homeworkRate,
      feedbackCount,
      bugCount,
      periodLabel: "今週（週次集計）",
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[closed-beta] metrics fallback:", error);
    return null;
  }
}

async function loadReleaseNotes(): Promise<ReleaseNoteRecord[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("release_notes")
    .select("*")
    .order("sort_order", { ascending: false });

  if (error) {
    console.error("[closed-beta] release_notes:", error.message);
    return null;
  }
  return (data ?? []).map((row) => mapReleaseNote(row as Record<string, unknown>));
}

async function loadRoadmap(): Promise<RoadmapItemRecord[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("roadmap_items")
    .select("*")
    .order("horizon", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[closed-beta] roadmap_items:", error.message);
    return null;
  }
  return (data ?? []).map((row) =>
    mapRoadmapItem(row as Record<string, unknown>),
  );
}

async function loadSystemHealth(): Promise<SystemHealthSnapshot | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("system_health")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[closed-beta] system_health:", error.message);
    return null;
  }

  const components = (data ?? []).map((row) =>
    mapHealthComponent(row as Record<string, unknown>),
  );
  if (components.length === 0) return null;

  const utilization = components.find((c) => c.id === "utilization");
  const utilizationPercent = utilization
    ? Number.parseInt(utilization.detail.replace(/[^\d]/g, ""), 10) || 42
    : 42;

  let overall: HealthStatus = "operational";
  if (components.some((c) => c.status === "outage")) overall = "outage";
  else if (components.some((c) => c.status === "degraded")) overall = "degraded";
  else if (components.some((c) => c.status === "maintenance"))
    overall = "maintenance";

  return {
    overall,
    overallLabel:
      overall === "operational"
        ? "システムは正常に稼働しています"
        : overall === "degraded"
          ? "一部コンポーネントに注意があります"
          : overall === "outage"
            ? "障害が発生しています"
            : "メンテナンス中です",
    utilizationPercent,
    components,
    checkedAt: new Date().toISOString(),
  };
}

async function loadUsageAnalytics(): Promise<UsageAnalyticsSnapshot | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("usage_statistics")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[closed-beta] usage_statistics:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const topScreensRaw = Array.isArray(row.top_screens) ? row.top_screens : [];
  const dropOffRaw = Array.isArray(row.drop_off_points)
    ? row.drop_off_points
    : [];

  const topScreens: UsageScreenStat[] = topScreensRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const s = item as Record<string, unknown>;
      return {
        screen: String(s.screen ?? ""),
        label: String(s.label ?? s.screen ?? ""),
        sessions: Number(s.sessions ?? 0),
        sharePercent: Number(s.sharePercent ?? s.share_percent ?? 0),
      } satisfies UsageScreenStat;
    })
    .filter((item): item is UsageScreenStat => item !== null);

  const dropOffPoints: UsageDropOffPoint[] = dropOffRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const s = item as Record<string, unknown>;
      return {
        screen: String(s.screen ?? ""),
        label: String(s.label ?? s.screen ?? ""),
        dropOffPercent: Number(s.dropOffPercent ?? s.drop_off_percent ?? 0),
      } satisfies UsageDropOffPoint;
    })
    .filter((item): item is UsageDropOffPoint => item !== null);

  return {
    topScreens,
    averageSessionMinutes: Number(row.average_session_minutes ?? 0),
    mobileSharePercent: Number(row.mobile_share_percent ?? 0),
    pcSharePercent: Number(row.pc_share_percent ?? 0),
    tabletSharePercent: Number(row.tablet_share_percent ?? 0),
    dropOffPoints,
    periodLabel: String(row.period_label ?? "直近期間"),
    isMock: Boolean(row.is_mock ?? true),
    updatedAt: String(row.captured_at ?? row.updated_at ?? ""),
  };
}

export async function getClosedBetaOpsBundle(): Promise<ClosedBetaOpsBundle> {
  await requireAdminProfile();

  const demo = getDemoClosedBetaOpsBundle();

  const [metrics, health, releaseNotes, usage, roadmap] = await Promise.all([
    loadMetricsFromPlatform(),
    loadSystemHealth(),
    loadReleaseNotes(),
    loadUsageAnalytics(),
    loadRoadmap(),
  ]);

  return {
    metrics: metrics ?? demo.metrics,
    health: health ?? demo.health,
    releaseNotes:
      releaseNotes && releaseNotes.length > 0
        ? releaseNotes
        : demo.releaseNotes,
    usage: usage ?? demo.usage,
    roadmap: roadmap && roadmap.length > 0 ? roadmap : demo.roadmap,
    betaPhaseLabel: CLOSED_BETA_PHASE_LABEL,
    appVersion: APP_VERSION,
  };
}

export function toClosedBetaAuthError(message: string): {
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
