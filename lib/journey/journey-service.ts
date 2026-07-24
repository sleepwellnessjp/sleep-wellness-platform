import { getClientManagementList } from "@/lib/client-management";
import {
  getCurrentProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import {
  loadClients,
} from "@/lib/repositories/client-repository";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  buildClientJourneyBundleFromData,
  toJapaneseJourneyError,
} from "./build-bundle";
import {
  achievementByCode,
  isJourneyStageId,
  stageDefinitionById,
} from "./constants";
import {
  buildAchievementViews,
  buildStageViews,
  computeClientJourney,
} from "./compute";
import {
  getDemoAdminJourneyDashboard,
  getDemoClientJourney,
  listDemoInstructorJourneyRoster,
} from "./demo-journey-store";
import type {
  AchievementCode,
  AdminJourneyDashboard,
  ClientJourneyBundle,
  InstructorJourneyRosterItem,
  JourneyStageId,
} from "./types";

export {
  buildClientJourneyBundleFromData,
  toJapaneseJourneyError,
};

async function persistJourneyProgress(params: {
  clientId: string;
  instructorId: string | null;
  bundle: ClientJourneyBundle;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("journey_progress").upsert(
    {
      client_id: params.clientId,
      instructor_id: params.instructorId,
      current_stage_id: params.bundle.currentStage.id,
      stage_status: "current",
      achievement_rate: params.bundle.achievementRate,
      improvement_rate: params.bundle.improvementRate,
      streak_days: params.bundle.streakDays,
      next_goal: params.bundle.nextGoal,
      score_trend: params.bundle.scoreTrend,
      last_synced_at: new Date().toISOString(),
      entered_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );

  if (error && !isMissingTableError(error)) {
    console.warn("[journey] persist progress failed", error.message);
  }

  const unlocked = params.bundle.achievements.filter((a) => a.unlocked);
  for (const item of unlocked) {
    const { error: achError } = await supabase
      .from("client_achievements")
      .upsert(
        {
          client_id: params.clientId,
          achievement_id: item.id,
          unlocked_at: item.unlockedAt ?? new Date().toISOString(),
          source: "auto",
        },
        { onConflict: "client_id,achievement_id", ignoreDuplicates: true },
      );
    if (achError && !isMissingTableError(achError)) {
      console.warn("[journey] persist achievement failed", achError.message);
    }
  }
}

export async function getClientJourneyBundle(params: {
  clientId: string;
  clientName: string;
  analyses: import("@/lib/repositories/client-repository").StoredAnalysis[];
  homeworks?: import("@/lib/repositories/client-homeworks-repository").ClientHomework[];
  streakDays?: number;
  instructorId?: string | null;
  persist?: boolean;
}): Promise<ClientJourneyBundle> {
  const bundle = buildClientJourneyBundleFromData(params);
  if (params.persist !== false) {
    await persistJourneyProgress({
      clientId: params.clientId,
      instructorId: params.instructorId ?? null,
      bundle,
    });
  }
  return bundle;
}

export async function listInstructorJourneyRoster(): Promise<
  InstructorJourneyRosterItem[]
> {
  if (!isSupabaseConfigured()) {
    return listDemoInstructorJourneyRoster();
  }

  try {
    const profile = await getCurrentProfile();
    if (!profile) throw new Error("ログインが必要です");

    const list = await getClientManagementList();
    if (list.clients.length === 0) {
      return listDemoInstructorJourneyRoster();
    }

    const stored = await loadClients();
    const byId = new Map(stored.map((c) => [c.id, c]));

    return list.clients.map((item) => {
      const full = byId.get(item.id);
      const analyses = full?.analyses ?? [];
      const computed = computeClientJourney({
        analyses,
        streakDays: Math.round(item.journeyProgress / 8),
      });
      const stage = stageDefinitionById(computed.currentStageId);
      return {
        clientId: item.id,
        clientName: item.name,
        avatarUrl: item.avatarUrl,
        sleepScore: item.sleepScore,
        currentStageId: stage.id,
        currentStageTitle: stage.title,
        currentStageSubtitle: stage.subtitle,
        stageNumber: stage.stageNumber,
        achievementRate: Math.max(
          computed.achievementRate,
          item.journeyProgress,
        ),
        improvementRate: computed.improvementRate,
        streakDays: computed.streakDays,
        unlockedAchievementCount: computed.unlockedCodes.length,
        lastSyncedAt: new Date().toISOString(),
      };
    });
  } catch (error) {
    if (error instanceof Error && /ログイン/.test(error.message)) throw error;
    return listDemoInstructorJourneyRoster();
  }
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export async function getAdminJourneyDashboard(): Promise<AdminJourneyDashboard> {
  await requireAdminProfile();

  if (!isSupabaseConfigured()) {
    return getDemoAdminJourneyDashboard();
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return getDemoAdminJourneyDashboard();

  try {
    const { data: progressRows, error: progressError } = await supabase
      .from("journey_progress")
      .select(
        "client_id, instructor_id, current_stage_id, achievement_rate, improvement_rate, streak_days, updated_at",
      );

    if (progressError) {
      if (isMissingTableError(progressError)) {
        return getDemoAdminJourneyDashboard();
      }
      throw progressError;
    }

    const rows = progressRows ?? [];
    if (rows.length === 0) {
      return getDemoAdminJourneyDashboard();
    }

    const instructorIds = Array.from(
      new Set(
        rows
          .map((row) => (row.instructor_id ? String(row.instructor_id) : null))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", instructorIds.length > 0 ? instructorIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        String(p.id),
        {
          name: p.display_name ? String(p.display_name) : "認定講師",
          email: p.email ? String(p.email) : null,
        },
      ]),
    );

    const byInstructor = new Map<
      string,
      {
        improvement: number[];
        achievement: number[];
        stages: number[];
        completed: number;
        total: number;
        activeRecent: number;
      }
    >();

    const fortyFiveDaysAgo = Date.now() - 45 * 86400000;

    for (const row of rows) {
      const instructorId = row.instructor_id
        ? String(row.instructor_id)
        : "unassigned";
      const bucket = byInstructor.get(instructorId) ?? {
        improvement: [],
        achievement: [],
        stages: [],
        completed: 0,
        total: 0,
        activeRecent: 0,
      };
      bucket.total += 1;
      const stageId = String(row.current_stage_id);
      const stageNumber = isJourneyStageId(stageId)
        ? stageDefinitionById(stageId).stageNumber
        : 1;
      bucket.stages.push(stageNumber);
      if (stageNumber >= 5) bucket.completed += 1;
      if (row.improvement_rate != null) {
        bucket.improvement.push(Number(row.improvement_rate));
      }
      bucket.achievement.push(Number(row.achievement_rate ?? 0));
      const updated = new Date(String(row.updated_at ?? "")).getTime();
      if (!Number.isNaN(updated) && updated >= fortyFiveDaysAgo) {
        bucket.activeRecent += 1;
      }
      byInstructor.set(instructorId, bucket);
    }

    const instructors = Array.from(byInstructor.entries()).map(
      ([instructorId, bucket]) => {
        const profile = profileMap.get(instructorId);
        return {
          instructorId,
          instructorName: profile?.name ?? "認定講師",
          instructorEmail: profile?.email ?? null,
          clientCount: bucket.total,
          averageImprovementRate: avg(bucket.improvement),
          retentionRate:
            bucket.total === 0
              ? null
              : Math.round((bucket.activeRecent / bucket.total) * 100),
          completionRate:
            bucket.total === 0
              ? null
              : Math.round((bucket.completed / bucket.total) * 100),
          averageAchievementRate: avg(bucket.achievement),
          averageStageNumber:
            bucket.stages.length === 0
              ? null
              : Math.round(
                  (bucket.stages.reduce((a, b) => a + b, 0) /
                    bucket.stages.length) *
                    10,
                ) / 10,
        };
      },
    );

    return {
      summary: {
        instructorCount: instructors.length,
        clientCount: rows.length,
        averageImprovementRate: avg(
          instructors
            .map((i) => i.averageImprovementRate)
            .filter((v): v is number => v != null),
        ),
        averageRetentionRate: avg(
          instructors
            .map((i) => i.retentionRate)
            .filter((v): v is number => v != null),
        ),
        averageCompletionRate: avg(
          instructors
            .map((i) => i.completionRate)
            .filter((v): v is number => v != null),
        ),
      },
      instructors,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return getDemoAdminJourneyDashboard();
  }
}

/** クライアントポータル / デモ用の同期なしビルド */
export function getFallbackClientJourney(
  clientId: string,
  clientName?: string,
): ClientJourneyBundle {
  return getDemoClientJourney(clientId, clientName);
}

export function mapUnlockedCodesToViews(codes: AchievementCode[]) {
  return buildAchievementViews(codes);
}

export function stagesForNumber(stageNumber: number) {
  return buildStageViews(stageNumber);
}

export function resolveStageId(value: string): JourneyStageId {
  return isJourneyStageId(value) ? value : "stage_1";
}

export function achievementTitle(code: AchievementCode): string {
  return achievementByCode(code).title;
}
