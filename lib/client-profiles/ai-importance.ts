/**
 * プロフィール項目の「AI分析への重要度」（1〜5）
 * 重要項目（3以上）のみ UI に星を表示する。
 */

import type { ProfileLabelKey } from "@/lib/client-profiles/labels";

/** 1〜5。未定義は表示なし（補助的な項目） */
export type AiImportanceStars = 1 | 2 | 3 | 4 | 5;

/**
 * 睡眠ウェルネス分析への寄与度。
 * 例: 飲酒量 ★★★★★ / 運動時間 ★★★★☆ / 室温 ★★★☆☆
 */
export const PROFILE_AI_IMPORTANCE: Partial<
  Record<ProfileLabelKey, AiImportanceStars>
> = {
  // ★★★★★ — 分析の核になりやすい生活・睡眠関連
  drinkingAmountPerOccasion: 5,
  drinkingFrequency: 5,
  caffeineLastIntakeTime: 5,
  caffeineAmount: 5,
  typicalBedtime: 5,
  typicalWakeTime: 5,
  nasalCongestionHabitual: 5,
  sleepMedicationUse: 5,
  sleepApneaDiagnosed: 5,
  snoring: 5,
  bedroomBedtimeTemperatureC: 5,
  exerciseEndTime: 5,
  preSleep2hFluidMl: 5,
  nightShiftsPerMonth: 5,
  workStressSelf: 5,

  // ★★★★☆ — 回復・リズム・刺激に強く関わる
  exerciseDurationMinutes: 4,
  exerciseFrequency: 4,
  exerciseIntensity: 4,
  caffeineType: 4,
  smokingType: 4,
  worksInHeat: 4,
  exposureDurationMinutes: 4,
  nocturia: 4,
  nighttimeUrinationCount: 4,
  menopause: 4,
  medicationsNote: 4,
  heatRoomTemperatureC: 4,
  workStartTime: 4,
  workEndTime: 4,
  daytimeSleepiness: 4,
  sleepSatisfaction: 4,
  bedroomBedtimeHumidityPercent: 4,
  hydrationAlcoholMl: 4,

  // ★★★☆☆ — 環境・習慣の補助信号
  homeTemperatureC: 3,
  homeHumidityPercent: 3,
  workplaceTemperatureC: 3,
  workplaceHumidityPercent: 3,
  heatHumidityPercent: 3,
  commuteStressSelf: 3,
  sweatAmount: 3,
  exerciseSweatAmount: 3,
  exerciseInHeat: 3,
  hydrationTotalMl: 3,
  hydrationWaterMl: 3,
  pollenAllergy: 3,
  youngChildren: 3,
  caregiving: 3,
  blackoutCurtain: 3,
  airConditioning: 3,
  crowdingLevel: 3,
  napHabit: 3,
  workDaysPerWeek: 3,
  workStyle: 3,
  environmentAttributes: 3,
  cooldownDurationMinutes: 3,
  exerciseCooldownMinutes: 3,
  movesImmediatelyAfterWork: 3,
  movesImmediatelyAfterExercise: 3,
};

/** UI に星を出す下限（重要項目のみ） */
export const AI_IMPORTANCE_DISPLAY_MIN = 3;

export function getProfileAiImportance(
  key: ProfileLabelKey,
): AiImportanceStars | undefined {
  return PROFILE_AI_IMPORTANCE[key];
}

/** ★★★★☆ 形式。重要度が閾値未満なら null */
export function formatAiImportanceStars(
  stars: AiImportanceStars | undefined | null,
  minDisplay: number = AI_IMPORTANCE_DISPLAY_MIN,
): string | null {
  if (stars == null || stars < minDisplay) return null;
  const filled = Math.max(0, Math.min(5, Math.round(stars)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export const AI_IMPORTANCE_HINT =
  "★はAI分析への重要度です。わかる範囲で入力いただくと、分析の精度が高まります。";
