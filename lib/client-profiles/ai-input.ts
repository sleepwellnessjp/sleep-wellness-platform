/**
 * AI分析用入力の組み立て
 *
 * 優先順位（高い順）:
 * 1. SOXAI 当日実測（confirmed metrics）
 * 2. 分析日ごとの生活習慣（day_context / フォーム）
 * 3. クライアント固定プロフィール
 * 4. 前回分析（比較用）
 * 5. 気象データ — 将来
 * 6. 一般的な参考基準 — プロンプト側
 *
 * 分析出力は必ず 数値 → 【根拠】 → 改善提案 の順。
 * 未入力は除外。推測・断定しない。
 */

import { attributeLabel } from "@/lib/client-profiles/environment-attributes";
import { formatGenderLabel } from "@/lib/client-profile";
import {
  sanitizeNumber,
  NUMBER_RULES,
} from "@/lib/client-profiles/validation";
import type {
  AnalysisDayContext,
  ClientProfileSections,
} from "@/lib/client-profiles/types";
import { formatOccupationLabel } from "@/lib/client-profiles/types";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";

export type AnalysisAiInputPriority =
  | "soxai_measured"
  | "day_context"
  | "fixed_profile"
  | "previous_analysis"
  | "weather"
  | "general_reference";

/** 前回分析の要約（比較用。無い場合は省略） */
export type PreviousAnalysisForAi = {
  analysisDate: string;
  sleepScore: number | null;
  wellnessScore: number;
  /** 主要メトリクスのみ（空除外） */
  keyMetrics?: Partial<AnalysisMetrics>;
  summary?: string;
  /** 前回の AIカルテ（変化記録） */
  karteSummary?: string;
  /** @deprecated 旧レポート互換 */
  evidence?: string[];
  goodPoints?: string[];
  /** 前回の改善提案テキスト（重要度ラベルなしの本文のみ） */
  improvements?: string[];
  nextComparisonPoints?: string[];
  /**
   * 前回の AI宿題（行動目標）。
   * checked=true は達成として講師が記録したもの。
   */
  recommendationsUntilNext?: Array<{ text: string; checked: boolean }>;
  /** 前回AI宿題の達成率（0〜100） */
  homeworkAchievementRate?: number;
};

export type AnalysisAiInput = {
  schemaVersion: 1;
  priorityOrder: AnalysisAiInputPriority[];
  analysisDate?: string;
  clientId?: string;
  clientName?: string;
  /** 1. SOXAI 確認済みメトリクス（空項目は除外済み） */
  soxaiMetrics?: Partial<AnalysisMetrics>;
  /** 2. 当日の生活習慣（day_context / フォーム由来） */
  dayContext?: Partial<AnalysisDayContext>;
  /** 3. 固定プロフィール（未入力除外の構造化オブジェクト） */
  fixedProfile?: Record<string, unknown>;
  /** 固定プロフィールの短い事実要約（評価なし） */
  fixedProfileSummary?: string;
  /** 4. 前回分析（比較用。初回は省略） */
  previousAnalysis?: PreviousAnalysisForAi;
  /** 4b. 初回分析（前回と異なる場合のみ。長期変化の比較用） */
  firstAnalysis?: PreviousAnalysisForAi;
  /** 5. 気象（将来） */
  weather?: Record<string, unknown>;
  notesForModel: string[];
};

/** 分析フォームの生活習慣入力（day_context への写像用） */
export type LifestyleFormForDayContext = {
  measurementDate?: string;
  medications?: string;
  yoga?: string;
  yogaDone?: string;
  yogaDuration?: string;
  yogaTime?: string;
  yogaNotes?: string;
  pilates?: string;
  pilatesDone?: string;
  pilatesDuration?: string;
  pilatesTime?: string;
  pilatesNotes?: string;
  exercise?: string;
  otherExerciseDone?: string;
  otherExerciseName?: string;
  otherExerciseDuration?: string;
  otherExerciseTime?: string;
  otherExerciseNotes?: string;
  bathing?: string;
  alcohol?: string;
  alcoholDrank?: string;
  alcoholType?: string;
  alcoholAmount?: string;
  alcoholEndTime?: string;
  alcoholNotes?: string;
  caffeine?: string;
  caffeineDone?: string;
  caffeineType?: string;
  caffeineAmount?: string;
  caffeineTime?: string;
  caffeineNotes?: string;
  stress?: string;
  meals?: string;
  breakfastEaten?: string;
  breakfastTime?: string;
  breakfastContent?: string;
  lunchEaten?: string;
  lunchTime?: string;
  lunchContent?: string;
  dinnerEaten?: string;
  dinnerTime?: string;
  dinnerContent?: string;
  work?: string;
  condition?: string;
  nasalCongestion?: string;
  notes?: string;
};

function omitEmptyDeep(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    return value;
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const t = value.trim();
    return t ? t : undefined;
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => omitEmptyDeep(item))
      .filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      // 職業プリセット名は AI に渡さない（環境属性を優先）
      if (key === "occupationPreset") continue;
      const cleaned = omitEmptyDeep(raw);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

function sanitizeProfileNumbers(
  sections: ClientProfileSections,
): ClientProfileSections {
  const clamp = (
    n: number | null | undefined,
    rule = NUMBER_RULES.nonNegative,
  ) => sanitizeNumber(n, rule);

  return {
    ...sections,
    basic: {
      ...sections.basic,
      ageYears: clamp(sections.basic.ageYears, NUMBER_RULES.age),
      heightCm: clamp(sections.basic.heightCm, NUMBER_RULES.positive),
      weightKg: clamp(sections.basic.weightKg, NUMBER_RULES.positive),
      bmi: clamp(sections.basic.bmi, NUMBER_RULES.positive),
    },
    work: {
      ...sections.work,
      workDaysPerWeek: clamp(sections.work.workDaysPerWeek),
      nightShiftsPerMonth: clamp(sections.work.nightShiftsPerMonth),
      workDurationHours: clamp(sections.work.workDurationHours),
      overtimeHoursPerWeek: clamp(sections.work.overtimeHoursPerWeek),
      breakCountPerDay: clamp(sections.work.breakCountPerDay),
      breakTotalDurationMinutes: clamp(sections.work.breakTotalDurationMinutes),
    },
    commute: {
      ...sections.commute,
      walkOneWayMinutes: clamp(sections.commute.walkOneWayMinutes),
      bicycleOneWayMinutes: clamp(sections.commute.bicycleOneWayMinutes),
      trainOneWayMinutes: clamp(sections.commute.trainOneWayMinutes),
      busOneWayMinutes: clamp(sections.commute.busOneWayMinutes),
      carOneWayMinutes: clamp(sections.commute.carOneWayMinutes),
      motorcycleOneWayMinutes: clamp(sections.commute.motorcycleOneWayMinutes),
      otherOneWayMinutes: clamp(sections.commute.otherOneWayMinutes),
      transferCount: clamp(sections.commute.transferCount),
      commuteDaysPerWeek: clamp(sections.commute.commuteDaysPerWeek),
    },
    heatExposure: {
      ...sections.heatExposure,
      exposureDurationMinutes: clamp(
        sections.heatExposure.exposureDurationMinutes,
      ),
      roomTemperatureC: clamp(
        sections.heatExposure.roomTemperatureC,
        NUMBER_RULES.temperatureC,
      ),
      humidityPercent: clamp(
        sections.heatExposure.humidityPercent,
        NUMBER_RULES.humidity,
      ),
      waterIntakeDuringWorkMl: clamp(
        sections.heatExposure.waterIntakeDuringWorkMl,
      ),
      breakCount: clamp(sections.heatExposure.breakCount),
      cooldownDurationMinutes: clamp(
        sections.heatExposure.cooldownDurationMinutes,
      ),
      minutesUntilMoveAfterWork: clamp(
        sections.heatExposure.minutesUntilMoveAfterWork,
      ),
    },
    lifestyle: {
      ...sections.lifestyle,
      hoursBeforeBedTypical: clamp(sections.lifestyle.hoursBeforeBedTypical),
      cigarettesPerDay: clamp(sections.lifestyle.cigarettesPerDay),
    },
    caffeine: {
      ...sections.caffeine,
      entries: (sections.caffeine.entries ?? []).map((entry) => ({
        ...entry,
        cupsOrCountPerDay: clamp(entry.cupsOrCountPerDay),
      })),
    },
    hydration: {
      ...sections.hydration,
      waterMl: clamp(sections.hydration.waterMl),
      teaMl: clamp(sections.hydration.teaMl),
      coffeeTeaMl: clamp(sections.hydration.coffeeTeaMl),
      sportsDrinkMl: clamp(sections.hydration.sportsDrinkMl),
      alcoholMl: clamp(sections.hydration.alcoholMl),
      otherBeverageMl: clamp(sections.hydration.otherBeverageMl),
      totalFluidMl: clamp(sections.hydration.totalFluidMl),
      preSleep2hFluidMl: clamp(sections.hydration.preSleep2hFluidMl),
      duringExerciseFluidMl: clamp(sections.hydration.duringExerciseFluidMl),
      duringHeatWorkFluidMl: clamp(sections.hydration.duringHeatWorkFluidMl),
      nighttimeUrinationCount: clamp(sections.hydration.nighttimeUrinationCount),
    },
    exercise: {
      ...sections.exercise,
      durationMinutes: clamp(sections.exercise.durationMinutes),
      cooldownDurationMinutes: clamp(sections.exercise.cooldownDurationMinutes),
    },
    health: { ...sections.health },
    sleepEnvironment: {
      ...sections.sleepEnvironment,
      napDurationMinutes: clamp(sections.sleepEnvironment.napDurationMinutes),
      homeTemperatureC: clamp(
        sections.sleepEnvironment.homeTemperatureC,
        NUMBER_RULES.temperatureC,
      ),
      homeHumidityPercent: clamp(
        sections.sleepEnvironment.homeHumidityPercent,
        NUMBER_RULES.humidity,
      ),
      bedroomBedtimeTemperatureC: clamp(
        sections.sleepEnvironment.bedroomBedtimeTemperatureC,
        NUMBER_RULES.temperatureC,
      ),
      bedroomBedtimeHumidityPercent: clamp(
        sections.sleepEnvironment.bedroomBedtimeHumidityPercent,
        NUMBER_RULES.humidity,
      ),
      bedroomWakeTemperatureC: clamp(
        sections.sleepEnvironment.bedroomWakeTemperatureC,
        NUMBER_RULES.temperatureC,
      ),
      bedroomWakeHumidityPercent: clamp(
        sections.sleepEnvironment.bedroomWakeHumidityPercent,
        NUMBER_RULES.humidity,
      ),
      workplaceTemperatureC: clamp(
        sections.sleepEnvironment.workplaceTemperatureC,
        NUMBER_RULES.temperatureC,
      ),
      workplaceHumidityPercent: clamp(
        sections.sleepEnvironment.workplaceHumidityPercent,
        NUMBER_RULES.humidity,
      ),
      workplaceHeatExposureDurationMinutes: clamp(
        sections.sleepEnvironment.workplaceHeatExposureDurationMinutes,
      ),
    },
  };
}

function compactSoxaiMetrics(
  metrics: AnalysisMetrics | null | undefined,
): Partial<AnalysisMetrics> | undefined {
  if (!metrics) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metrics)) {
    if (key === "sleepScore") {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        out[key] = value;
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return Object.keys(out).length > 0
    ? (out as Partial<AnalysisMetrics>)
    : undefined;
}

function compactDayContext(
  day: AnalysisDayContext | null | undefined,
): Partial<AnalysisDayContext> | undefined {
  if (!day) return undefined;
  const cleaned = omitEmptyDeep(day) as Partial<AnalysisDayContext> | undefined;
  if (!cleaned) return undefined;
  // schemaVersion だけのオブジェクトは除外
  const keys = Object.keys(cleaned).filter((k) => k !== "schemaVersion");
  return keys.length > 0 ? cleaned : undefined;
}

function joinFilled(parts: Array<string | undefined>, sep = " / "): string {
  return parts
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p))
    .join(sep);
}

/**
 * 分析フォームの生活習慣を AnalysisDayContext へ写像する。
 * 既存 dayContext があればそちらを優先し、空欄のみフォームで補完。
 */
export function buildDayContextFromLifestyle(
  lifestyle: LifestyleFormForDayContext | null | undefined,
  existing?: AnalysisDayContext | null,
): AnalysisDayContext | null {
  if (!lifestyle && !existing) return null;

  const yesNone = (value: string | undefined) => {
    if (value === "yes") return "あり";
    if (value === "none") return "なし";
    return value?.trim() || undefined;
  };

  const alcoholAmount = joinFilled([
    yesNone(lifestyle?.alcoholDrank),
    lifestyle?.alcoholType,
    lifestyle?.alcoholAmount,
    lifestyle?.alcoholEndTime
      ? `終了 ${lifestyle.alcoholEndTime.trim()}`
      : undefined,
    lifestyle?.alcoholNotes,
    lifestyle?.alcohol,
  ]);

  const caffeineLast = joinFilled([
    yesNone(lifestyle?.caffeineDone),
    lifestyle?.caffeineType,
    lifestyle?.caffeineAmount,
    lifestyle?.caffeineTime,
    lifestyle?.caffeineNotes,
    lifestyle?.caffeine,
  ]);

  const exerciseParts = [
    lifestyle?.yogaDone === "yes" || lifestyle?.yoga?.trim()
      ? joinFilled([
          "ヨガ",
          lifestyle?.yogaDuration
            ? `${lifestyle.yogaDuration.trim()}分`
            : undefined,
          lifestyle?.yogaTime,
          lifestyle?.yogaNotes,
          lifestyle?.yoga,
        ])
      : lifestyle?.yogaDone === "none"
        ? "ヨガなし"
        : undefined,
    lifestyle?.pilatesDone === "yes" || lifestyle?.pilates?.trim()
      ? joinFilled([
          "ピラティス",
          lifestyle?.pilatesDuration
            ? `${lifestyle.pilatesDuration.trim()}分`
            : undefined,
          lifestyle?.pilatesTime,
          lifestyle?.pilatesNotes,
          lifestyle?.pilates,
        ])
      : lifestyle?.pilatesDone === "none"
        ? "ピラティスなし"
        : undefined,
    lifestyle?.otherExerciseDone === "yes" || lifestyle?.exercise?.trim()
      ? joinFilled([
          lifestyle?.otherExerciseName || "その他運動",
          lifestyle?.otherExerciseDuration
            ? `${lifestyle.otherExerciseDuration.trim()}分`
            : undefined,
          lifestyle?.otherExerciseTime,
          lifestyle?.otherExerciseNotes,
          lifestyle?.exercise,
        ])
      : lifestyle?.otherExerciseDone === "none"
        ? "その他運動なし"
        : undefined,
    lifestyle?.bathing?.trim()
      ? `入浴: ${lifestyle.bathing.trim()}`
      : undefined,
    lifestyle?.work?.trim() ? `仕事: ${lifestyle.work.trim()}` : undefined,
  ].filter(Boolean) as string[];

  const mealsFromForm = [
    {
      label: "朝食",
      eaten: yesNone(lifestyle?.breakfastEaten),
      time: lifestyle?.breakfastTime?.trim() || undefined,
      content: lifestyle?.breakfastContent?.trim() || undefined,
    },
    {
      label: "昼食",
      eaten: yesNone(lifestyle?.lunchEaten),
      time: lifestyle?.lunchTime?.trim() || undefined,
      content: lifestyle?.lunchContent?.trim() || undefined,
    },
    {
      label: "夕食",
      eaten: yesNone(lifestyle?.dinnerEaten),
      time: lifestyle?.dinnerTime?.trim() || undefined,
      content: lifestyle?.dinnerContent?.trim() || undefined,
    },
  ].filter((m) => m.eaten || m.time || m.content);

  const fromForm: AnalysisDayContext = {
    schemaVersion: 1,
    analysisDate: lifestyle?.measurementDate?.trim() || undefined,
    previousDayAlcoholAmount: alcoholAmount || undefined,
    caffeineLastIntakeTime: caffeineLast || undefined,
    meals:
      mealsFromForm.length > 0
        ? mealsFromForm
        : lifestyle?.meals?.trim()
          ? [{ label: "食事", content: lifestyle.meals.trim() }]
          : undefined,
    exerciseSummary:
      exerciseParts.length > 0 ? exerciseParts.join("。") : undefined,
    exerciseEndTime:
      joinFilled([
        lifestyle?.otherExerciseTime,
        lifestyle?.yogaTime,
        lifestyle?.pilatesTime,
      ]) || undefined,
    stressSelf: lifestyle?.stress?.trim() || undefined,
    condition: lifestyle?.condition?.trim() || undefined,
    nasalCongestion: lifestyle?.nasalCongestion?.trim() || undefined,
    medicationsToday: lifestyle?.medications?.trim() || undefined,
    notes: lifestyle?.notes?.trim() || undefined,
    formLifestyle: lifestyle
      ? {
          alcohol: lifestyle.alcohol?.trim() || undefined,
          alcoholDrank: lifestyle.alcoholDrank?.trim() || undefined,
          caffeine: lifestyle.caffeine?.trim() || undefined,
          caffeineDone: lifestyle.caffeineDone?.trim() || undefined,
          bathing: lifestyle.bathing?.trim() || undefined,
          yoga: lifestyle.yoga?.trim() || undefined,
          yogaDone: lifestyle.yogaDone?.trim() || undefined,
          pilates: lifestyle.pilates?.trim() || undefined,
          pilatesDone: lifestyle.pilatesDone?.trim() || undefined,
          meals: lifestyle.meals?.trim() || undefined,
          otherExerciseDone: lifestyle.otherExerciseDone?.trim() || undefined,
          exercise: lifestyle.exercise?.trim() || undefined,
          dinnerTime: lifestyle.dinnerTime?.trim() || undefined,
          stress: lifestyle.stress?.trim() || undefined,
        }
      : undefined,
  };

  const prefer = <T,>(a: T | undefined | null, b: T | undefined | null): T | undefined => {
    if (a === undefined || a === null || a === "") return b ?? undefined;
    return a;
  };

  const result: AnalysisDayContext = {
    schemaVersion: 1,
    analysisDate: prefer(existing?.analysisDate, fromForm.analysisDate),
    weatherRegionChoice: existing?.weatherRegionChoice,
    weatherRegionCustom: existing?.weatherRegionCustom,
    weatherRecordId: existing?.weatherRecordId,
    previousDayAlcoholAmount: prefer(
      existing?.previousDayAlcoholAmount,
      fromForm.previousDayAlcoholAmount,
    ),
    caffeineLastIntakeTime: prefer(
      existing?.caffeineLastIntakeTime,
      fromForm.caffeineLastIntakeTime,
    ),
    waterIntakeMl: existing?.waterIntakeMl,
    totalFluidMl: existing?.totalFluidMl,
    meals:
      existing?.meals && existing.meals.length > 0
        ? existing.meals
        : fromForm.meals,
    exerciseSummary: prefer(existing?.exerciseSummary, fromForm.exerciseSummary),
    exerciseEndTime: prefer(existing?.exerciseEndTime, fromForm.exerciseEndTime),
    heatActivityDurationMinutes: existing?.heatActivityDurationMinutes,
    sweatAmount: existing?.sweatAmount,
    changedClothes: existing?.changedClothes,
    showered: existing?.showered,
    cooldownDurationMinutes: existing?.cooldownDurationMinutes,
    movedImmediatelyAfter: existing?.movedImmediatelyAfter,
    homeTemperatureC: existing?.homeTemperatureC,
    homeHumidityPercent: existing?.homeHumidityPercent,
    bedroomTemperatureC: existing?.bedroomTemperatureC,
    bedroomHumidityPercent: existing?.bedroomHumidityPercent,
    workplaceTemperatureC: existing?.workplaceTemperatureC,
    workplaceHumidityPercent: existing?.workplaceHumidityPercent,
    environmentEvents: existing?.environmentEvents,
    stressSelf: prefer(existing?.stressSelf, fromForm.stressSelf),
    condition: prefer(existing?.condition, fromForm.condition),
    nasalCongestion: prefer(
      existing?.nasalCongestion,
      fromForm.nasalCongestion,
    ),
    medicationsToday: prefer(
      existing?.medicationsToday,
      fromForm.medicationsToday,
    ),
    notes: prefer(existing?.notes, fromForm.notes),
    formLifestyle:
      existing?.formLifestyle &&
      Object.values(existing.formLifestyle).some(
        (v) => typeof v === "string" && v.trim(),
      )
        ? existing.formLifestyle
        : fromForm.formLifestyle,
  };

  return compactDayContext(result) ? result : null;
}

const PREVIOUS_METRIC_KEYS: Array<keyof AnalysisMetrics> = [
  "sleepScore",
  "sleepDuration",
  "sleepEfficiency",
  "deepSleep",
  "deepSleepRate",
  "remSleep",
  "awakenings",
  "sleepDebt",
  "sleepLatency",
  "hrv",
  "restingHeartRate",
  "stress",
  "spo2",
  "bedtime",
  "wakeTime",
];

/** 前回分析を AI 用に圧縮（未入力・空は除外） */
export function compactPreviousAnalysisForAi(input: {
  analysisDate?: string;
  sleepScore?: number | null;
  wellnessScore?: number | null;
  metrics?: AnalysisMetrics | Partial<AnalysisMetrics> | null;
  summary?: string;
  karteSummary?: string;
  evidence?: string[];
  goodPoints?: string[];
  improvements?: Array<string | { text?: string; stars?: number }>;
  nextComparisonPoints?: string[];
  recommendationsUntilNext?: Array<
    string | { text?: string; checked?: boolean }
  >;
  homeworkAchievement?: { rate?: number; checked?: number; total?: number };
  achievementRate?: number;
} | null | undefined): PreviousAnalysisForAi | undefined {
  if (!input) return undefined;
  const analysisDate = input.analysisDate?.trim();
  if (!analysisDate) return undefined;

  const keyMetrics: Record<string, unknown> = {};
  const metrics = input.metrics;
  if (metrics) {
    for (const key of PREVIOUS_METRIC_KEYS) {
      const value = metrics[key];
      if (key === "sleepScore") {
        if (typeof value === "number" && Number.isFinite(value)) {
          keyMetrics[key] = value;
        }
        continue;
      }
      if (typeof value === "string" && value.trim()) {
        keyMetrics[key] = value.trim();
      }
    }
  }

  const evidence = (input.evidence ?? [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
  const goodPoints = (input.goodPoints ?? [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  const improvements = (input.improvements ?? [])
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && typeof item.text === "string") {
        return item.text.trim();
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 5);
  const nextComparisonPoints = (input.nextComparisonPoints ?? [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  const recommendationsUntilNext = (input.recommendationsUntilNext ?? [])
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { text, checked: false } : null;
      }
      if (item && typeof item === "object" && typeof item.text === "string") {
        const text = item.text.trim();
        return text ? { text, checked: item.checked === true } : null;
      }
      return null;
    })
    .filter(
      (item): item is { text: string; checked: boolean } => item != null,
    )
    .slice(0, 5);

  const fromGoalsRate =
    recommendationsUntilNext.length > 0
      ? Math.round(
          (recommendationsUntilNext.filter((g) => g.checked).length /
            recommendationsUntilNext.length) *
            100,
        )
      : undefined;
  const storedRate =
    typeof input.homeworkAchievement?.rate === "number" &&
    Number.isFinite(input.homeworkAchievement.rate)
      ? Math.max(0, Math.min(100, Math.round(input.homeworkAchievement.rate)))
      : typeof input.achievementRate === "number" &&
          Number.isFinite(input.achievementRate)
        ? Math.max(0, Math.min(100, Math.round(input.achievementRate)))
        : undefined;
  const homeworkAchievementRate = storedRate ?? fromGoalsRate;

  return {
    analysisDate,
    sleepScore:
      typeof input.sleepScore === "number" && Number.isFinite(input.sleepScore)
        ? input.sleepScore
        : null,
    wellnessScore:
      typeof input.wellnessScore === "number" &&
      Number.isFinite(input.wellnessScore)
        ? input.wellnessScore
        : 0,
    keyMetrics:
      Object.keys(keyMetrics).length > 0
        ? (keyMetrics as Partial<AnalysisMetrics>)
        : undefined,
    summary: input.summary?.trim() || undefined,
    karteSummary: input.karteSummary?.trim() || undefined,
    evidence: evidence.length > 0 ? evidence : undefined,
    goodPoints: goodPoints.length > 0 ? goodPoints : undefined,
    improvements: improvements.length > 0 ? improvements : undefined,
    nextComparisonPoints:
      nextComparisonPoints.length > 0 ? nextComparisonPoints : undefined,
    recommendationsUntilNext:
      recommendationsUntilNext.length > 0
        ? recommendationsUntilNext
        : undefined,
    homeworkAchievementRate,
  };
}

function compactFixedProfile(
  sections: ClientProfileSections | null | undefined,
): Record<string, unknown> | undefined {
  if (!sections) return undefined;
  const sanitized = sanitizeProfileNumbers(sections);

  // AI向け: 職業名プリセットは除外し、環境属性は日本語ラベルへ
  const work = { ...sanitized.work };
  delete work.occupationPreset;
  const attrIds = work.environmentAttributeIds ?? [];
  const environmentAttributeLabels = attrIds.map(attributeLabel);

  const payload = {
    basic: {
      ...sanitized.basic,
      genderLabel: sanitized.basic.gender
        ? formatGenderLabel(sanitized.basic.gender) || sanitized.basic.gender
        : undefined,
    },
    work: {
      ...work,
      environmentAttributeLabels:
        environmentAttributeLabels.length > 0
          ? environmentAttributeLabels
          : undefined,
      occupation:
        sanitized.work.occupationCustom?.trim() ||
        undefined,
    },
    commute: sanitized.commute,
    heatExposure: sanitized.heatExposure,
    lifestyle: sanitized.lifestyle,
    caffeine: sanitized.caffeine,
    hydration: sanitized.hydration,
    exercise: sanitized.exercise,
    health: sanitized.health,
    sleepEnvironment: sanitized.sleepEnvironment,
  };

  return omitEmptyDeep(payload) as Record<string, unknown> | undefined;
}

const AI_COMMENT_MIN_CHARS = 100;
const AI_COMMENT_MAX_CHARS = 200;

export type ProfileAiFocusStars = 1 | 2 | 3 | 4 | 5;

export type ProfileAiFocusItem = {
  label: string;
  stars: ProfileAiFocusStars;
};

/** AI分析用プロフィール要約（診断ではない） */
export type ProfileAiSummaryStructured = {
  lifestyle: string[];
  sleepFactors: string[];
  focusItems: ProfileAiFocusItem[];
};

function isTruthyHabit(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  return !["なし", "ない", "無し", "無", "no", "none", "0", "飲まない", "吸わない"].includes(
    v.toLowerCase(),
  );
}

function looksHeavyDrinking(frequency: string, amount: string): boolean {
  const text = `${frequency}${amount}`;
  return /毎日|ほぼ毎日|週[3-7三四五六七]|多め|多い|ボトル|升|500|缶[2-9]|杯[3-9]/.test(
    text,
  );
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

function resolveOccupation(s: ClientProfileSections): string {
  return formatOccupationLabel(s.work.occupationCustom, s.work.occupationPreset);
}

function heatContext(s: ClientProfileSections): {
  hasHeat: boolean;
  heatTypes: string[];
  yogaLike: boolean;
} {
  const heatTypes = [
    ...(s.heatExposure.heatEnvironmentTypes ?? []),
    s.heatExposure.heatEnvironmentOther?.trim() || "",
  ].filter(Boolean);
  const attrs = (s.work.environmentAttributeIds ?? []).map(attributeLabel);
  const heatAttr = attrs.some((label) => /高温|ホット|熱/.test(label));
  const occupation = resolveOccupation(s);
  const yogaLike =
    /ホットヨガ|ヨガ|ピラティス/.test(occupation) ||
    heatTypes.some((t) => /ヨガ|ピラティス/.test(t)) ||
    (s.exercise.types ?? []).some((t) => /ヨガ|ピラティス/.test(t));
  const hasHeat =
    s.heatExposure.worksInHeat === true ||
    heatTypes.length > 0 ||
    heatAttr ||
    /ホットヨガ|サウナ|厨房|温浴|岩盤|製鉄|溶接|焼き/.test(occupation);
  return { hasHeat, heatTypes, yogaLike };
}

function takeWithinBudget(items: string[], maxChars: number, maxItems = 3): string[] {
  const selected: string[] = [];
  let total = 0;
  for (const item of items) {
    if (selected.length >= maxItems) break;
    const next = total + item.length + (selected.length > 0 ? 1 : 0);
    if (selected.length > 0 && next > maxChars) break;
    selected.push(item);
    total = next;
  }
  return selected;
}

/**
 * AI分析用プロフィール要約（構造化）。
 * 診断ではなく、分析時に参照する事実ベースの整理。
 * 本文（生活スタイル＋影響要素）はおおよそ 100〜200 文字。
 */
export function buildProfileAiSummaryStructured(
  sections: ClientProfileSections | null | undefined,
): ProfileAiSummaryStructured | null {
  if (!sections) return null;

  const s = sanitizeProfileNumbers(sections);
  const occupation = resolveOccupation(s);
  const { hasHeat, heatTypes, yogaLike } = heatContext(s);
  const workStyle = s.work.workStyle?.trim() ?? "";
  const irregular =
    (workStyle && looksIrregularWork(workStyle)) ||
    (s.work.nightShiftsPerMonth != null && s.work.nightShiftsPerMonth > 0);
  const drinkFreq = s.lifestyle.drinkingFrequency?.trim() ?? "";
  const drinkAmount = s.lifestyle.drinkingAmountPerOccasion?.trim() ?? "";
  const drinks =
    isTruthyHabit(drinkFreq) || isTruthyHabit(drinkAmount);
  const heavyDrink = drinks && looksHeavyDrinking(drinkFreq, drinkAmount);
  const exerciseFreq = s.exercise.frequency?.trim() ?? "";
  const exerciseTypes = [
    ...(s.exercise.types ?? []),
    s.exercise.typeOther?.trim() || "",
  ].filter(Boolean);
  const nasal = isTruthyHabit(s.health.nasalCongestionHabitual);
  const snoring = isTruthyHabit(s.health.snoring);
  const pollen = isTruthyHabit(s.health.pollenAllergy);
  const caffeine = s.caffeine.entries?.[0];
  const lateCaffeine =
    Boolean(caffeine?.type?.trim()) &&
    ((caffeine?.lastIntakeTimeTypical?.trim() &&
      /1[5-9]|2[0-3]|午後|夜|夕方/.test(caffeine.lastIntakeTimeTypical)) ||
      caffeine?.intakeAfterEvening === true);
  const workStress =
    Boolean(s.work.workStressSelf?.trim()) &&
    /高|強|多|ストレスが|張り|負担/.test(s.work.workStressSelf ?? "");

  // --- 【生活スタイル】 ---
  const lifestyleCandidates: string[] = [];

  if (yogaLike && /指導|インストラクター|講師/.test(occupation)) {
    lifestyleCandidates.push("ヨガ・ピラティス指導を中心とした活動");
  } else if (yogaLike) {
    lifestyleCandidates.push("ヨガ・ピラティスを中心とした活動");
  } else if (occupation) {
    lifestyleCandidates.push(`${occupation}を中心とした活動`);
  }

  if (irregular) {
    lifestyleCandidates.push("勤務時間は不規則");
  } else if (workStyle) {
    lifestyleCandidates.push(`勤務は${workStyle}`);
  }

  if (exerciseFreq) {
    if (looksSufficientExercise(exerciseFreq)) {
      lifestyleCandidates.push("日常的な運動量は多い");
    } else if (looksLowExercise(exerciseFreq)) {
      lifestyleCandidates.push("日常的な運動量は少なめ");
    } else {
      lifestyleCandidates.push(`運動習慣は${exerciseFreq}`);
    }
  } else if (exerciseTypes.length > 0 && !yogaLike) {
    lifestyleCandidates.push(`${exerciseTypes[0]}などの運動習慣あり`);
  }

  if (
    attrsActivePhysical(s) &&
    !lifestyleCandidates.some((line) => /運動量/.test(line))
  ) {
    lifestyleCandidates.push("身体活動量が多い勤務傾向");
  }

  // --- 【睡眠へ影響しそうな要素】 ---
  const factorCandidates: string[] = [];

  if (heavyDrink) {
    factorCandidates.push("飲酒量がやや多い");
  } else if (drinks) {
    factorCandidates.push(
      drinkAmount
        ? `飲酒習慣あり（${drinkFreq || "頻度不明"}・${drinkAmount}）`
        : `飲酒頻度は${drinkFreq}`,
    );
  }

  if (nasal) {
    factorCandidates.push("鼻づまりがある");
  } else if (snoring) {
    factorCandidates.push("いびきの自覚がある");
  } else if (pollen) {
    factorCandidates.push("花粉症があり鼻閉が出やすい日がある");
  }

  if (hasHeat) {
    if (heatTypes.some((t) => /ヨガ/.test(t)) || /ホットヨガ|ヨガ/.test(occupation)) {
      factorCandidates.push("高温環境で活動する日が多い");
    } else if (heatTypes.length > 0) {
      factorCandidates.push(`${heatTypes[0]}など高温環境での活動がある`);
    } else {
      factorCandidates.push("高温環境で活動する日が多い");
    }
  }

  if (lateCaffeine) {
    factorCandidates.push("カフェインの摂取時刻が遅めの傾向");
  }

  if (workStress) {
    factorCandidates.push("仕事由来のストレスを感じやすい傾向");
  }

  if (s.heatExposure.movesImmediatelyAfterWork === true) {
    factorCandidates.push("活動後すぐに移動する傾向");
  }

  // 本文 100〜200 文字に収める
  const lifestyle = takeWithinBudget(lifestyleCandidates, 90, 3);
  let sleepFactors = takeWithinBudget(factorCandidates, 110, 3);
  let bodyChars =
    [...lifestyle, ...sleepFactors].join("").length +
    Math.max(0, lifestyle.length + sleepFactors.length - 1);

  if (bodyChars < AI_COMMENT_MIN_CHARS) {
    for (const item of factorCandidates) {
      if (sleepFactors.includes(item)) continue;
      if (sleepFactors.length >= 3) break;
      const next =
        bodyChars + item.length + (lifestyle.length + sleepFactors.length > 0 ? 1 : 0);
      if (next > AI_COMMENT_MAX_CHARS) break;
      sleepFactors = [...sleepFactors, item];
      bodyChars = next;
      if (bodyChars >= AI_COMMENT_MIN_CHARS) break;
    }
  }

  // --- 【AIが分析時に重視する項目】 ---
  const focusItems: ProfileAiFocusItem[] = [];
  const pushFocus = (label: string, stars: ProfileAiFocusStars) => {
    if (focusItems.some((item) => item.label === label)) return;
    if (focusItems.length >= 4) return;
    focusItems.push({ label, stars });
  };

  if (heavyDrink) pushFocus("飲酒量", 5);
  else if (drinks) pushFocus("飲酒習慣", 4);

  if (irregular) pushFocus("不規則勤務", 5);
  else if (workStyle && /夜勤|早朝/.test(workStyle)) pushFocus("勤務リズム", 4);

  if (nasal) pushFocus("鼻づまり", 4);
  else if (snoring) pushFocus("いびき", 3);
  else if (pollen) pushFocus("花粉症", 3);

  if (hasHeat) pushFocus("高温環境", 4);
  if (lateCaffeine) pushFocus("カフェイン時刻", 3);
  if (workStress) pushFocus("仕事ストレス", 3);

  focusItems.sort((a, b) => b.stars - a.stars);

  if (
    lifestyle.length === 0 &&
    sleepFactors.length === 0 &&
    focusItems.length === 0
  ) {
    return null;
  }

  return { lifestyle, sleepFactors, focusItems };
}

function attrsActivePhysical(s: ClientProfileSections): boolean {
  const attrs = (s.work.environmentAttributeIds ?? []).map(attributeLabel);
  const traits = s.work.traits ?? [];
  return [...attrs, ...traits].some((label) =>
    /身体活動量が多い|立ち仕事|歩く仕事|重い物/.test(label),
  );
}

export function renderFocusStars(stars: ProfileAiFocusStars): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

/**
 * 後方互換: フラットな箇条書き（生活スタイル＋影響要素）。
 */
export function buildProfileAiCommentBullets(
  sections: ClientProfileSections | null | undefined,
): string[] {
  const summary = buildProfileAiSummaryStructured(sections);
  if (!summary) {
    return ["固定プロフィールの入力が少なく、要約できる特徴はまだ少ない"];
  }
  return [...summary.lifestyle, ...summary.sleepFactors];
}

/** 構造化要約をテキストへ（UI・AI入力共通） */
export function formatProfileAiSummaryStructured(
  summary: ProfileAiSummaryStructured,
): string {
  const blocks: string[] = [];

  if (summary.lifestyle.length > 0) {
    blocks.push(
      `【生活スタイル】\n${summary.lifestyle.map((item) => `・${item}`).join("\n")}`,
    );
  }
  if (summary.sleepFactors.length > 0) {
    blocks.push(
      `【睡眠へ影響しそうな要素】\n${summary.sleepFactors.map((item) => `・${item}`).join("\n")}`,
    );
  }
  if (summary.focusItems.length > 0) {
    blocks.push(
      `【AIが分析時に重視する項目】\n${summary.focusItems
        .map((item) => `${renderFocusStars(item.stars)} ${item.label}`)
        .join("\n")}`,
    );
  }

  return blocks.join("\n\n");
}

/** @deprecated formatProfileAiSummaryStructured を使用 */
export function formatProfileAiComment(bullets: string[]): string {
  return bullets.map((item) => `・${item}`).join("\n");
}

/**
 * 固定プロフィールから事実ベースの短い要約を生成（評価・診断はしない）。
 * 未入力は含めない。確認画面の AI コメントと同じ根拠を使う。
 */
export function summarizeFixedProfileForAi(
  sections: ClientProfileSections | null | undefined,
): string {
  const summary = buildProfileAiSummaryStructured(sections);
  if (!summary) return "";
  return formatProfileAiSummaryStructured(summary);
}

export type BuildAnalysisAiInputArgs = {
  analysisDate?: string;
  clientId?: string;
  clientName?: string;
  soxaiMetrics?: AnalysisMetrics | null;
  dayContext?: AnalysisDayContext | null;
  /** フォーム生活習慣（dayContext が空のとき補完） */
  lifestyleForm?: LifestyleFormForDayContext | null;
  fixedProfile?: ClientProfileSections | null;
  previousAnalysis?: PreviousAnalysisForAi | null;
  /** 初回分析（前回と異なる場合のみ渡す） */
  firstAnalysis?: PreviousAnalysisForAi | null;
  weather?: Record<string, unknown> | null;
};

/**
 * Medical / Visual / PDF が将来同じ分析結果を使うための共通 AI 入力 JSON
 *
 * 統合ソース:
 * 1. SOXAI 実測
 * 2. 生活習慣（当日 / day_context）
 * 3. 固定プロフィール
 * 4. 前回・初回分析
 */
export function buildAnalysisAiInput(
  args: BuildAnalysisAiInputArgs,
): AnalysisAiInput {
  const soxaiMetrics = compactSoxaiMetrics(args.soxaiMetrics ?? null);
  const dayContext = compactDayContext(
    buildDayContextFromLifestyle(
      args.lifestyleForm ?? null,
      args.dayContext ?? null,
    ) ?? args.dayContext ?? null,
  );
  const fixedProfile = compactFixedProfile(args.fixedProfile ?? null);
  const previousAnalysis = args.previousAnalysis || undefined;
  const firstAnalysis =
    args.firstAnalysis &&
    args.firstAnalysis.analysisDate !== previousAnalysis?.analysisDate
      ? args.firstAnalysis
      : undefined;
  const weather =
    args.weather && Object.keys(args.weather).length > 0
      ? (omitEmptyDeep(args.weather) as Record<string, unknown> | undefined)
      : undefined;

  const fixedProfileSummary = summarizeFixedProfileForAi(
    args.fixedProfile ?? null,
  );

  const notesForModel = [
    "優先順位: SOXAI実測 > 当日生活習慣 > 固定プロフィール > 前回分析 > 気象 > 一般参考基準",
    "分析は必ず 数値 → 【根拠】 → 改善提案 の順で書く。根拠なしの改善提案は禁止。",
    "改善提案は効果が高い順・最大5件。stars:5=今すぐ改善 / 4=今週改善 / 3=余裕があれば。全部を一度に改善しろとは言わない。各項目に whyNow（なぜ今優先するか）を付ける。",
    "未入力項目は触れない。推測・断定しない。",
    "固定プロフィール要約は【生活スタイル】【睡眠へ影響しそうな要素】【AIが分析時に重視する項目】の構成。診断ではなく分析参照用。",
    "固定プロフィールは普段の傾向。当日の生活習慣と混同しない。",
    "前回分析がある場合は差分を可能性として参照する。無い場合は触れない。",
    "初回分析がある場合（前回と異なる）は長期変化も可能性として参照する。",
    "前回の recommendationsUntilNext（AI宿題）がある場合は達成・未達と達成率を可能性として参照し、今回のAI宿題に活かす。",
    "karteSummary は Sleep Wellness Insight（最重要課題／判断根拠／最も改善効果が高い行動）。優先順位は ①睡眠時間 ②深い睡眠 ③睡眠効率 ④入眠潜時 ⑤覚醒時間 ⑥ストレス ⑦HRV ⑧SpO₂ ⑨呼吸数 ⑩体内時計。深い睡眠だけで最重要課題を決めない。『ノンレム』禁止。一般論禁止。固定テンプレ禁止。",
    "医療診断・病名の断定はしない。",
  ];

  return {
    schemaVersion: 1,
    priorityOrder: [
      "soxai_measured",
      "day_context",
      "fixed_profile",
      "previous_analysis",
      "weather",
      "general_reference",
    ],
    analysisDate: args.analysisDate?.trim() || undefined,
    clientId: args.clientId?.trim() || undefined,
    clientName: args.clientName?.trim() || undefined,
    soxaiMetrics,
    dayContext,
    fixedProfile,
    fixedProfileSummary: fixedProfileSummary || undefined,
    previousAnalysis: previousAnalysis || undefined,
    firstAnalysis,
    weather,
    notesForModel,
  };
}

/** 開発環境向けログ（本番画面には出さない） */
export function logAnalysisAiInputInDev(aiInput: AnalysisAiInput) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[analysis-ai-input]", JSON.stringify(aiInput, null, 2));
}
