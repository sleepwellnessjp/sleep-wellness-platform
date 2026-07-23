/**
 * Analysis Module service — session + AI Sleep Analysis Engine boundary.
 * Domain helpers stay in lib; this module is the shared entry for screens.
 */

export {
  normalizeAnalysisResult,
  normalizeMetrics,
} from "@/lib/analysis-session";
export type {
  AnalysisMetrics,
  AnalysisResult,
} from "@/lib/analysis-session";

export {
  AI_SLEEP_ANALYSIS_VERSION,
  generateAiSleepAnalysis,
  generateAiSleepAnalysisSync,
  generateRuleBasedAiSleepAnalysis,
  aiInputFromSoxaiAndLifestyle,
  aiInputFromMetricsAndLifestyle,
  evaluateAllItems,
  toAiAnalysisPreview,
  toAnalysisResultFields,
  toJourneyExcerpt,
  toReportExcerpt,
  toHomeworkDrafts,
  toRecommendationCards,
  toImprovementItems,
  toTodaysRecommendations,
  toNextActionGoals,
} from "@/lib/ai-analysis";

export type {
  AiSleepAnalysisInput,
  AiSleepAnalysisOutput,
  AiSleepAnalysisGenerator,
  AiAnalysisItem,
  AiAnalysisItemKey,
  AiAnalysisSource,
  JourneyAiExcerpt,
  ReportAiExcerpt,
  HomeworkAiDraft,
} from "@/lib/ai-analysis";

import {
  generateAiSleepAnalysisSync,
  aiInputFromSoxaiAndLifestyle,
  aiInputFromMetricsAndLifestyle,
  toJourneyExcerpt,
  toReportExcerpt,
  toHomeworkDrafts,
  toAnalysisResultFields,
  type AiSleepAnalysisInput,
  type AiSleepAnalysisOutput,
} from "@/lib/ai-analysis";

export const analysisService = {
  /** AI Sleep Analysis Engine V1.0（ルールベース／将来 OpenAI 差し替え） */
  generateAiSleepAnalysis: generateAiSleepAnalysisSync,
  fromSoxaiAndLifestyle: aiInputFromSoxaiAndLifestyle,
  fromMetricsAndLifestyle: aiInputFromMetricsAndLifestyle,
  toJourney: toJourneyExcerpt,
  toReport: toReportExcerpt,
  toHomework: toHomeworkDrafts,
  toResultFields: toAnalysisResultFields,
  run(input: AiSleepAnalysisInput): AiSleepAnalysisOutput {
    return generateAiSleepAnalysisSync(input);
  },
};
