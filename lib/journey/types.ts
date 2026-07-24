export type JourneyStageCode =
  | "sleep_awareness"
  | "sleep_balance"
  | "sleep_recovery"
  | "sleep_performance"
  | "sleep_wellness";

export type JourneyStageId =
  | "stage_1"
  | "stage_2"
  | "stage_3"
  | "stage_4"
  | "stage_5";

export type JourneyStageStatus = "locked" | "current" | "completed";

export type AchievementCode =
  | "first_analysis"
  | "streak_7"
  | "streak_30"
  | "efficiency_90"
  | "hrv_improved"
  | "stress_improved"
  | "melatonin_yoga_streak";

export type AchievementCategory =
  | "analysis"
  | "streak"
  | "metric"
  | "practice"
  | "general";

export type AchievementIconKey =
  | "spark"
  | "flame"
  | "moon"
  | "pulse"
  | "leaf"
  | "lotus"
  | "star";

export type JourneyStageDefinition = {
  id: JourneyStageId;
  stageNumber: number;
  code: JourneyStageCode;
  title: string;
  subtitle: string;
  description: string;
  sortOrder: number;
};

export type AchievementDefinition = {
  id: string;
  code: AchievementCode;
  title: string;
  description: string;
  category: AchievementCategory;
  iconKey: AchievementIconKey;
  sortOrder: number;
};

export type JourneyScoreTrendPoint = {
  date: string;
  label: string;
  score: number | null;
};

export type JourneyStageView = JourneyStageDefinition & {
  status: JourneyStageStatus;
};

export type ClientAchievementView = AchievementDefinition & {
  unlocked: boolean;
  unlockedAt: string | null;
};

export type JourneyAiCoach = {
  encouragement: string;
  suggestion: string;
  nextGoal: string;
  source: "rules" | "gpt";
};

export type ClientJourneyBundle = {
  clientId: string;
  clientName: string;
  stages: JourneyStageView[];
  currentStage: JourneyStageView;
  achievementRate: number;
  improvementRate: number | null;
  streakDays: number;
  nextGoal: string;
  scoreTrend: JourneyScoreTrendPoint[];
  achievements: ClientAchievementView[];
  aiCoach: JourneyAiCoach;
  lastSyncedAt: string;
};

export type InstructorJourneyRosterItem = {
  clientId: string;
  clientName: string;
  avatarUrl: string | null;
  sleepScore: number | null;
  currentStageId: JourneyStageId;
  currentStageTitle: string;
  currentStageSubtitle: string;
  stageNumber: number;
  achievementRate: number;
  improvementRate: number | null;
  streakDays: number;
  unlockedAchievementCount: number;
  lastSyncedAt: string;
};

export type AdminInstructorJourneyStats = {
  instructorId: string;
  instructorName: string;
  instructorEmail: string | null;
  clientCount: number;
  averageImprovementRate: number | null;
  retentionRate: number | null;
  completionRate: number | null;
  averageAchievementRate: number | null;
  averageStageNumber: number | null;
};

export type AdminJourneyDashboard = {
  summary: {
    instructorCount: number;
    clientCount: number;
    averageImprovementRate: number | null;
    averageRetentionRate: number | null;
    averageCompletionRate: number | null;
  };
  instructors: AdminInstructorJourneyStats[];
  generatedAt: string;
};
