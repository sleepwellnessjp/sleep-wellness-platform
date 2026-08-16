/**
 * 共通 SleepAnalysisData モデルと Mapper の公開入口。
 * 既存 SOXAI / Oura 解析パイプラインは変更しない。
 */

export {
  emptySleepAnalysisData,
  type SleepAnalysisData,
  type SleepAnalysisDevice,
  type SleepAnalysisSourceImage,
} from "@/lib/sleep-analysis/sleep-analysis-model";

export {
  mapOuraToAnalysis,
  type MapOuraToAnalysisInput,
} from "@/lib/sleep-analysis/map-oura-to-analysis";

export {
  mapSoxaiToAnalysis,
  type MapSoxaiToAnalysisInput,
} from "@/lib/sleep-analysis/map-soxai-to-analysis";

export {
  computeSleepWellnessScore,
  type SleepWellnessGrade,
  type SleepWellnessScore,
  type SleepWellnessScoreFactor,
  type SleepWellnessScoreFactorKey,
} from "@/lib/sleep-analysis/sleep-wellness-score";

export {
  SLEEP_WELLNESS_FACTOR_KEYS,
  SLEEP_WELLNESS_FACTOR_LABELS,
  SLEEP_WELLNESS_SCORE_VERSION,
  SLEEP_WELLNESS_WEIGHTS,
} from "@/lib/sleep-analysis/sleep-wellness-weights";

export {
  computeSleepWellnessInsight,
  type ComputeSleepWellnessInsightInput,
  type SleepWellnessCause,
  type SleepWellnessInsight,
  type SleepWellnessPriority,
  type SleepWellnessSuggestion,
} from "@/lib/sleep-analysis/sleep-wellness-insight";

export {
  SLEEP_WELLNESS_INSIGHT_VERSION,
  type InsightConfidence,
  type InsightSeverity,
  type InsightSuggestionCategory,
} from "@/lib/sleep-analysis/sleep-wellness-insight-rules";

export {
  computeSleepWellnessPriority,
  formatSleepWellnessPriorityPlan,
  type ComputeSleepWellnessPriorityInput,
  type SleepWellnessPriorityItem,
  type SleepWellnessPriorityItemKey,
  type SleepWellnessPriorityPlan,
} from "@/lib/sleep-analysis/sleep-wellness-priority";

export {
  SLEEP_WELLNESS_PRIORITY_MAX,
  SLEEP_WELLNESS_PRIORITY_VERSION,
} from "@/lib/sleep-analysis/sleep-wellness-priority-config";

export {
  buildSleepWellnessReport,
  SLEEP_WELLNESS_REPORT_VERSION,
  type BuildSleepWellnessReportInput,
  type SleepWellnessReport,
  type SleepWellnessReportAction,
  type SleepWellnessReportAnalysis,
  type SleepWellnessReportInstructorMemo,
  type SleepWellnessReportOverall,
  type SleepWellnessReportPriorityItem,
} from "@/lib/sleep-analysis/sleep-wellness-report";

export {
  analysisResultToSleepAnalysisData,
  buildDemoSleepAnalysisData,
  buildDemoSleepWellnessReport,
  buildDemoSleepWellnessReportBundle,
  buildSleepWellnessReportBundleFromAnalysisResult,
  buildSleepWellnessReportFromAnalysisResult,
} from "@/lib/sleep-analysis/from-analysis-result";

export {
  getPriorityCounselingCopy,
  PRIORITY_COUNSELING_COPY,
  type CounselingEnrichment,
} from "@/lib/sleep-analysis/sleep-wellness-counseling-copy";

export {
  buildCounselingViewModel,
  type CounselingActionItem,
  type CounselingMetricCard,
  type CounselingPriorityCard,
  type CounselingTodaySummary,
  type CounselingViewModel,
  type PriorityLevel,
} from "@/lib/sleep-analysis/counseling-view-model";

export {
  resolveMelatoninYogaPhase,
  type MelatoninYogaPhase,
  type MelatoninYogaPhaseResult,
} from "@/lib/sleep-analysis/melatonin-yoga-phase";

export {
  EMPTY_INSTRUCTOR_SESSION_NOTES,
  INSTRUCTOR_SESSION_NOTE_FIELDS,
  readInstructorSessionNotes,
  writeInstructorSessionNotes,
  type InstructorSessionNotes,
} from "@/lib/sleep-analysis/instructor-session-notes";

export {
  buildFollowUpItems,
  buildHomeworkItems,
  buildSessionProgress,
  buildTodayTheme,
  guideChecksForPriority,
  guideForSection,
  type ConversationGuideBlock,
  type HomeworkItem,
  type SessionProgressStep,
  type TodayTheme,
} from "@/lib/sleep-analysis/session-guide";

export {
  buildPrescriptionSlots,
  type PrescriptionSlot,
  type PrescriptionSlotId,
} from "@/lib/sleep-analysis/prescription-slots";

export {
  getAidaNoYogaGuidance,
  getMelatoninYogaGuidance,
  loadOfficialAidaNoYogaText,
  loadOfficialMelatoninYogaText,
  type SwmYogaContentSource,
  type SwmYogaGuidance,
} from "@/lib/sleep-analysis/swm-yoga-content";

export {
  buildInstructorReadAloud,
  buildScoreLeadCopy,
  buildTodayActionLines,
  buildYogaWhyToday,
  factorEvalLabel,
  factorWhyLine,
  prescriptionStars,
  prescriptionTodayAction,
  shortenReason,
} from "@/lib/sleep-analysis/demo-report-copy";


export {
  DEMO_INSTRUCTOR_COMMENT_FIELDS,
  EMPTY_DEMO_INSTRUCTOR_COMMENTS,
  readDemoInstructorComments,
  writeDemoInstructorComments,
  type DemoInstructorComments,
} from "@/lib/sleep-analysis/demo-instructor-comments";
