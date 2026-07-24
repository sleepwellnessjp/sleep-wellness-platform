import { buildAiFollowAlerts } from "@/lib/ai-follow-alerts";
import { generateAiCounselingAssistant } from "@/lib/ai-counseling-assistant";
import { generateInstructorInsight } from "@/lib/instructor-insight";
import {
  generateInstructorAssistant,
  generateKnowledgeBase,
  generatePredictiveAnalysis,
  generateResearchAi,
  generateSleepCoach,
  generateSwijIntelligence,
} from "@/lib/ai-intelligence";

export { buildAiFollowAlerts } from "@/lib/ai-follow-alerts";
export { generateAiCounselingAssistant } from "@/lib/ai-counseling-assistant";
export { generateInstructorInsight } from "@/lib/instructor-insight";
export {
  generateInstructorAssistant,
  generateKnowledgeBase,
  generatePredictiveAnalysis,
  generateResearchAi,
  generateSleepCoach,
  generateSwijIntelligence,
} from "@/lib/ai-intelligence";

export const aiService = {
  generateInstructorInsight,
  generateAiCounselingAssistant,
  buildAiFollowAlerts,
  generateSleepCoach,
  generateInstructorAssistant,
  generateSwijIntelligence,
  generatePredictiveAnalysis,
  generateResearchAi,
  generateKnowledgeBase,
};
