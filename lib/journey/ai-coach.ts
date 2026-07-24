import type {
  JourneyAiCoach,
  JourneyStageView,
} from "./types";

export type JourneyAiCoachInput = {
  clientName?: string;
  currentStage: JourneyStageView;
  achievementRate: number;
  improvementRate: number | null;
  streakDays: number;
  nextGoal: string;
  unlockedCount: number;
  totalAchievements: number;
};

/**
 * 現在ステージに合わせた AI Coach（ルールベース）。
 * 将来 GPT 差し替え時は同シグネチャで差し替え可能。
 */
export function generateJourneyAiCoach(
  input: JourneyAiCoachInput,
): JourneyAiCoach {
  const name = input.clientName?.trim() || "あなた";
  const stageTitle = input.currentStage.title;
  const subtitle = input.currentStage.subtitle;
  const streak =
    input.streakDays > 0
      ? `${input.streakDays}日の継続`
      : "これからの積み重ね";
  const improve =
    input.improvementRate == null
      ? "変化はこれから"
      : input.improvementRate > 0
        ? `改善率 ${input.improvementRate}%`
        : "いまは土台づくりの時期";

  const encouragementByStage: Record<number, string> = {
    1: `${name}さん、${stageTitle} へようこそ。まずは自分の睡眠を知ることから、美しい旅が始まります。`,
    2: `${streak}が、リズムを整える力になっています。焦らず、同じ時間に休む習慣を育てましょう。`,
    3: `睡眠の回復に意識が向いています。${improve}を感じながら、深く休む時間を大切に。`,
    4: `日中のコンディションにも変化が表れやすい段階です。睡眠が、日々のパフォーマンスを支えています。`,
    5: `Sleep Wellness に近い状態です。睡眠が人生の土台になっている感覚を、丁寧に味わいましょう。`,
  };

  const suggestionByStage: Record<number, string> = {
    1: "分析結果の中で気になる指標を1つ選び、認定講師と共有してみてください。",
    2: "就寝・起床の目安時刻を決め、前後30分以内に収めることを意識してみましょう。",
    3: "入眠前の画面時間を少し減らし、呼吸法かメラトニンヨガ™を短く取り入れてみてください。",
    4: "日中の集中や気分の変化を一言メモし、睡眠とのつながりを振り返ってみましょう。",
    5: "週に一度、スコアと体調を見返し、維持できている習慣を言葉にして残しましょう。",
  };

  const stageNumber = input.currentStage.stageNumber;
  const encouragement =
    encouragementByStage[stageNumber] ??
    `${name}さん、${subtitle}に向けて、一歩ずつ進んでいます。`;
  const suggestion =
    suggestionByStage[stageNumber] ??
    "今日できる小さな実践を1つだけ、丁寧に続けてみましょう。";

  return {
    encouragement,
    suggestion,
    nextGoal: input.nextGoal,
    source: "rules",
  };
}
