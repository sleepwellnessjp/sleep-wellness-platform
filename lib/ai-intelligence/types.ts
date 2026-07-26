/**
 * Sleep Wellness AI Intelligence — ドメイン型定義。
 * 生成はルールベース（source: "rules"）。将来 OpenAI 差し替え時は
 * 同一型を返す Generator を渡す（source: "gpt"）。
 */

export type AiIntelligenceSource = "rules" | "gpt";

export type AiIntelligenceFeatureId =
  | "sleep_coach"
  | "instructor_assistant"
  | "swij_intelligence"
  | "predictive_analysis"
  | "research_ai"
  | "knowledge_base";

export type KnowledgeCategory =
  | "sleep_wellness_method"
  | "melatonin_yoga"
  | "sleep_science"
  | "certification_text"
  | "research_paper";

export type PredictionConfidence = "low" | "medium" | "high";

export type PredictionMetricKey =
  | "sleep_efficiency"
  | "stress"
  | "hrv"
  | "deep_sleep"
  | "wellness_score";

/** ① Sleep Coach — クライアント向け毎朝ブリーフィング */
export type SleepCoachMelatoninYoga = {
  title: string;
  description: string;
  durationMin: number;
  focus: string;
};

export type SleepCoachBriefing = {
  featureId: "sleep_coach";
  clientId: string;
  clientName: string;
  dateLabel: string;
  sleepStatus: string;
  todayCondition: string;
  recommendedActions: string[];
  melatoninYoga: SleepCoachMelatoninYoga;
  encouragement: string;
  generatedAt: string;
  source: AiIntelligenceSource;
};

export type SleepCoachContext = {
  clientId: string;
  clientName: string;
  sleepScore: number | null;
  sleepEfficiency: number | null;
  stress: number | null;
  hrv: number | null;
  streakDays: number;
};

export type SleepCoachGenerator = (
  ctx: SleepCoachContext,
) => SleepCoachBriefing | Promise<SleepCoachBriefing>;

/** ② Instructor Assistant — 認定講師向け分析サポート */
export type InstructorAssistantHomework = {
  title: string;
  category: "homework" | "breathing" | "yoga" | "lifestyle";
  reason: string;
};

export type InstructorAssistantBriefing = {
  featureId: "instructor_assistant";
  clientId: string;
  clientName: string;
  /** ① 良好な点 */
  goodPoints: string[];
  /** ② 改善が必要な点 */
  needsImprovement: string[];
  /** ③ 考えられる要因 */
  possibleFactors: string[];
  /** ④ 質問候補 */
  questionCandidates: string[];
  /** @deprecated 旧UI互換。新規生成では空配列 */
  improvementPoints?: string[];
  /** @deprecated 旧UI互換。新規生成では空配列 */
  worseningCauses?: string[];
  counselingAgenda: string[];
  homeworkSuggestions: InstructorAssistantHomework[];
  generatedAt: string;
  source: AiIntelligenceSource;
};

export type InstructorAssistantMetrics = {
  deepSleep?: string | null;
  remSleep?: string | null;
  sleepEfficiency?: string | null;
  sleepLatency?: string | null;
  sleepDebt?: string | null;
  awakenings?: string | null;
  hrv?: string | null;
  restingHeartRate?: string | null;
  sleepDuration?: string | null;
  stress?: string | null;
};

export type InstructorAssistantLifestyle = {
  caffeine?: string | null;
  caffeineTime?: string | null;
  caffeineDone?: string | null;
  alcohol?: string | null;
  alcoholDrank?: string | null;
  alcoholEndTime?: string | null;
  preBedBehavior?: string | null;
  notes?: string | null;
  stress?: string | null;
  dinner?: string | null;
  dinnerTime?: string | null;
  bathing?: string | null;
  condition?: string | null;
  work?: string | null;
};

export type InstructorAssistantContext = {
  clientId: string;
  clientName: string;
  sleepScore: number | null;
  previousSleepScore: number | null;
  sleepEfficiency: number | null;
  stress: number | null;
  hrv: number | null;
  metrics?: InstructorAssistantMetrics | null;
  previousMetrics?: InstructorAssistantMetrics | null;
  lifestyle?: InstructorAssistantLifestyle | null;
  previousHrvValues?: number[] | null;
  previousRhrValues?: number[] | null;
  /** @deprecated 互換用。生成では metrics を優先 */
  goodPoints?: string[];
  /** @deprecated 互換用 */
  improvements?: string[];
};

export type InstructorAssistantGenerator = (
  ctx: InstructorAssistantContext,
) => InstructorAssistantBriefing | Promise<InstructorAssistantBriefing>;

/** ③ SWIJ Intelligence — 本部向け横断分析 */
export type SwijNationalAverage = {
  metric: string;
  value: number;
  unit: string;
  deltaVsPrevMonth: number;
};

export type SwijAgeGroupComparison = {
  ageGroup: string;
  sleepScore: number;
  efficiency: number;
  stress: number;
};

export type SwijRankingItem = {
  rank: number;
  label: string;
  value: number;
  unit: string;
};

export type SwijEventEffect = {
  eventName: string;
  periodLabel: string;
  effectSummary: string;
  deltaPercent: number;
};

export type SwijSeasonalTrend = {
  season: string;
  sleepScoreAvg: number;
  insight: string;
};

export type SwijIntelligenceReport = {
  featureId: "swij_intelligence";
  nationalAverages: SwijNationalAverage[];
  ageGroupComparisons: SwijAgeGroupComparison[];
  improvementRankings: SwijRankingItem[];
  instructorRankings: SwijRankingItem[];
  eventEffects: SwijEventEffect[];
  seasonalTrends: SwijSeasonalTrend[];
  summary: string;
  generatedAt: string;
  source: AiIntelligenceSource;
};

export type SwijIntelligenceGenerator = () =>
  | SwijIntelligenceReport
  | Promise<SwijIntelligenceReport>;

/** ④ Predictive Analysis — 睡眠改善予測 */
export type PredictiveMetricForecast = {
  key: PredictionMetricKey;
  label: string;
  current: number;
  predicted: number;
  delta: number;
  unit: string;
};

export type PredictiveAnalysis = {
  featureId: "predictive_analysis";
  clientId: string;
  clientName: string;
  horizonDays: number;
  predictions: PredictiveMetricForecast[];
  confidence: PredictionConfidence;
  narrative: string;
  caveat: string;
  generatedAt: string;
  source: AiIntelligenceSource;
};

export type PredictiveAnalysisContext = {
  clientId: string;
  clientName: string;
  sleepEfficiency: number | null;
  stress: number | null;
  hrv: number | null;
  deepSleepPercent: number | null;
  wellnessScore: number | null;
  improvementRate: number | null;
  streakDays: number;
  horizonDays?: number;
};

export type PredictiveAnalysisGenerator = (
  ctx: PredictiveAnalysisContext,
) => PredictiveAnalysis | Promise<PredictiveAnalysis>;

/** ⑤ Research AI — 匿名データからの研究レポート */
export type ResearchReportSection = {
  heading: string;
  body: string;
};

export type ResearchAiReport = {
  featureId: "research_ai";
  title: string;
  abstract: string;
  sections: ResearchReportSection[];
  sampleSize: number;
  periodLabel: string;
  keyFindings: string[];
  anonymized: true;
  generatedAt: string;
  source: AiIntelligenceSource;
};

export type ResearchAiContext = {
  topic?: string;
  periodLabel?: string;
};

export type ResearchAiGenerator = (
  ctx?: ResearchAiContext,
) => ResearchAiReport | Promise<ResearchAiReport>;

/** ⑥ Knowledge Base — Sleep Wellness ナレッジ検索 */
export type KnowledgeDocument = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  body: string;
  tags: string[];
};

export type KnowledgeSearchHit = {
  id: string;
  title: string;
  category: KnowledgeCategory;
  snippet: string;
  relevance: number;
};

export type KnowledgeBaseAnswer = {
  featureId: "knowledge_base";
  query: string;
  answer: string;
  results: KnowledgeSearchHit[];
  citedSources: string[];
  generatedAt: string;
  source: AiIntelligenceSource;
};

export type KnowledgeBaseContext = {
  query: string;
  limit?: number;
};

export type KnowledgeBaseGenerator = (
  ctx: KnowledgeBaseContext,
) => KnowledgeBaseAnswer | Promise<KnowledgeBaseAnswer>;

/** 横断バンドル（デモ / サービス層） */
export type AiIntelligenceBundle = {
  sleepCoach: SleepCoachBriefing;
  instructorAssistant: InstructorAssistantBriefing;
  swijIntelligence: SwijIntelligenceReport;
  predictiveAnalysis: PredictiveAnalysis;
  researchReport: ResearchAiReport;
  knowledgeAnswer: KnowledgeBaseAnswer;
  generatedAt: string;
  source: AiIntelligenceSource;
};
