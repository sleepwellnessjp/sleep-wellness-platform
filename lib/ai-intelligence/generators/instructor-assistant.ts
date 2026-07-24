import type {
  InstructorAssistantBriefing,
  InstructorAssistantContext,
  InstructorAssistantGenerator,
  InstructorAssistantHomework,
} from "../types";

function improvementPoints(ctx: InstructorAssistantContext): string[] {
  const points: string[] = [];
  if (
    ctx.sleepScore != null &&
    ctx.previousSleepScore != null &&
    ctx.sleepScore > ctx.previousSleepScore
  ) {
    points.push(
      `睡眠スコアが前回比 +${ctx.sleepScore - ctx.previousSleepScore}。改善の手応えを言語化して定着させる`,
    );
  }
  for (const item of ctx.goodPoints.slice(0, 3)) {
    points.push(item);
  }
  if (ctx.hrv != null && ctx.hrv >= 45) {
    points.push("HRVが安定帯。回復余力を維持する生活リズムを確認");
  }
  if (points.length === 0) {
    points.push("生活リズムの可視化ができている点をまず承認する");
  }
  return points.slice(0, 4);
}

function worseningCauses(ctx: InstructorAssistantContext): string[] {
  const causes: string[] = [];
  if (
    ctx.sleepScore != null &&
    ctx.previousSleepScore != null &&
    ctx.sleepScore < ctx.previousSleepScore
  ) {
    causes.push(
      `スコア低下（${ctx.previousSleepScore} → ${ctx.sleepScore}）。直近の睡眠・仕事・カフェイン・光環境を確認`,
    );
  }
  if (ctx.stress != null && ctx.stress >= 55) {
    causes.push("ストレス指標が高め。日中の緊張・就寝前の刺激を疑う");
  }
  if (ctx.sleepEfficiency != null && ctx.sleepEfficiency < 82) {
    causes.push("睡眠効率の低下。中途覚醒・就床時刻のずれの可能性");
  }
  if (ctx.hrv != null && ctx.hrv < 38) {
    causes.push("HRV低下。過負荷・回復不足・疾患以外の生活要因を優先確認");
  }
  for (const item of ctx.improvements.slice(0, 2)) {
    causes.push(item);
  }
  if (causes.length === 0) {
    causes.push("明確な悪化シグナルは薄い。予防的な生活リズム確認に留める");
  }
  return causes.slice(0, 4);
}

function questions(ctx: InstructorAssistantContext): string[] {
  return [
    "今週、就寝・起床時刻はどのくらいずれましたか？",
    ctx.stress != null && ctx.stress >= 50
      ? "日中いちばん緊張が高まる時間帯はいつですか？"
      : "昨夜、入眠までにかかった時間の体感は？",
    "メラトニンヨガ™や呼吸法は、いつ・どのくらい実践できましたか？",
    "今週、カフェイン・アルコール・画面光で気になったことはありますか？",
  ];
}

function agenda(ctx: InstructorAssistantContext): string[] {
  return [
    "前回からの変化の共有（良かった点を先に）",
    "数値で気になる指標の解釈（医療診断ではないことを明示）",
    ctx.improvements[0]
      ? `今日の焦点：${ctx.improvements[0]}`
      : "今日の焦点：就寝ルーティンの1点改善",
    "Homework の合意と次回までの観察ポイント",
  ];
}

function homework(ctx: InstructorAssistantContext): InstructorAssistantHomework[] {
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
  if (ctx.sleepEfficiency != null && ctx.sleepEfficiency < 85) {
    list.push({
      title: "就床時刻ログ（3日間）",
      category: "homework",
      reason: "睡眠効率改善のため、就床ずれの可視化が有効",
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

/**
 * ルールベース Instructor Assistant。
 * 将来: OpenAI でカルテ文脈を要約し、同じ InstructorAssistantBriefing を返す Generator に差し替え。
 */
export function generateRuleBasedInstructorAssistant(
  ctx: InstructorAssistantContext,
): InstructorAssistantBriefing {
  return {
    featureId: "instructor_assistant",
    clientId: ctx.clientId,
    clientName: ctx.clientName,
    improvementPoints: improvementPoints(ctx),
    worseningCauses: worseningCauses(ctx),
    questionCandidates: questions(ctx),
    counselingAgenda: agenda(ctx),
    homeworkSuggestions: homework(ctx),
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
