import { DEMO_CLIENTS, DEMO_INSTRUCTOR } from "@/lib/demo-clients";
import { generateJourneyAiCoach } from "./ai-coach";
import {
  ACHIEVEMENT_DEFINITIONS,
  JOURNEY_STAGE_DEFINITIONS,
  stageDefinitionById,
  stageDefinitionByNumber,
} from "./constants";
import { buildAchievementViews, buildStageViews } from "./compute";
import type {
  AchievementCode,
  AdminJourneyDashboard,
  ClientJourneyBundle,
  InstructorJourneyRosterItem,
  JourneyStageId,
} from "./types";

type DemoProgressSeed = {
  clientId: string;
  stageNumber: number;
  achievementRate: number;
  improvementRate: number | null;
  streakDays: number;
  unlocked: AchievementCode[];
  nextGoal?: string;
};

const DEMO_SEEDS: DemoProgressSeed[] = [
  {
    clientId: "client-demo-1",
    stageNumber: 4,
    achievementRate: 72,
    improvementRate: 18,
    streakDays: 12,
    unlocked: [
      "first_analysis",
      "streak_7",
      "efficiency_90",
      "hrv_improved",
      "melatonin_yoga_streak",
    ],
  },
  {
    clientId: "client-demo-2",
    stageNumber: 2,
    achievementRate: 38,
    improvementRate: 8,
    streakDays: 4,
    unlocked: ["first_analysis"],
  },
  {
    clientId: "client-demo-3",
    stageNumber: 5,
    achievementRate: 94,
    improvementRate: 24,
    streakDays: 21,
    unlocked: [
      "first_analysis",
      "streak_7",
      "streak_30",
      "efficiency_90",
      "hrv_improved",
      "stress_improved",
      "melatonin_yoga_streak",
    ],
  },
  {
    clientId: "client-demo-4",
    stageNumber: 3,
    achievementRate: 55,
    improvementRate: 12,
    streakDays: 8,
    unlocked: ["first_analysis", "streak_7", "stress_improved"],
  },
  {
    clientId: "client-demo-5",
    stageNumber: 1,
    achievementRate: 18,
    improvementRate: null,
    streakDays: 1,
    unlocked: ["first_analysis"],
  },
];

function seedForClient(clientId: string): DemoProgressSeed {
  const found = DEMO_SEEDS.find((item) => item.clientId === clientId);
  if (found) return found;
  const demo = DEMO_CLIENTS.find((item) => item.id === clientId);
  const stageNumber = Math.max(
    1,
    Math.min(5, Math.ceil((demo?.journeyProgress ?? 20) / 20)),
  );
  return {
    clientId,
    stageNumber,
    achievementRate: demo?.journeyProgress ?? 20,
    improvementRate: demo?.sleepScore != null ? Math.max(0, demo.sleepScore - 55) : null,
    streakDays: Math.max(0, Math.round((demo?.journeyProgress ?? 0) / 8)),
    unlocked: ["first_analysis"] as AchievementCode[],
  };
}

function scoreTrendFor(seed: DemoProgressSeed) {
  const base = 58 + seed.stageNumber * 4;
  return [6, 5, 4, 3, 2, 1, 0].map((daysAgo, index) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const iso = date.toISOString().slice(0, 10);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    return {
      date: iso,
      label,
      score: Math.min(95, base + index * 2 + (seed.improvementRate ?? 0) / 4),
    };
  });
}

export function getDemoClientJourney(
  clientId: string,
  clientName?: string,
): ClientJourneyBundle {
  const seed = seedForClient(clientId);
  const stages = buildStageViews(seed.stageNumber);
  const current = stages.find((s) => s.status === "current") ?? stages[0];
  const nextGoal =
    seed.nextGoal ??
    (seed.stageNumber >= 5
      ? "到達したリズムを大切に、週1回の振り返りを続けましょう"
      : stageDefinitionByNumber(seed.stageNumber + 1).subtitle +
        "へ向けて、今日できる一歩を続けましょう");
  const achievements = buildAchievementViews(seed.unlocked, {
    first_analysis: new Date(Date.now() - 40 * 86400000).toISOString(),
    streak_7: new Date(Date.now() - 10 * 86400000).toISOString(),
    streak_30: new Date(Date.now() - 2 * 86400000).toISOString(),
    efficiency_90: new Date(Date.now() - 8 * 86400000).toISOString(),
    hrv_improved: new Date(Date.now() - 6 * 86400000).toISOString(),
    stress_improved: new Date(Date.now() - 5 * 86400000).toISOString(),
    melatonin_yoga_streak: new Date(Date.now() - 3 * 86400000).toISOString(),
  });
  const aiCoach = generateJourneyAiCoach({
    clientName: clientName ?? DEMO_CLIENTS.find((c) => c.id === clientId)?.name,
    currentStage: current,
    achievementRate: seed.achievementRate,
    improvementRate: seed.improvementRate,
    streakDays: seed.streakDays,
    nextGoal,
    unlockedCount: seed.unlocked.length,
    totalAchievements: ACHIEVEMENT_DEFINITIONS.length,
  });

  return {
    clientId,
    clientName:
      clientName ??
      DEMO_CLIENTS.find((c) => c.id === clientId)?.name ??
      "デモクライアント",
    stages,
    currentStage: current,
    achievementRate: seed.achievementRate,
    improvementRate: seed.improvementRate,
    streakDays: seed.streakDays,
    nextGoal,
    scoreTrend: scoreTrendFor(seed),
    achievements,
    aiCoach,
    lastSyncedAt: new Date().toISOString(),
  };
}

export function listDemoInstructorJourneyRoster(): InstructorJourneyRosterItem[] {
  return DEMO_CLIENTS.map((client) => {
    const seed = seedForClient(client.id);
    const stage = stageDefinitionByNumber(seed.stageNumber);
    return {
      clientId: client.id,
      clientName: client.name,
      avatarUrl: null,
      sleepScore: client.sleepScore,
      currentStageId: stage.id,
      currentStageTitle: stage.title,
      currentStageSubtitle: stage.subtitle,
      stageNumber: stage.stageNumber,
      achievementRate: seed.achievementRate,
      improvementRate: seed.improvementRate,
      streakDays: seed.streakDays,
      unlockedAchievementCount: seed.unlocked.length,
      lastSyncedAt: new Date().toISOString(),
    };
  });
}

export function getDemoAdminJourneyDashboard(): AdminJourneyDashboard {
  const roster = listDemoInstructorJourneyRoster();
  const avg = (values: number[]) =>
    values.length === 0
      ? null
      : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const improvementRates = roster
    .map((r) => r.improvementRate)
    .filter((v): v is number => v != null);
  const completionRate = Math.round(
    (roster.filter((r) => r.stageNumber >= 5).length / Math.max(1, roster.length)) *
      100,
  );
  const retentionRate = 78;

  return {
    summary: {
      instructorCount: 3,
      clientCount: roster.length,
      averageImprovementRate: avg(improvementRates),
      averageRetentionRate: retentionRate,
      averageCompletionRate: completionRate,
    },
    instructors: [
      {
        instructorId: DEMO_INSTRUCTOR.id,
        instructorName: DEMO_INSTRUCTOR.name,
        instructorEmail: "mayumi.yamada@swij.demo",
        clientCount: roster.length,
        averageImprovementRate: avg(improvementRates),
        retentionRate,
        completionRate,
        averageAchievementRate: avg(roster.map((r) => r.achievementRate)),
        averageStageNumber:
          Math.round(
            (roster.reduce((sum, r) => sum + r.stageNumber, 0) /
              Math.max(1, roster.length)) *
              10,
          ) / 10,
      },
      {
        instructorId: "instructor-demo-2",
        instructorName: "高橋 健",
        instructorEmail: "ken.takahashi@swij.demo",
        clientCount: 8,
        averageImprovementRate: 14,
        retentionRate: 71,
        completionRate: 25,
        averageAchievementRate: 48,
        averageStageNumber: 2.6,
      },
      {
        instructorId: "instructor-demo-3",
        instructorName: "伊藤 さくら",
        instructorEmail: "sakura.ito@swij.demo",
        clientCount: 6,
        averageImprovementRate: 21,
        retentionRate: 84,
        completionRate: 33,
        averageAchievementRate: 61,
        averageStageNumber: 3.2,
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function demoStageTitle(stageId: JourneyStageId): string {
  return stageDefinitionById(stageId).title;
}

export function listDemoStages() {
  return JOURNEY_STAGE_DEFINITIONS;
}
