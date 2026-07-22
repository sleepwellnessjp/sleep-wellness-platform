import { buildAiFollowAlerts } from "@/lib/ai-follow-alerts";
import { generateInstructorInsight } from "@/lib/instructor-insight";

export { buildAiFollowAlerts } from "@/lib/ai-follow-alerts";
export { generateInstructorInsight } from "@/lib/instructor-insight";

export const aiService = {
  generateInstructorInsight,
  buildAiFollowAlerts,
};
