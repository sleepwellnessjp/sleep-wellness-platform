/**
 * Version 2.8 Closed Beta Operation — Supabase サービス
 * テーブル未作成時はデモデータへフォールバック。
 */

import { APP_VERSION } from "@/lib/app-version";
import {
  CLOSED_BETA_OPERATION_PHASE_LABEL,
  computeBetaOperationReadiness,
  isBacklogStatus,
  isBugSeverity,
  isBugStatus,
  isFeatureRequestCategory,
  isFeatureRequestPriority,
  isFeatureRequestStatus,
} from "./operation-constants";
import {
  getDemoClosedBetaOperationBundle,
  updateDemoBacklogItem,
  updateDemoBugReport,
  updateDemoFeatureRequest,
} from "./demo-beta-operation-store";
import type {
  BetaKpiMetrics,
  BetaKpiWeekPoint,
  BugReportRecord,
  ClientOutcomeStageRow,
  ClientOutcomesSnapshot,
  ClosedBetaOperationBundle,
  FeatureRequestRecord,
  ProductBacklogItem,
  UpdateBacklogItemInput,
  UpdateBugReportInput,
  UpdateFeatureRequestInput,
  WeeklyReportRecord,
} from "./operation-types";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function mapFeatureRequest(row: Record<string, unknown>): FeatureRequestRecord {
  const category = String(row.category ?? "other");
  const priority = String(row.priority ?? "medium");
  const status = String(row.status ?? "open");
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: isFeatureRequestCategory(category) ? category : "other",
    priority: isFeatureRequestPriority(priority) ? priority : "medium",
    voteCount: Number(row.vote_count ?? 0),
    status: isFeatureRequestStatus(status) ? status : "open",
    plannedFor:
      row.planned_for == null || row.planned_for === ""
        ? null
        : String(row.planned_for),
    submittedBy: String(row.submitted_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapBugReport(row: Record<string, unknown>): BugReportRecord {
  const severity = String(row.severity ?? "medium");
  const status = String(row.status ?? "open");
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    severity: isBugSeverity(severity) ? severity : "medium",
    status: isBugStatus(status) ? status : "open",
    reporterName: String(row.reporter_name ?? ""),
    affectedScreen: String(row.affected_screen ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    resolvedAt:
      row.resolved_at == null || row.resolved_at === ""
        ? null
        : String(row.resolved_at),
  };
}

function mapWeeklyReport(row: Record<string, unknown>): WeeklyReportRecord {
  return {
    id: String(row.id),
    weekLabel: String(row.week_label ?? ""),
    weekStart: String(row.week_start ?? "").slice(0, 10),
    weekEnd: String(row.week_end ?? "").slice(0, 10),
    achievements: asStringArray(row.achievements),
    challenges: asStringArray(row.challenges),
    improvementProposals: asStringArray(row.improvement_proposals),
    isMock: Boolean(row.is_mock ?? true),
    generatedAt: String(row.generated_at ?? row.created_at ?? ""),
  };
}

function mapBacklogItem(row: Record<string, unknown>): ProductBacklogItem {
  const status = String(row.status ?? "todo");
  const priority = String(row.priority ?? "medium");
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    status: isBacklogStatus(status) ? status : "todo",
    priority: isFeatureRequestPriority(priority) ? priority : "medium",
    module: String(row.module ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapKpiFromRow(row: Record<string, unknown>): BetaKpiMetrics {
  const seriesRaw = Array.isArray(row.weekly_series) ? row.weekly_series : [];
  const weeklySeries: BetaKpiWeekPoint[] = seriesRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const s = item as Record<string, unknown>;
      return {
        weekLabel: String(s.weekLabel ?? s.week_label ?? ""),
        analyses: Number(s.analyses ?? 0),
        newClients: Number(s.newClients ?? s.new_clients ?? 0),
        activeInstructors: Number(
          s.activeInstructors ?? s.active_instructors ?? 0,
        ),
      } satisfies BetaKpiWeekPoint;
    })
    .filter((item): item is BetaKpiWeekPoint => item !== null);

  return {
    activeCertifiedInstructors: Number(
      row.active_certified_instructors ?? 0,
    ),
    activeClients: Number(row.active_clients ?? 0),
    weeklyAnalysisCount: Number(row.weekly_analysis_count ?? 0),
    averageContinuationRate: Number(row.average_continuation_rate ?? 0),
    averageImprovementRate: Number(row.average_improvement_rate ?? 0),
    feedbackResponseRate: Number(row.feedback_response_rate ?? 0),
    weeklyNewRegistrations: Number(row.weekly_new_registrations ?? 0),
    weeklySeries,
    periodLabel: String(row.period_label ?? "今週（週次集計）"),
    updatedAt: String(row.captured_at ?? row.updated_at ?? ""),
  };
}

async function loadKpi(): Promise<BetaKpiMetrics | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("beta_metrics")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[beta-operation] beta_metrics:", error.message);
    return null;
  }
  if (!data) return null;
  return mapKpiFromRow(data as Record<string, unknown>);
}

async function loadFeatureRequests(): Promise<FeatureRequestRecord[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("feature_requests")
    .select("*")
    .order("vote_count", { ascending: false });

  if (error) {
    console.error("[beta-operation] feature_requests:", error.message);
    return null;
  }
  return (data ?? []).map((row) =>
    mapFeatureRequest(row as Record<string, unknown>),
  );
}

async function loadBugReports(): Promise<BugReportRecord[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("bug_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[beta-operation] bug_reports:", error.message);
    return null;
  }
  return (data ?? []).map((row) =>
    mapBugReport(row as Record<string, unknown>),
  );
}

async function loadWeeklyReports(): Promise<WeeklyReportRecord[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("week_start", { ascending: false });

  if (error) {
    console.error("[beta-operation] weekly_reports:", error.message);
    return null;
  }
  return (data ?? []).map((row) =>
    mapWeeklyReport(row as Record<string, unknown>),
  );
}

async function loadProductBacklog(): Promise<ProductBacklogItem[] | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("product_backlog")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[beta-operation] product_backlog:", error.message);
    return null;
  }
  return (data ?? []).map((row) =>
    mapBacklogItem(row as Record<string, unknown>),
  );
}

async function loadOutcomesFromPlatform(): Promise<ClientOutcomesSnapshot | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const demo = getDemoClosedBetaOperationBundle().outcomes;

  try {
    const [journey, homeworks, analyses] = await Promise.all([
      supabase
        .from("journey_progress")
        .select("streak_days, stage_status, current_stage_id"),
      supabase.from("client_homeworks").select("status, completed_at"),
      supabase
        .from("sleep_analyses")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const journeyRows = (journey.data ?? []) as Array<{
      streak_days?: number | null;
      stage_status?: string | null;
      current_stage_id?: string | null;
    }>;
    const activeJourney = journeyRows.filter(
      (row) =>
        row.stage_status !== "withdrawn" && row.stage_status !== "cancelled",
    );
    const continuing = activeJourney.filter(
      (row) => Number(row.streak_days ?? 0) >= 7,
    ).length;
    const continuationRate =
      activeJourney.length > 0
        ? Math.round((continuing / activeJourney.length) * 100)
        : demo.continuationRate;

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
    const homeworkAchievementRate =
      hwRows.length > 0
        ? Math.round((completedHw / hwRows.length) * 100)
        : demo.homeworkAchievementRate;

    const stageMap = new Map<string, { total: number; progressing: number }>();
    for (const row of activeJourney) {
      const stage = String(row.current_stage_id ?? "未設定");
      const current = stageMap.get(stage) ?? { total: 0, progressing: 0 };
      current.total += 1;
      if (Number(row.streak_days ?? 0) >= 3) current.progressing += 1;
      stageMap.set(stage, current);
    }
    const byStage: ClientOutcomeStageRow[] =
      stageMap.size > 0
        ? Array.from(stageMap.entries()).map(([stage, stats]) => ({
            stage,
            clientCount: stats.total,
            progressPercent:
              stats.total > 0
                ? Math.round((stats.progressing / stats.total) * 100)
                : 0,
          }))
        : demo.byStage;

    const journeyProgressRate =
      byStage.length > 0
        ? Math.round(
            byStage.reduce((sum, row) => sum + row.progressPercent, 0) /
              byStage.length,
          )
        : demo.journeyProgressRate;

    const analysisCount = Array.isArray(analyses.data)
      ? analyses.data.length
      : 0;
    const sleepImprovementRate =
      analysisCount > 0
        ? Math.min(
            100,
            Math.round(
              homeworkAchievementRate * 0.4 +
                continuationRate * 0.35 +
                journeyProgressRate * 0.25,
            ),
          )
        : demo.sleepImprovementRate;

    return {
      sleepImprovementRate,
      continuationRate,
      homeworkAchievementRate,
      journeyProgressRate,
      sampleSize: activeJourney.length || demo.sampleSize,
      byStage,
      periodLabel: "直近 4 週（集計）",
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[beta-operation] outcomes fallback:", error);
    return null;
  }
}

export async function getClosedBetaOperationBundle(): Promise<ClosedBetaOperationBundle> {
  await requireAdminProfile();

  const demo = getDemoClosedBetaOperationBundle();

  const [kpi, featureRequests, bugReports, outcomes, weeklyReports, backlog] =
    await Promise.all([
      loadKpi(),
      loadFeatureRequests(),
      loadBugReports(),
      loadOutcomesFromPlatform(),
      loadWeeklyReports(),
      loadProductBacklog(),
    ]);

  const resolvedKpi = kpi ?? demo.kpi;
  const resolvedFeatures =
    featureRequests && featureRequests.length > 0
      ? featureRequests
      : demo.featureRequests;
  const resolvedBugs =
    bugReports && bugReports.length > 0 ? bugReports : demo.bugReports;
  const resolvedOutcomes = outcomes ?? demo.outcomes;
  const resolvedWeekly =
    weeklyReports && weeklyReports.length > 0
      ? weeklyReports
      : demo.weeklyReports;
  const resolvedBacklog =
    backlog && backlog.length > 0 ? backlog : demo.productBacklog;

  return {
    kpi: resolvedKpi,
    featureRequests: resolvedFeatures,
    bugReports: resolvedBugs,
    outcomes: resolvedOutcomes,
    weeklyReports: resolvedWeekly,
    productBacklog: resolvedBacklog,
    readinessPercent: computeBetaOperationReadiness({
      hasKpi: resolvedKpi.activeCertifiedInstructors > 0,
      hasFeatureRequests: resolvedFeatures.length > 0,
      hasBugTracker: resolvedBugs.length > 0,
      hasOutcomes: resolvedOutcomes.sampleSize > 0,
      hasWeeklyReport: resolvedWeekly.length > 0,
      hasBacklog: resolvedBacklog.length > 0,
    }),
    betaPhaseLabel: CLOSED_BETA_OPERATION_PHASE_LABEL,
    appVersion: APP_VERSION,
  };
}

export async function updateFeatureRequestAdmin(
  input: UpdateFeatureRequestInput,
): Promise<FeatureRequestRecord> {
  await requireAdminProfile();

  if (!isSupabaseConfigured()) {
    return updateDemoFeatureRequest(input);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return updateDemoFeatureRequest(input);

  const patch: {
    status?: string;
    priority?: string;
    planned_for?: string | null;
    vote_count?: number;
    updated_at?: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) patch.status = input.status;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.plannedFor !== undefined) patch.planned_for = input.plannedFor;
  if (input.voteCount !== undefined) patch.vote_count = input.voteCount;

  const { data, error } = await supabase
    .from("feature_requests")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("[beta-operation] feature update:", error?.message);
    return updateDemoFeatureRequest(input);
  }
  return mapFeatureRequest(data as Record<string, unknown>);
}

export async function updateBugReportAdmin(
  input: UpdateBugReportInput,
): Promise<BugReportRecord> {
  await requireAdminProfile();

  if (!isSupabaseConfigured()) {
    return updateDemoBugReport(input);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return updateDemoBugReport(input);

  const patch: {
    severity?: string;
    status?: string;
    resolved_at?: string | null;
    updated_at?: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (input.severity !== undefined) patch.severity = input.severity;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.resolved_at =
      input.status === "resolved" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("bug_reports")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("[beta-operation] bug update:", error?.message);
    return updateDemoBugReport(input);
  }
  return mapBugReport(data as Record<string, unknown>);
}

export async function updateBacklogItemAdmin(
  input: UpdateBacklogItemInput,
): Promise<ProductBacklogItem> {
  await requireAdminProfile();

  if (!isSupabaseConfigured()) {
    return updateDemoBacklogItem(input);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return updateDemoBacklogItem(input);

  const patch: {
    status?: string;
    priority?: string;
    updated_at?: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) patch.status = input.status;
  if (input.priority !== undefined) patch.priority = input.priority;

  const { data, error } = await supabase
    .from("product_backlog")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("[beta-operation] backlog update:", error?.message);
    return updateDemoBacklogItem(input);
  }
  return mapBacklogItem(data as Record<string, unknown>);
}

export function toBetaOperationAuthError(message: string): {
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
