/** Version 2.4 — Closed Beta 運営モード */

export type HealthStatus = "operational" | "degraded" | "outage" | "maintenance";

export type RoadmapHorizon = "v2_5" | "v3_0" | "coming_soon";

export type RoadmapStatus = "planned" | "in_progress" | "shipped" | "deferred";

export type BetaDashboardMetrics = {
  /** 週次: 利用講師数 */
  certifiedInstructorCount: number;
  /** 週次: クライアント数 */
  registeredClientCount: number;
  /** 週次: 分析件数 */
  analysisCount: number;
  aiAnalysisCount: number;
  reportCount: number;
  /** 継続率（%） */
  journeyContinuationRate: number;
  /** 改善率（%） */
  improvementRate: number;
  homeworkCompletionRate: number;
  feedbackCount: number;
  /** 週次: バグ件数 */
  bugCount: number;
  periodLabel: string;
  updatedAt: string;
};

export type SystemHealthComponent = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  latencyMs: number | null;
  updatedAt: string;
};

export type SystemHealthSnapshot = {
  overall: HealthStatus;
  overallLabel: string;
  utilizationPercent: number;
  components: SystemHealthComponent[];
  checkedAt: string;
};

export type ReleaseNoteRecord = {
  id: string;
  version: string;
  releasedAt: string;
  title: string;
  changes: string[];
  improvements: string[];
  isCurrent: boolean;
  sortOrder: number;
};

export type UsageScreenStat = {
  screen: string;
  label: string;
  sessions: number;
  sharePercent: number;
};

export type UsageDropOffPoint = {
  screen: string;
  label: string;
  dropOffPercent: number;
};

export type UsageAnalyticsSnapshot = {
  topScreens: UsageScreenStat[];
  averageSessionMinutes: number;
  mobileSharePercent: number;
  pcSharePercent: number;
  tabletSharePercent: number;
  dropOffPoints: UsageDropOffPoint[];
  periodLabel: string;
  isMock: boolean;
  updatedAt: string;
};

export type RoadmapItemRecord = {
  id: string;
  horizon: RoadmapHorizon;
  versionLabel: string;
  title: string;
  summary: string;
  status: RoadmapStatus;
  sortOrder: number;
};

export type ClosedBetaOpsBundle = {
  metrics: BetaDashboardMetrics;
  health: SystemHealthSnapshot;
  releaseNotes: ReleaseNoteRecord[];
  usage: UsageAnalyticsSnapshot;
  roadmap: RoadmapItemRecord[];
  betaPhaseLabel: string;
  appVersion: string;
};
