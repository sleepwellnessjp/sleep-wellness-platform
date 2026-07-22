import { generateSleepCoach } from "@/lib/sleep-coach";

export {
  generateSleepCoach,
  type SleepCoachSuggestion,
  type SleepCoachContext,
} from "@/lib/sleep-coach";

export const sleepCoachService = {
  generate: generateSleepCoach,
};
