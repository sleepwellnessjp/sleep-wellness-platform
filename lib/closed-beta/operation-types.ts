/** Version 2.8 — Closed Beta Operation（PDCA 運営） */

/** Module1 — Beta KPI */
export type BetaKpiWeekPoint = {
  weekLabel: string;
  analyses: number;
  newClients: number;
  activeInstructors: number;
};

export type BetaKpiMetrics = {
  activeCertifiedInstructors: number;
  activeClients: number;
  weeklyAnalysisCount: number;
  averageContinuationRate: number;
  averageImprovementRate: number;
  feedbackResponseRate: number;
  weeklyNewRegistrations: number;
  weeklySeries: BetaKpiWeekPoint[];
  periodLabel: string;
  updatedAt: string;
};

/** Module2 — Feature Requests */
export type FeatureRequestCategory =
  | "ux"
  | "analysis"
  | "ai"
  | "report"
  | "journey"
  | "homework"
  | "other";

export type FeatureRequestPriority = "critical" | "high" | "medium" | "low";

export type FeatureRequestStatus =
  | "open"
  | "planned"
  | "in_progress"
  | "completed"
  | "deferred";

export type FeatureRequestRecord = {
  id: string;
  title: string;
  description: string;
  category: FeatureRequestCategory;
  priority: FeatureRequestPriority;
  voteCount: number;
  status: FeatureRequestStatus;
  plannedFor: string | null;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateFeatureRequestInput = {
  id: string;
  status?: FeatureRequestStatus;
  priority?: FeatureRequestPriority;
  plannedFor?: string | null;
  voteCount?: number;
};

/** Module3 — Bug Tracker */
export type BugSeverity = "critical" | "high" | "medium" | "low";

export type BugStatus =
  | "open"
  | "investigating"
  | "fixing"
  | "resolved"
  | "wontfix";

export type BugReportRecord = {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  reporterName: string;
  affectedScreen: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type UpdateBugReportInput = {
  id: string;
  status?: BugStatus;
  severity?: BugSeverity;
};

/** Module4 — Client Outcomes */
export type ClientOutcomeStageRow = {
  stage: string;
  progressPercent: number;
  clientCount: number;
};

export type ClientOutcomesSnapshot = {
  sleepImprovementRate: number;
  continuationRate: number;
  homeworkAchievementRate: number;
  journeyProgressRate: number;
  sampleSize: number;
  byStage: ClientOutcomeStageRow[];
  periodLabel: string;
  updatedAt: string;
};

/** Module5 — Weekly Report */
export type WeeklyReportRecord = {
  id: string;
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  achievements: string[];
  challenges: string[];
  improvementProposals: string[];
  isMock: boolean;
  generatedAt: string;
};

/** Module6 — Product Backlog */
export type BacklogStatus = "todo" | "in_progress" | "done" | "on_hold";

export type ProductBacklogItem = {
  id: string;
  title: string;
  summary: string;
  status: BacklogStatus;
  priority: FeatureRequestPriority;
  module: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type UpdateBacklogItemInput = {
  id: string;
  status?: BacklogStatus;
  priority?: FeatureRequestPriority;
};

export type ClosedBetaOperationBundle = {
  kpi: BetaKpiMetrics;
  featureRequests: FeatureRequestRecord[];
  bugReports: BugReportRecord[];
  outcomes: ClientOutcomesSnapshot;
  weeklyReports: WeeklyReportRecord[];
  productBacklog: ProductBacklogItem[];
  /** 本部運営準備率（0–100） */
  readinessPercent: number;
  betaPhaseLabel: string;
  appVersion: string;
};
