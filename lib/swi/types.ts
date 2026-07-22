/**
 * Sleep Wellness Intelligence (SWI) — 匿名集計 Insights の型定義。
 * 個人を特定できるフィールド（氏名・メール等）は含めない。
 */

export type SwiScope = "platform" | "instructor";

export type SwiAgeBand =
  | "20s"
  | "30s"
  | "40s"
  | "50s"
  | "60plus"
  | "unknown";

export type SwiGenderBucket = "female" | "male" | "other" | "unknown";

export type SwiOverallStats = {
  clientCount: number;
  analysisCount: number;
  averageSleepWellnessScore: number | null;
  averageSleepDurationHours: number | null;
  averageSleepEfficiency: number | null;
  averageHrv: number | null;
  averageStress: number | null;
};

export type SwiInterventionRank = {
  id: string;
  label: string;
  sampleSize: number;
  improvementRate: number | null;
  averageScoreDelta: number | null;
};

export type SwiAgeBandStat = {
  band: SwiAgeBand;
  label: string;
  clientCount: number;
  averageScore: number | null;
  improvementRate: number | null;
};

export type SwiGenderStat = {
  gender: SwiGenderBucket;
  label: string;
  clientCount: number;
  analysisCount: number;
  averageScore: number | null;
  averageSleepEfficiency: number | null;
  improvementRate: number | null;
};

export type SwiRetentionWindow = {
  days: 30 | 60 | 90;
  label: string;
  eligibleCount: number;
  retainedCount: number;
  rate: number | null;
};

export type SwiHomeworkStat = {
  title: string;
  assignedCount: number;
  completedCount: number;
  completionRate: number | null;
  /** 当該宿題を持つクライアントの Score 改善率（ルールベース） */
  improvementRate: number | null;
};

export type SwiJourneyPatternId =
  | "steady_climb"
  | "early_gain_plateau"
  | "recovery_after_dip"
  | "volatile"
  | "stable_high"
  | "needs_attention"
  | "insufficient_data";

export type SwiJourneyPattern = {
  id: SwiJourneyPatternId;
  label: string;
  description: string;
  clientCount: number;
  sharePercent: number | null;
};

/**
 * SWI Insights 全体レスポンス。
 * source: rules = 現行ルール集計 / ai = 将来の AI 分析差し替え想定
 */
export type SwiInsightsOverview = {
  scope: SwiScope;
  generatedAt: string;
  source: "rules" | "ai";
  overall: SwiOverallStats;
  interventionRanking: SwiInterventionRank[];
  ageBands: SwiAgeBandStat[];
  genderComparison: SwiGenderStat[];
  retention: SwiRetentionWindow[];
  homeworkAchievement: SwiHomeworkStat[];
  journeyPatterns: SwiJourneyPattern[];
};
