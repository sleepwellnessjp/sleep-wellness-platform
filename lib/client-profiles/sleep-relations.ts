/**
 * 固定プロフィールから「睡眠との関連」ヒントを生成する。
 * 医学的診断ではなく、生活改善の参考情報（断定・推測を避ける）。
 */

import { attributeLabel } from "@/lib/client-profiles/environment-attributes";
import type { ClientProfileSections } from "@/lib/client-profiles/types";

export const SLEEP_RELATION_MAX_ITEMS = 5;

export const SLEEP_RELATION_DISCLAIMER =
  "医学的診断ではなく、生活改善の参考情報です。";

type SleepRelationCandidate = {
  /** 優先度（高いほど先に採用） */
  priority: number;
  text: string;
};

function isTruthyHabit(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  return ![
    "なし",
    "ない",
    "無し",
    "無",
    "no",
    "none",
    "0",
    "飲まない",
    "吸わない",
  ].includes(v.toLowerCase());
}

function looksIrregularWork(style: string): boolean {
  return /不規則|シフト|夜勤|交代|フレックス|早朝/.test(style);
}

function looksSufficientExercise(frequency: string): boolean {
  return /毎日|ほぼ毎日|週[3-7三四五六七]|十分|多い/.test(frequency);
}

function looksLowExercise(frequency: string): boolean {
  return /なし|ない|ほぼなし|まれ|週[0-1零一二]|月/.test(frequency);
}

function looksHeavyDrinking(frequency: string, amount: string): boolean {
  const text = `${frequency}${amount}`;
  return /毎日|ほぼ毎日|週[3-7三四五六七]|多め|多い|ボトル|升|500|缶[2-9]|杯[3-9]/.test(
    text,
  );
}

function looksLowSleepSatisfaction(value: string): boolean {
  return /低|不満|あまり|わるい|悪い|改善|普通以下|やや不満|とても不満/.test(
    value,
  );
}

function looksHighSleepSatisfaction(value: string): boolean {
  return /満足|良い|よい|高い|十分|とても満足|まあまあ満足/.test(value);
}

function looksDaytimeSleepiness(value: string): boolean {
  return /あり|有|強|やや|多|感じる|ときどき|時々|よく/.test(value);
}

function resolveOccupation(s: ClientProfileSections): string {
  return (
    s.work.occupationCustom?.trim() ||
    (s.work.occupationPreset && s.work.occupationPreset !== "その他"
      ? s.work.occupationPreset
      : "")
  );
}

function hasHeatExposure(s: ClientProfileSections): boolean {
  const heatTypes = [
    ...(s.heatExposure.heatEnvironmentTypes ?? []),
    s.heatExposure.heatEnvironmentOther?.trim() || "",
  ].filter(Boolean);
  const attrs = (s.work.environmentAttributeIds ?? []).map(attributeLabel);
  const heatAttr = attrs.some((label) => /高温|ホット|熱/.test(label));
  const occupation = resolveOccupation(s);
  return (
    s.heatExposure.worksInHeat === true ||
    heatTypes.length > 0 ||
    heatAttr ||
    /ホットヨガ|サウナ|厨房|温浴|岩盤|製鉄|溶接|焼き/.test(occupation)
  );
}

/**
 * プロフィール内容から睡眠との関連ヒントを最大5件返す。
 * 入力が少ない場合は空配列。
 */
export function buildSleepRelationTips(
  sections: ClientProfileSections | null | undefined,
): string[] {
  if (!sections) return [];

  const s = sections;
  const candidates: SleepRelationCandidate[] = [];
  const push = (priority: number, text: string) => {
    if (candidates.some((c) => c.text === text)) return;
    candidates.push({ priority, text });
  };

  const workStyle = s.work.workStyle?.trim() ?? "";
  const irregular =
    (workStyle && looksIrregularWork(workStyle)) ||
    (s.work.nightShiftsPerMonth != null && s.work.nightShiftsPerMonth > 0);

  if (irregular) {
    push(
      100,
      "勤務時間が不規則なため体内時計が乱れやすい可能性があります。",
    );
  }

  if (hasHeatExposure(s)) {
    push(90, "高温環境で活動する日は、脱水に注意してください。");
  }

  const nasal = isTruthyHabit(s.health.nasalCongestionHabitual);
  const snoring = isTruthyHabit(s.health.snoring);
  const pollen = isTruthyHabit(s.health.pollenAllergy);

  if (nasal) {
    push(85, "鼻づまりが睡眠の質へ影響する可能性があります。");
  } else if (snoring) {
    push(80, "いびきの自覚がある場合、眠りが浅くなりやすいことがあります。");
  } else if (pollen) {
    push(
      75,
      "花粉症の季節は、鼻の通りが睡眠の快適さに影響しやすいことがあります。",
    );
  }

  const drinkFreq = s.lifestyle.drinkingFrequency?.trim() ?? "";
  const drinkAmount = s.lifestyle.drinkingAmountPerOccasion?.trim() ?? "";
  const drinks = isTruthyHabit(drinkFreq) || isTruthyHabit(drinkAmount);

  if (drinks && looksHeavyDrinking(drinkFreq, drinkAmount)) {
    push(
      70,
      "飲酒量が多い日は、眠りが浅くなりやすい傾向があります。量やタイミングを少し意識してみてください。",
    );
  } else if (drinks) {
    push(
      55,
      "飲酒がある日は、就寝までの間隔を意識すると眠りやすくなることがあります。",
    );
  }

  const caffeine = s.caffeine.entries?.[0];
  const lateCaffeine =
    Boolean(caffeine?.type?.trim()) &&
    ((caffeine?.lastIntakeTimeTypical?.trim() &&
      /1[5-9]|2[0-3]|午後|夜|夕方/.test(caffeine.lastIntakeTimeTypical)) ||
      caffeine?.intakeAfterEvening === true);

  if (lateCaffeine) {
    push(
      65,
      "夕方以降のカフェインは、入眠のしやすさに影響することがあります。",
    );
  }

  const workStress =
    Boolean(s.work.workStressSelf?.trim()) &&
    /高|強|多|ストレスが|張り|負担/.test(s.work.workStressSelf ?? "");

  if (workStress) {
    push(
      60,
      "仕事のストレスが強い日は、就寝前にリラックスする時間があると安心です。",
    );
  }

  const exerciseFreq = s.exercise.frequency?.trim() ?? "";
  if (exerciseFreq && looksSufficientExercise(exerciseFreq)) {
    push(50, "運動量は十分です。");
  } else if (exerciseFreq && looksLowExercise(exerciseFreq)) {
    push(
      48,
      "無理のない範囲で体を動かす習慣があると、眠りの質が整いやすくなることがあります。",
    );
  }

  const preSleepFluid = s.hydration.preSleep2hFluidMl;
  const nocturia = s.hydration.nocturia === true;
  const nightCount = s.hydration.nighttimeUrinationCount;

  if (
    nocturia ||
    (nightCount != null && nightCount > 0) ||
    (preSleepFluid != null && preSleepFluid >= 400)
  ) {
    push(
      45,
      "就寝前の水分量や夜間のトイレ回数は、眠りの連続性に影響しやすいことがあります。",
    );
  }

  if (
    isTruthyHabit(s.sleepEnvironment.youngChildren) ||
    isTruthyHabit(s.sleepEnvironment.caregiving)
  ) {
    push(
      35,
      "育児や介護がある時期は、睡眠が断片的になりやすいので、休めるタイミングを大切にしてください。",
    );
  }

  const satisfaction = s.sleepEnvironment.sleepSatisfaction?.trim() ?? "";
  const sleepiness = s.sleepEnvironment.daytimeSleepiness?.trim() ?? "";
  const sleepConcern =
    (satisfaction && looksLowSleepSatisfaction(satisfaction)) ||
    (sleepiness && looksDaytimeSleepiness(sleepiness));
  const lifestyleRiskCount = candidates.filter(
    (c) =>
      c.priority >= 45 &&
      !c.text.startsWith("運動量は十分"),
  ).length;

  if (
    sleepConcern ||
    (lifestyleRiskCount >= 2 &&
      !(satisfaction && looksHighSleepSatisfaction(satisfaction)))
  ) {
    push(40, "睡眠改善の余地があります。");
  }

  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, SLEEP_RELATION_MAX_ITEMS)
    .map((c) => c.text);
}
