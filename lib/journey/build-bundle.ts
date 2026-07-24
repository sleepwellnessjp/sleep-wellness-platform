import type { ClientHomework } from "@/lib/repositories/client-homeworks-repository";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import { generateJourneyAiCoach } from "./ai-coach";
import {
  ACHIEVEMENT_DEFINITIONS,
  achievementByCode,
  isJourneyStageId,
} from "./constants";
import {
  buildAchievementViews,
  buildStageViews,
  computeClientJourney,
  type JourneyComputeResult,
} from "./compute";
import type {
  AchievementCode,
  ClientJourneyBundle,
  JourneyStageId,
} from "./types";

export function toJapaneseJourneyError(message: string): {
  error: string;
  status: number;
} {
  if (/not authenticated|jwt|auth|ログイン/i.test(message)) {
    return { error: "ログインが必要です", status: 401 };
  }
  if (/permission|policy|rls|forbidden|権限/i.test(message)) {
    return { error: "この操作を行う権限がありません", status: 403 };
  }
  return { error: message || "処理に失敗しました", status: 400 };
}

function homeworkStreakFromList(homeworks: ClientHomework[]): number {
  const completedDates = new Set(
    homeworks
      .filter((item) => item.isCompleted && item.completedAt)
      .map((item) => item.completedAt!.slice(0, 10)),
  );
  if (completedDates.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (completedDates.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

function bundleFromComputed(params: {
  clientId: string;
  clientName: string;
  computed: JourneyComputeResult;
}): ClientJourneyBundle {
  const { computed } = params;
  const currentStage =
    computed.stages.find((s) => s.status === "current") ?? computed.stages[0];
  const aiCoach = generateJourneyAiCoach({
    clientName: params.clientName,
    currentStage,
    achievementRate: computed.achievementRate,
    improvementRate: computed.improvementRate,
    streakDays: computed.streakDays,
    nextGoal: computed.nextGoal,
    unlockedCount: computed.unlockedCodes.length,
    totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
  });

  return {
    clientId: params.clientId,
    clientName: params.clientName,
    stages: computed.stages,
    currentStage,
    achievementRate: computed.achievementRate,
    improvementRate: computed.improvementRate,
    streakDays: computed.streakDays,
    nextGoal: computed.nextGoal,
    scoreTrend: computed.scoreTrend,
    achievements: computed.achievements,
    aiCoach,
    lastSyncedAt: new Date().toISOString(),
  };
}

/** クライアント側でも使える純粋な Journey バンドル生成（サーバー依存なし） */
export function buildClientJourneyBundleFromData(params: {
  clientId: string;
  clientName: string;
  analyses: StoredAnalysis[];
  homeworks?: ClientHomework[];
  streakDays?: number;
}): ClientJourneyBundle {
  const homeworks = params.homeworks ?? [];
  const streakDays = params.streakDays ?? homeworkStreakFromList(homeworks);
  const computed = computeClientJourney({
    analyses: params.analyses,
    homeworks,
    streakDays,
  });
  return bundleFromComputed({
    clientId: params.clientId,
    clientName: params.clientName,
    computed,
  });
}

/** クライアントポータル用の空データフォールバック（デモ seed なし） */
export function getEmptyClientJourney(
  clientId: string,
  clientName: string,
): ClientJourneyBundle {
  return buildClientJourneyBundleFromData({
    clientId,
    clientName,
    analyses: [],
    homeworks: [],
    streakDays: 0,
  });
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
