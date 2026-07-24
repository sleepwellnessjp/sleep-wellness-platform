import { generateInstructorAssistant } from "./generators/instructor-assistant";
import { generateKnowledgeBase } from "./generators/knowledge-base";
import { generatePredictiveAnalysis } from "./generators/predictive-analysis";
import { generateResearchAi } from "./generators/research-ai";
import { generateSleepCoach } from "./generators/sleep-coach";
import { generateSwijIntelligence } from "./generators/swij-intelligence";
import type {
  AiIntelligenceBundle,
  InstructorAssistantBriefing,
  InstructorAssistantContext,
  KnowledgeBaseAnswer,
  PredictiveAnalysis,
  PredictiveAnalysisContext,
  ResearchAiReport,
  SleepCoachBriefing,
  SleepCoachContext,
  SwijIntelligenceReport,
} from "./types";

const DEMO_CLIENT_ID = "client-demo-1";
const DEMO_CLIENT_NAME = "山田 太郎";

export function demoSleepCoachContext(
  overrides: Partial<SleepCoachContext> = {},
): SleepCoachContext {
  return {
    clientId: DEMO_CLIENT_ID,
    clientName: DEMO_CLIENT_NAME,
    sleepScore: 72,
    sleepEfficiency: 84,
    stress: 48,
    hrv: 41,
    streakDays: 9,
    ...overrides,
  };
}

export function demoInstructorAssistantContext(
  overrides: Partial<InstructorAssistantContext> = {},
): InstructorAssistantContext {
  return {
    clientId: DEMO_CLIENT_ID,
    clientName: DEMO_CLIENT_NAME,
    sleepScore: 72,
    previousSleepScore: 68,
    sleepEfficiency: 84,
    stress: 48,
    hrv: 41,
    goodPoints: [
      "就寝時刻が前回より安定している",
      "深睡眠の比率がわずかに改善",
    ],
    improvements: [
      "中途覚醒の頻度を減らす",
      "午後のカフェインを見直す",
    ],
    ...overrides,
  };
}

export function demoPredictiveContext(
  overrides: Partial<PredictiveAnalysisContext> = {},
): PredictiveAnalysisContext {
  return {
    clientId: DEMO_CLIENT_ID,
    clientName: DEMO_CLIENT_NAME,
    sleepEfficiency: 84,
    stress: 48,
    hrv: 41,
    deepSleepPercent: 17,
    wellnessScore: 72,
    improvementRate: 12,
    streakDays: 9,
    horizonDays: 14,
    ...overrides,
  };
}

export async function getDemoSleepCoach(
  overrides: Partial<SleepCoachContext> = {},
): Promise<SleepCoachBriefing> {
  return generateSleepCoach(demoSleepCoachContext(overrides));
}

export async function getDemoInstructorAssistant(
  overrides: Partial<InstructorAssistantContext> = {},
): Promise<InstructorAssistantBriefing> {
  return generateInstructorAssistant(demoInstructorAssistantContext(overrides));
}

export async function getDemoSwijIntelligence(): Promise<SwijIntelligenceReport> {
  return generateSwijIntelligence();
}

export async function getDemoPredictiveAnalysis(
  overrides: Partial<PredictiveAnalysisContext> = {},
): Promise<PredictiveAnalysis> {
  return generatePredictiveAnalysis(demoPredictiveContext(overrides));
}

export async function getDemoResearchAi(topic?: string): Promise<ResearchAiReport> {
  return generateResearchAi({ topic });
}

export async function getDemoKnowledgeAnswer(
  query: string,
): Promise<KnowledgeBaseAnswer> {
  return generateKnowledgeBase({ query });
}

/** デモ用フルバンドル（管理画面・検証用） */
export async function getDemoAiIntelligenceBundle(): Promise<AiIntelligenceBundle> {
  const [
    sleepCoach,
    instructorAssistant,
    swijIntelligence,
    predictiveAnalysis,
    researchReport,
    knowledgeAnswer,
  ] = await Promise.all([
    getDemoSleepCoach(),
    getDemoInstructorAssistant(),
    getDemoSwijIntelligence(),
    getDemoPredictiveAnalysis(),
    getDemoResearchAi(),
    getDemoKnowledgeAnswer("メラトニンヨガ"),
  ]);

  return {
    sleepCoach,
    instructorAssistant,
    swijIntelligence,
    predictiveAnalysis,
    researchReport,
    knowledgeAnswer,
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}
