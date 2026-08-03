import {
  buildCounselingSupport,
  type CounselingSupportLifestyle,
} from "@/lib/counseling-support";
import type {
  InstructorAssistantBriefing,
  InstructorAssistantContext,
  InstructorAssistantGenerator,
  InstructorAssistantHomework,
} from "../types";

function agenda(needsImprovement: string[]): string[] {
  return [
    "良好な点の共有（数値の事実確認）",
    "改善が必要な点の解釈（医療診断ではないことを明示）",
    needsImprovement[0]
      ? `今日の焦点：${needsImprovement[0]}`
      : "今日の焦点：生活リズムの観察ポイント確認",
    "質問候補に沿ったヒアリングと次回観察の合意",
  ];
}

function homework(
  ctx: InstructorAssistantContext,
  needsImprovement: string[],
): InstructorAssistantHomework[] {
  const list: InstructorAssistantHomework[] = [
    {
      title: "メラトニンヨガ™ ベーシック（就寝90分前）",
      category: "yoga",
      reason: "体内時計と同調し、入眠前の副交感優位を促すため",
    },
  ];
  if (ctx.stress != null && ctx.stress >= 50) {
    list.push({
      title: "4-6呼吸（昼・夜 各3分）",
      category: "breathing",
      reason: "ストレス指標が高めのため、日中の緊張リセットを入れる",
    });
  }
  if (
    needsImprovement.some((p) => p.includes("睡眠効率") || p.includes("入眠"))
  ) {
    list.push({
      title: "就床時刻ログ（3日間）",
      category: "homework",
      reason: "入眠・睡眠効率の観察のため、就床ずれの可視化が有効",
    });
  } else {
    list.push({
      title: "カフェインカットオフ（14時以降）",
      category: "lifestyle",
      reason: "覚醒圧を下げ、入眠の質を守る基本習慣",
    });
  }
  return list.slice(0, 3);
}

function toLifestyle(
  lifestyle: InstructorAssistantContext["lifestyle"],
): CounselingSupportLifestyle | null {
  if (!lifestyle) return null;
  return {
    caffeine: lifestyle.caffeine,
    caffeineTime: lifestyle.caffeineTime,
    caffeineDone: lifestyle.caffeineDone,
    alcohol: lifestyle.alcohol,
    alcoholDrank: lifestyle.alcoholDrank,
    alcoholEndTime: lifestyle.alcoholEndTime,
    preBedBehavior: lifestyle.preBedBehavior,
    notes: lifestyle.notes,
    stress: lifestyle.stress,
    dinner: lifestyle.dinner,
    dinnerTime: lifestyle.dinnerTime,
    bathing: lifestyle.bathing,
    condition: lifestyle.condition,
    work: lifestyle.work,
  };
}

/**
 * ルールベース Instructor Assistant。
 * 将来: OpenAI でカルテ文脈を要約し、同じ InstructorAssistantBriefing を返す Generator に差し替え。
 */
export function generateRuleBasedInstructorAssistant(
  ctx: InstructorAssistantContext,
): InstructorAssistantBriefing {
  const metrics = {
    deepSleep: ctx.metrics?.deepSleep ?? null,
    remSleep: ctx.metrics?.remSleep ?? null,
    sleepEfficiency:
      ctx.metrics?.sleepEfficiency ??
      (ctx.sleepEfficiency != null ? `${ctx.sleepEfficiency}%` : null),
    sleepLatency: ctx.metrics?.sleepLatency ?? null,
    sleepDebt: ctx.metrics?.sleepDebt ?? null,
    awakenings: ctx.metrics?.awakenings ?? null,
    hrv: ctx.metrics?.hrv ?? (ctx.hrv != null ? String(ctx.hrv) : null),
    restingHeartRate: ctx.metrics?.restingHeartRate ?? null,
    sleepDuration: ctx.metrics?.sleepDuration ?? null,
    stress:
      ctx.metrics?.stress ?? (ctx.stress != null ? String(ctx.stress) : null),
  };

  const sections = buildCounselingSupport({
    metrics,
    previousMetrics: ctx.previousMetrics ?? null,
    lifestyle: toLifestyle(ctx.lifestyle),
    previousHrvValues: ctx.previousHrvValues ?? null,
    previousRhrValues: ctx.previousRhrValues ?? null,
  });

  return {
    featureId: "instructor_assistant",
    clientId: ctx.clientId,
    clientName: ctx.clientName,
    goodPoints: sections.goodPoints,
    needsImprovement: sections.needsImprovement,
    possibleFactors: sections.possibleFactors,
    questionCandidates: sections.questionCandidates,
    improvementPoints: sections.needsImprovement,
    worseningCauses: sections.possibleFactors,
    counselingAgenda: agenda(sections.needsImprovement),
    homeworkSuggestions: homework(ctx, sections.needsImprovement),
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generateInstructorAssistant(
  ctx: InstructorAssistantContext,
  generator: InstructorAssistantGenerator = generateRuleBasedInstructorAssistant,
): Promise<InstructorAssistantBriefing> {
  return generator(ctx);
}
