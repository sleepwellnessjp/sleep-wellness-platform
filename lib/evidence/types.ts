/** Version 2.9 — Closed Beta Evidence Collection（実証データ収集） */

/** 1〜5 の評価スケール */
export type EvidenceRating = 1 | 2 | 3 | 4 | 5;

/** 次回予約の見込み */
export type NextAppointmentIntent = "yes" | "no" | "undecided";

/** 認定講師 — カウンセリング終了時 30秒アンケート */
export type SessionEvidenceSurvey = {
  id: string;
  /** 匿名化キー（個人特定不可） */
  anonymousKey: string;
  analysisId: string | null;
  clientAnonymousKey: string | null;
  satisfaction: EvidenceRating;
  understanding: EvidenceRating;
  homeworkLikelihood: EvidenceRating;
  nextAppointment: NextAppointmentIntent;
  freeComment: string;
  submittedAt: string;
  appVersion: string;
};

export type CreateSessionEvidenceInput = {
  analysisId?: string | null;
  clientId?: string | null;
  satisfaction: EvidenceRating;
  understanding: EvidenceRating;
  homeworkLikelihood: EvidenceRating;
  nextAppointment: NextAppointmentIntent;
  freeComment?: string;
};

/** クライアント — 翌朝アンケート */
export type MorningEvidenceSurvey = {
  id: string;
  anonymousKey: string;
  surveyDate: string;
  sleepSatisfaction: EvidenceRating;
  morningMood: EvidenceRating;
  daytimeCondition: EvidenceRating;
  freeComment: string;
  submittedAt: string;
  appVersion: string;
};

export type CreateMorningEvidenceInput = {
  surveyDate?: string;
  sleepSatisfaction: EvidenceRating;
  morningMood: EvidenceRating;
  daytimeCondition: EvidenceRating;
  freeComment?: string;
};

/** コメント分析（モック） */
export type EvidenceCommentTheme = {
  theme: string;
  mentionCount: number;
  sentiment: "positive" | "neutral" | "negative";
  sampleSnippet: string;
};

export type EvidenceCommentAnalysis = {
  isMock: boolean;
  summary: string;
  positiveShare: number;
  neutralShare: number;
  negativeShare: number;
  themes: EvidenceCommentTheme[];
  analyzedAt: string;
};

/** 本部 — 匿名集計 */
export type EvidenceAggregateSnapshot = {
  periodLabel: string;
  sampleSizeSession: number;
  sampleSizeMorning: number;
  /** 改善率（%） */
  improvementRate: number;
  /** 満足度平均（1–5 → %換算も併記用） */
  averageSatisfaction: number;
  satisfactionPercent: number;
  /** 継続率（%） */
  continuationRate: number;
  /** 宿題実施率（%） */
  homeworkCompletionRate: number;
  averageUnderstanding: number;
  averageHomeworkLikelihood: number;
  nextAppointmentYesRate: number;
  averageSleepSatisfaction: number;
  averageMorningMood: number;
  averageDaytimeCondition: number;
  commentAnalysis: EvidenceCommentAnalysis;
  updatedAt: string;
  appVersion: string;
  betaPhaseLabel: string;
};

export type EvidenceCollectionBundle = {
  aggregate: EvidenceAggregateSnapshot;
  recentSessionCount: number;
  recentMorningCount: number;
  /** 直近コメント件数（匿名・本文は本部に出さない） */
  recentCommentCount: number;
};
