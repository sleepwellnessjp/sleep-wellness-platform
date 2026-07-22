import { generateSleepWellnessJourney } from "@/lib/sleep-wellness-journey";

export {
  generateSleepWellnessJourney,
  type SleepWellnessJourney,
  type JourneyBadge,
  type JourneyTimelinePoint,
} from "@/lib/sleep-wellness-journey";

export const journeyService = {
  generate: generateSleepWellnessJourney,
};
