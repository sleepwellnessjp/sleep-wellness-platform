import {
  buildWeeklyScoreTrend,
  clientWellnessScoreOf,
  computeImprovementRate,
} from "@/lib/client-portal/helpers";
import type { ClientHomework } from "@/lib/repositories/client-homeworks-repository";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import { parseLeadingNumber } from "@/lib/soxai-graphs";
import {
  ACHIEVEMENT_DEFINITIONS,
  JOURNEY_STAGE_DEFINITIONS,
  stageDefinitionByNumber,
} from "./constants";
import type {
  AchievementCode,
  ClientAchievementView,
  JourneyScoreTrendPoint,
  JourneyStageId,
  JourneyStageStatus,
  JourneyStageView,
} from "./types";

export type JourneyComputeInput = {
  analyses: StoredAnalysis[];
  homeworks?: ClientHomework[];
  streakDays?: number;
  unlockedCodes?: AchievementCode[];
};

export type JourneyComputeResult = {
  currentStageId: JourneyStageId;
  stages: JourneyStageView[];
  achievementRate: number;
  improvementRate: number | null;
  streakDays: number;
  nextGoal: string;
  scoreTrend: JourneyScoreTrendPoint[];
  unlockedCodes: AchievementCode[];
  achievements: ClientAchievementView[];
};

function sleepEfficiencyOf(analysis: StoredAnalysis | null): number | null {
  if (!analysis) return null;
  return parseLeadingNumber(String(analysis.metrics.sleepEfficiency ?? ""));
}

function hrvOf(analysis: StoredAnalysis | null): number | null {
  if (!analysis) return null;
  return parseLeadingNumber(String(analysis.metrics.hrv ?? ""));
}

function stressOf(analysis: StoredAnalysis | null): number | null {
  if (!analysis) return null;
  return parseLeadingNumber(
    String(
      analysis.structured?.stressAverage?.trim() ||
        analysis.metrics.stress ||
        "",
    ),
  );
}

function yogaCompletedCount(homeworks: ClientHomework[]): number {
  return homeworks.filter(
    (item) => item.category === "yoga" && item.isCompleted,
  ).length;
}

/**
 * 分析・宿題・連続日数から現在ステージ番号（1–5）を推定する。
 * 医療診断ではなく、ウェルネス継続のためのガイド指標。
 */
export function inferStageNumber(input: JourneyComputeInput): number {
  const analyses = input.analyses;
  const streakDays = input.streakDays ?? 0;
  const homeworks = input.homeworks ?? [];
  const count = analyses.length;
  if (count <= 0) return 1;

  const latest = analyses[0] ?? null;
  const first = analyses[analyses.length - 1] ?? null;
  const latestScore = clientWellnessScoreOf(latest);
  const firstScore = clientWellnessScoreOf(first);
  const latestEff = sleepEfficiencyOf(latest);
  const firstEff = sleepEfficiencyOf(first);
  const latestHrv = hrvOf(latest);
  const firstHrv = hrvOf(first);
  const latestStress = stressOf(latest);
  const firstStress = stressOf(first);
  const yogaDone = yogaCompletedCount(homeworks);

  const scoreImproved =
    latestScore != null && firstScore != null && latestScore > firstScore;
  const efficiencySolid = latestEff != null && latestEff >= 80;
  const efficiencyStrong = latestEff != null && latestEff >= 88;
  const efficiencyImproved =
    latestEff != null && firstEff != null && latestEff >= firstEff + 3;
  const hrvImproved =
    latestHrv != null && firstHrv != null && latestHrv > firstHrv;
  const stressImproved =
    latestStress != null &&
    firstStress != null &&
    latestStress < firstStress;
  const highScore = latestScore != null && latestScore >= 75;
  const excellentScore = latestScore != null && latestScore >= 82;

  // Stage 5 — Sleep Wellness
  if (
    count >= 4 &&
    excellentScore &&
    efficiencyStrong &&
    streakDays >= 14 &&
    (hrvImproved || stressImproved) &&
    yogaDone >= 3
  ) {
    return 5;
  }

  // Stage 4 — Sleep Performance
  if (
    count >= 3 &&
    (highScore || scoreImproved) &&
    (efficiencySolid || efficiencyImproved) &&
    (hrvImproved || stressImproved || streakDays >= 7)
  ) {
    return 4;
  }

  // Stage 3 — Sleep Recovery
  if (
    count >= 2 &&
    (efficiencySolid || efficiencyImproved || (latestEff != null && latestEff >= 75))
  ) {
    return 3;
  }

  // Stage 2 — Sleep Balance
  if (count >= 2 || streakDays >= 3 || homeworks.some((h) => h.isCompleted)) {
    return 2;
  }

  // Stage 1 — Sleep Awareness
  return 1;
}

export function buildStageViews(
  currentStageNumber: number,
): JourneyStageView[] {
  return JOURNEY_STAGE_DEFINITIONS.map((stage) => {
    let status: JourneyStageStatus = "locked";
    if (stage.stageNumber < currentStageNumber) status = "completed";
    else if (stage.stageNumber === currentStageNumber) status = "current";
    return { ...stage, status };
  });
}

export function computeAchievementRate(
  currentStageNumber: number,
  analyses: StoredAnalysis[],
  streakDays: number,
): number {
  const base = (currentStageNumber - 1) * 20;
  const within =
    Math.min(analyses.length, 4) * 3 + Math.min(streakDays, 10);
  return Math.max(0, Math.min(100, Math.round(base + within)));
}

export function detectUnlockedAchievements(
  input: JourneyComputeInput,
): AchievementCode[] {
  const analyses = input.analyses;
  const streakDays = input.streakDays ?? 0;
  const homeworks = input.homeworks ?? [];
  const unlocked = new Set<AchievementCode>(input.unlockedCodes ?? []);

  if (analyses.length >= 1) unlocked.add("first_analysis");
  if (streakDays >= 7) unlocked.add("streak_7");
  if (streakDays >= 30) unlocked.add("streak_30");

  const hasEfficiency90 = analyses.some((analysis) => {
    const value = sleepEfficiencyOf(analysis);
    return value != null && value >= 90;
  });
  if (hasEfficiency90) unlocked.add("efficiency_90");

  if (analyses.length >= 2) {
    const latest = analyses[0];
    const first = analyses[analyses.length - 1];
    const latestHrv = hrvOf(latest);
    const firstHrv = hrvOf(first);
    const latestStress = stressOf(latest);
    const firstStress = stressOf(first);
    if (
      latestHrv != null &&
      firstHrv != null &&
      latestHrv > firstHrv
    ) {
      unlocked.add("hrv_improved");
    }
    if (
      latestStress != null &&
      firstStress != null &&
      latestStress < firstStress
    ) {
      unlocked.add("stress_improved");
    }
  }

  if (yogaCompletedCount(homeworks) >= 3 || streakDays >= 7) {
    const hasYoga = homeworks.some(
      (item) => item.category === "yoga" && item.isCompleted,
    );
    if (hasYoga || yogaCompletedCount(homeworks) >= 2) {
      unlocked.add("melatonin_yoga_streak");
    }
  }

  return ACHIEVEMENT_DEFINITIONS.map((item) => item.code).filter((code) =>
    unlocked.has(code),
  );
}

export function buildAchievementViews(
  unlockedCodes: AchievementCode[],
  unlockedAtByCode?: Partial<Record<AchievementCode, string>>,
): ClientAchievementView[] {
  const unlocked = new Set(unlockedCodes);
  return ACHIEVEMENT_DEFINITIONS.map((item) => ({
    ...item,
    unlocked: unlocked.has(item.code),
    unlockedAt: unlocked.has(item.code)
      ? (unlockedAtByCode?.[item.code] ?? null)
      : null,
  }));
}

export function nextGoalForStage(
  stageNumber: number,
  improvementRate: number | null,
): string {
  switch (stageNumber) {
    case 1:
      return "次の分析まで、就寝時刻をできるだけ一定に保ちましょう";
    case 2:
      return "起床後の光と軽いストレッチで、生活リズムをさらに整えましょう";
    case 3:
      return "入眠前のリラックスを続け、睡眠効率の安定を目指しましょう";
    case 4:
      return "日中の集中と回復感を意識しながら、現在の習慣を継続しましょう";
    case 5:
      return improvementRate != null && improvementRate >= 15
        ? "到達したリズムを大切に、週1回の振り返りを続けましょう"
        : "Sleep Wellness を維持するため、小さな習慣を丁寧に続けましょう";
    default:
      return "今日できる小さな一歩から始めましょう";
  }
}

export function computeClientJourney(
  input: JourneyComputeInput,
): JourneyComputeResult {
  const streakDays = Math.max(0, input.streakDays ?? 0);
  const stageNumber = inferStageNumber({ ...input, streakDays });
  const stages = buildStageViews(stageNumber);
  const current = stageDefinitionByNumber(stageNumber);
  const improvementRate = computeImprovementRate(input.analyses);
  const achievementRate = computeAchievementRate(
    stageNumber,
    input.analyses,
    streakDays,
  );
  const unlockedCodes = detectUnlockedAchievements({ ...input, streakDays });
  const scoreTrend = buildWeeklyScoreTrend(input.analyses);

  return {
    currentStageId: current.id,
    stages,
    achievementRate,
    improvementRate,
    streakDays,
    nextGoal: nextGoalForStage(stageNumber, improvementRate),
    scoreTrend,
    unlockedCodes,
    achievements: buildAchievementViews(unlockedCodes),
  };
}
