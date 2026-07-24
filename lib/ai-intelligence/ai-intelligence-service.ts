import {
  getDemoAiIntelligenceBundle,
  getDemoInstructorAssistant,
  getDemoKnowledgeAnswer,
  getDemoPredictiveAnalysis,
  getDemoResearchAi,
  getDemoSleepCoach,
  getDemoSwijIntelligence,
} from "./demo-ai-intelligence-store";
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
  ResearchAiContext,
  ResearchAiReport,
  SleepCoachBriefing,
  SleepCoachContext,
  SwijIntelligenceReport,
} from "./types";

/**
 * Sleep Wellness AI Intelligence サービス層。
 * 現状はモック / ルールベース。将来 OpenAI 接続時は各 generate* に
 * GPT Generator を渡す（型と戻り値は変更しない）。
 */

export function toJapaneseAiIntelligenceError(message: string): {
  error: string;
  status: number;
} {
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized") || lower.includes("auth")) {
    return { error: "認証が必要です。", status: 401 };
  }
  if (lower.includes("forbidden")) {
    return { error: "権限がありません。", status: 403 };
  }
  if (lower.includes("not found")) {
    return { error: "データが見つかりません。", status: 404 };
  }
  return {
    error: message.trim() || "AI Intelligence の処理に失敗しました。",
    status: 500,
  };
}

export async function getSleepCoachBriefing(
  ctx?: Partial<SleepCoachContext>,
): Promise<SleepCoachBriefing> {
  if (!ctx?.clientId) {
    return getDemoSleepCoach(ctx);
  }
  return generateSleepCoach({
    clientId: ctx.clientId,
    clientName: ctx.clientName ?? "クライアント",
    sleepScore: ctx.sleepScore ?? null,
    sleepEfficiency: ctx.sleepEfficiency ?? null,
    stress: ctx.stress ?? null,
    hrv: ctx.hrv ?? null,
    streakDays: ctx.streakDays ?? 0,
  });
}

export async function getInstructorAssistantBriefing(
  ctx?: Partial<InstructorAssistantContext>,
): Promise<InstructorAssistantBriefing> {
  if (!ctx?.clientId) {
    return getDemoInstructorAssistant(ctx);
  }
  return generateInstructorAssistant({
    clientId: ctx.clientId,
    clientName: ctx.clientName ?? "クライアント",
    sleepScore: ctx.sleepScore ?? null,
    previousSleepScore: ctx.previousSleepScore ?? null,
    sleepEfficiency: ctx.sleepEfficiency ?? null,
    stress: ctx.stress ?? null,
    hrv: ctx.hrv ?? null,
    goodPoints: ctx.goodPoints ?? [],
    improvements: ctx.improvements ?? [],
  });
}

export async function getSwijIntelligenceReport(): Promise<SwijIntelligenceReport> {
  try {
    return await generateSwijIntelligence();
  } catch {
    return getDemoSwijIntelligence();
  }
}

export async function getPredictiveAnalysisBriefing(
  ctx?: Partial<PredictiveAnalysisContext>,
): Promise<PredictiveAnalysis> {
  if (!ctx?.clientId) {
    return getDemoPredictiveAnalysis(ctx);
  }
  return generatePredictiveAnalysis({
    clientId: ctx.clientId,
    clientName: ctx.clientName ?? "クライアント",
    sleepEfficiency: ctx.sleepEfficiency ?? null,
    stress: ctx.stress ?? null,
    hrv: ctx.hrv ?? null,
    deepSleepPercent: ctx.deepSleepPercent ?? null,
    wellnessScore: ctx.wellnessScore ?? null,
    improvementRate: ctx.improvementRate ?? null,
    streakDays: ctx.streakDays ?? 0,
    horizonDays: ctx.horizonDays,
  });
}

export async function getResearchAiReport(
  ctx?: ResearchAiContext,
): Promise<ResearchAiReport> {
  try {
    return await generateResearchAi(ctx);
  } catch {
    return getDemoResearchAi(ctx?.topic);
  }
}

export async function searchKnowledgeBase(
  query: string,
  limit?: number,
): Promise<KnowledgeBaseAnswer> {
  const q = query.trim();
  if (!q) {
    return getDemoKnowledgeAnswer("Sleep Wellness Method");
  }
  return generateKnowledgeBase({ query: q, limit });
}

export async function getAiIntelligenceBundle(): Promise<AiIntelligenceBundle> {
  try {
    const [
      sleepCoach,
      instructorAssistant,
      swijIntelligence,
      predictiveAnalysis,
      researchReport,
      knowledgeAnswer,
    ] = await Promise.all([
      getSleepCoachBriefing(),
      getInstructorAssistantBriefing(),
      getSwijIntelligenceReport(),
      getPredictiveAnalysisBriefing(),
      getResearchAiReport(),
      searchKnowledgeBase("メラトニンヨガ"),
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
  } catch {
    return getDemoAiIntelligenceBundle();
  }
}
