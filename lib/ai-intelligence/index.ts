export type {
  AiIntelligenceBundle,
  AiIntelligenceFeatureId,
  AiIntelligenceSource,
  InstructorAssistantBriefing,
  InstructorAssistantContext,
  InstructorAssistantGenerator,
  InstructorAssistantHomework,
  KnowledgeBaseAnswer,
  KnowledgeBaseContext,
  KnowledgeBaseGenerator,
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeSearchHit,
  PredictionConfidence,
  PredictionMetricKey,
  PredictiveAnalysis,
  PredictiveAnalysisContext,
  PredictiveAnalysisGenerator,
  PredictiveMetricForecast,
  ResearchAiContext,
  ResearchAiGenerator,
  ResearchAiReport,
  ResearchReportSection,
  SleepCoachBriefing,
  SleepCoachContext,
  SleepCoachGenerator,
  SleepCoachMelatoninYoga,
  SwijAgeGroupComparison,
  SwijEventEffect,
  SwijIntelligenceGenerator,
  SwijIntelligenceReport,
  SwijNationalAverage,
  SwijRankingItem,
  SwijSeasonalTrend,
} from "./types";

export {
  AI_INTELLIGENCE_FEATURE_DESCRIPTIONS,
  AI_INTELLIGENCE_FEATURE_IDS,
  AI_INTELLIGENCE_FEATURE_LABELS,
  AI_INTELLIGENCE_ROUTES,
  DEFAULT_PREDICTION_HORIZON_DAYS,
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CATEGORY_LABELS,
  PREDICTION_METRIC_LABELS,
  isAiIntelligenceFeatureId,
  isKnowledgeCategory,
} from "./constants";

export {
  generateRuleBasedSleepCoach,
  generateSleepCoach,
} from "./generators/sleep-coach";
export {
  generateInstructorAssistant,
  generateRuleBasedInstructorAssistant,
} from "./generators/instructor-assistant";
export {
  generateRuleBasedSwijIntelligence,
  generateSwijIntelligence,
} from "./generators/swij-intelligence";
export {
  generatePredictiveAnalysis,
  generateRuleBasedPredictiveAnalysis,
} from "./generators/predictive-analysis";
export {
  generateResearchAi,
  generateRuleBasedResearchAi,
} from "./generators/research-ai";
export {
  KNOWLEDGE_DOCUMENTS,
  generateKnowledgeBase,
  generateRuleBasedKnowledgeBase,
} from "./generators/knowledge-base";

export {
  demoInstructorAssistantContext,
  demoPredictiveContext,
  demoSleepCoachContext,
  getDemoAiIntelligenceBundle,
  getDemoInstructorAssistant,
  getDemoKnowledgeAnswer,
  getDemoPredictiveAnalysis,
  getDemoResearchAi,
  getDemoSleepCoach,
  getDemoSwijIntelligence,
} from "./demo-ai-intelligence-store";

export {
  getAiIntelligenceBundle,
  getInstructorAssistantBriefing,
  getPredictiveAnalysisBriefing,
  getResearchAiReport,
  getSleepCoachBriefing,
  getSwijIntelligenceReport,
  searchKnowledgeBase,
  toJapaneseAiIntelligenceError,
} from "./ai-intelligence-service";
