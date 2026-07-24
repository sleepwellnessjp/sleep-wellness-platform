import type {
  SleepCoachBriefing,
  SleepCoachContext,
  SleepCoachGenerator,
  SleepCoachMelatoninYoga,
} from "../types";

function yogaForScore(score: number | null): SleepCoachMelatoninYoga {
  if (score != null && score >= 75) {
    return {
      title: "イブニング・リカバリー・フロー",
      description:
        "副交感神経を整え、入眠前の心身の余白をつくる穏やかなシークエンスです。",
      durationMin: 12,
      focus: "リラックスと入眠準備",
    };
  }
  if (score != null && score < 55) {
    return {
      title: "リセット・ブリージング・ヨガ",
      description:
        "浅い呼吸と緊張をほどき、今夜の回復余力を取り戻す短時間プログラムです。",
      durationMin: 8,
      focus: "呼吸と回復",
    };
  }
  return {
    title: "メラトニンヨガ™ ベーシック",
    description:
      "体内時計を整える基本シークエンス。夕方〜就寝90分前の実践がおすすめです。",
    durationMin: 15,
    focus: "体内時計の同調",
  };
}

function statusLine(ctx: SleepCoachContext): string {
  if (ctx.sleepScore == null) {
    return "昨夜の分析データはまだありません。今日のリズムづくりから始めましょう。";
  }
  if (ctx.sleepScore >= 80) {
    return `昨夜の睡眠スコアは ${ctx.sleepScore}。回復の質が高く、今日は良い土台です。`;
  }
  if (ctx.sleepScore >= 60) {
    return `昨夜の睡眠スコアは ${ctx.sleepScore}。安定ゾーンですが、細部の整えが効きます。`;
  }
  return `昨夜の睡眠スコアは ${ctx.sleepScore}。回復不足気味です。今日は無理を抑えめに。`;
}

function conditionLine(ctx: SleepCoachContext): string {
  const parts: string[] = [];
  if (ctx.stress != null && ctx.stress >= 50) {
    parts.push("ストレスが高め");
  } else if (ctx.stress != null) {
    parts.push("ストレスは落ち着き気味");
  }
  if (ctx.hrv != null && ctx.hrv < 40) {
    parts.push("HRVが低めのため回復優先");
  } else if (ctx.hrv != null) {
    parts.push("自律神経の余力はまずまず");
  }
  if (ctx.sleepEfficiency != null) {
    parts.push(`睡眠効率 ${ctx.sleepEfficiency}%`);
  }
  if (parts.length === 0) {
    return "今日のコンディションは、無理のないペースで整えていきましょう。";
  }
  return `今日のコンディション：${parts.join(" / ")}。`;
}

function actionsFor(ctx: SleepCoachContext): string[] {
  const actions: string[] = [];
  if (ctx.stress != null && ctx.stress >= 50) {
    actions.push("日中に5分の深呼吸を2回入れる");
  }
  if (ctx.sleepEfficiency != null && ctx.sleepEfficiency < 85) {
    actions.push("就寝90分前から画面を暗くする");
  }
  if (ctx.hrv != null && ctx.hrv < 40) {
    actions.push("激しい運動は控え、散歩やストレッチを優先");
  }
  actions.push("カフェインは午後2時以降控える");
  actions.push("決まった時間にメラトニンヨガ™を行う");
  return actions.slice(0, 4);
}

function encouragementFor(ctx: SleepCoachContext): string {
  if (ctx.streakDays >= 14) {
    return `${ctx.clientName}さん、${ctx.streakDays}日の継続は大きな力です。今日も小さな一歩で十分です。`;
  }
  if (ctx.streakDays >= 3) {
    return `連続${ctx.streakDays}日の積み重ねができています。完璧より継続を大切に。`;
  }
  return `${ctx.clientName}さん、今日の選択が明日の眠りをつくります。一緒に整えましょう。`;
}

function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * ルールベース Sleep Coach。
 * 将来: OpenAI で個人文脈を要約し、同じ SleepCoachBriefing を返す Generator に差し替え。
 */
export function generateRuleBasedSleepCoach(
  ctx: SleepCoachContext,
): SleepCoachBriefing {
  return {
    featureId: "sleep_coach",
    clientId: ctx.clientId,
    clientName: ctx.clientName,
    dateLabel: todayLabel(),
    sleepStatus: statusLine(ctx),
    todayCondition: conditionLine(ctx),
    recommendedActions: actionsFor(ctx),
    melatoninYoga: yogaForScore(ctx.sleepScore),
    encouragement: encouragementFor(ctx),
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generateSleepCoach(
  ctx: SleepCoachContext,
  generator: SleepCoachGenerator = generateRuleBasedSleepCoach,
): Promise<SleepCoachBriefing> {
  return generator(ctx);
}
