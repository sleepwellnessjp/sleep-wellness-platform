export type {
  AchievementCategory,
  AchievementCode,
  AchievementDefinition,
  AchievementIconKey,
  AdminInstructorJourneyStats,
  AdminJourneyDashboard,
  ClientAchievementView,
  ClientJourneyBundle,
  InstructorJourneyRosterItem,
  JourneyAiCoach,
  JourneyScoreTrendPoint,
  JourneyStageCode,
  JourneyStageDefinition,
  JourneyStageId,
  JourneyStageStatus,
  JourneyStageView,
} from "./types";

export {
  ACHIEVEMENT_CODES,
  ACHIEVEMENT_DEFINITIONS,
  JOURNEY_STAGE_DEFINITIONS,
  JOURNEY_STAGE_IDS,
  achievementByCode,
  achievementById,
  isJourneyStageCode,
  isJourneyStageId,
  stageDefinitionById,
  stageDefinitionByNumber,
} from "./constants";

export {
  buildAchievementViews,
  buildStageViews,
  computeClientJourney,
  detectUnlockedAchievements,
  inferStageNumber,
  nextGoalForStage,
} from "./compute";

export { generateJourneyAiCoach } from "./ai-coach";

export {
  getDemoAdminJourneyDashboard,
  getDemoClientJourney,
  listDemoInstructorJourneyRoster,
} from "./demo-journey-store";

export {
  achievementTitle,
  buildClientJourneyBundleFromData,
  getEmptyClientJourney,
  mapUnlockedCodesToViews,
  resolveStageId,
  stagesForNumber,
  toJapaneseJourneyError,
} from "./build-bundle";

// Server-only journey APIs: import from `@/lib/journey/journey-service` in Route Handlers.
