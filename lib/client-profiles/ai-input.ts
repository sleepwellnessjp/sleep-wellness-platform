/**
 * AI分析用入力の組み立て
 *
 * 優先順位（高い順）:
 * 1. SOXAI 当日実測（confirmed metrics）
 * 2. 分析日ごとの当日情報（day_context）— 今回は未実装フォーム、空可
 * 3. クライアント固定プロフィール
 * 4. 気象データ — 将来
 * 5. 一般的な参考基準 — プロンプト側
 *
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
import type { AnalysisMetrics } from "@/lib/soxai-metrics";

export type AnalysisAiInputPriority =
  | "soxai_measured"
  | "day_context"
  | "fixed_profile"
  | "weather"
  | "general_reference";

export type AnalysisAiInput = {
  schemaVersion: 1;
  priorityOrder: AnalysisAiInputPriority[];
  analysisDate?: string;
  clientId?: string;
  clientName?: string;
  /** 1. SOXAI 確認済みメトリクス（空項目は除外済み） */
  soxaiMetrics?: Partial<AnalysisMetrics>;
  /** 2. 当日情報（空の場合は省略） */
  dayContext?: Partial<AnalysisDayContext>;
  /** 3. 固定プロフィール（未入力除外の構造化オブジェクト） */
  fixedProfile?: Record<string, unknown>;
  /** 固定プロフィールの短い事実要約（評価なし） */
  fixedProfileSummary?: string;
  /** 4. 気象（将来） */
  weather?: Record<string, unknown>;
  notesForModel: string[];
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

/**
 * 固定プロフィールから事実のみの短い要約を生成（保存しない・評価しない）。
 * 未入力は含めない。
 */
export function summarizeFixedProfileForAi(
  sections: ClientProfileSections | null | undefined,
): string {
  if (!sections) return "";

  const s = sanitizeProfileNumbers(sections);
  const sentences: string[] = [];

  const age = s.basic.ageYears;
  const gender = s.basic.gender
    ? formatGenderLabel(s.basic.gender) || s.basic.gender
    : "";
  const occupationForSummary =
    s.work.occupationCustom?.trim() ||
    (s.work.occupationPreset && s.work.occupationPreset !== "その他"
      ? s.work.occupationPreset
      : "");

  const identity: string[] = [];
  if (age != null && gender) identity.push(`${age}歳${gender}`);
  else if (age != null) identity.push(`${age}歳`);
  else if (gender) identity.push(String(gender));
  if (occupationForSummary) identity.push(occupationForSummary);
  if (identity.length === 1) sentences.push(`${identity[0]}。`);
  else if (identity.length >= 2) {
    sentences.push(`${identity[0]}。${identity.slice(1).join("。")}。`);
  }

  const attrs = (s.work.environmentAttributeIds ?? []).map(attributeLabel);
  if (attrs.length > 0) {
    sentences.push(`${attrs.join("・")}の傾向がある。`);
  }

  if (s.heatExposure.worksInHeat === true) {
    const types = [
      ...(s.heatExposure.heatEnvironmentTypes ?? []),
      s.heatExposure.heatEnvironmentOther?.trim() || "",
    ].filter(Boolean);
    const duration = s.heatExposure.exposureDurationMinutes;
    let heat = "高温環境（ホットヨガ・サウナ・厨房など）での活動がある";
    if (types.length) heat = `${types.join("・")}など暑い環境での活動がある`;
    if (duration != null) heat += `（目安${duration}分）`;
    sentences.push(`${heat}。`);
  }

  if (s.heatExposure.movesImmediatelyAfterWork === true) {
    sentences.push("活動後すぐに移動する傾向がある。");
  } else if (
    s.heatExposure.cooldownDurationMinutes != null &&
    s.heatExposure.cooldownDurationMinutes > 0
  ) {
    sentences.push(
      `活動後に涼しい場所で休む時間がある（目安${s.heatExposure.cooldownDurationMinutes}分）。`,
    );
  }

  if (s.lifestyle.drinkingFrequency?.trim()) {
    sentences.push(`飲酒頻度は${s.lifestyle.drinkingFrequency.trim()}。`);
  }

  const caffeine = s.caffeine.entries?.[0];
  if (caffeine?.type?.trim()) {
    let c = `${caffeine.type.trim()}`;
    if (caffeine.amountNote?.trim()) c += `を${caffeine.amountNote.trim()}`;
    if (caffeine.lastIntakeTimeTypical?.trim()) {
      c += `、最後は${caffeine.lastIntakeTimeTypical.trim()}頃`;
    }
    sentences.push(`${c}。`);
  }

  if (s.hydration.totalFluidMl != null) {
    sentences.push(`普段の水分摂取は約${s.hydration.totalFluidMl}mL/日。`);
  }

  if (s.exercise.frequency?.trim()) {
    const types = [
      ...(s.exercise.types ?? []),
      s.exercise.typeOther?.trim() || "",
    ].filter(Boolean);
    let ex = `運動習慣は${s.exercise.frequency.trim()}`;
    if (types.length) ex += `（${types.join("・")}）`;
    sentences.push(`${ex}。`);
  }

  const healthBits: string[] = [];
  if (s.health.nasalCongestionHabitual?.trim()) {
    healthBits.push(`鼻づまり（${s.health.nasalCongestionHabitual.trim()}）`);
  }
  if (s.health.pollenAllergy?.trim()) healthBits.push("花粉症");
  if (s.health.allergies?.trim()) healthBits.push("アレルギー");
  if (s.health.snoring?.trim()) healthBits.push("いびき");
  if (healthBits.length) sentences.push(`${healthBits.join("・")}あり。`);

  const bedTemp = s.sleepEnvironment.bedroomBedtimeTemperatureC;
  const bedHum = s.sleepEnvironment.bedroomBedtimeHumidityPercent;
  if (bedTemp != null || bedHum != null) {
    const env: string[] = [];
    if (bedTemp != null) env.push(`${bedTemp}℃`);
    if (bedHum != null) env.push(`湿度${bedHum}%`);
    sentences.push(`寝室は${env.join("、")}。`);
  }

  return sentences.join("").replace(/。。+/g, "。").trim();
}

export type BuildAnalysisAiInputArgs = {
  analysisDate?: string;
  clientId?: string;
  clientName?: string;
  soxaiMetrics?: AnalysisMetrics | null;
  dayContext?: AnalysisDayContext | null;
  fixedProfile?: ClientProfileSections | null;
  weather?: Record<string, unknown> | null;
};

/**
 * Medical / Visual / PDF が将来同じ分析結果を使うための共通 AI 入力 JSON
 */
export function buildAnalysisAiInput(
  args: BuildAnalysisAiInputArgs,
): AnalysisAiInput {
  const soxaiMetrics = compactSoxaiMetrics(args.soxaiMetrics ?? null);
  const dayContext = compactDayContext(args.dayContext ?? null);
  const fixedProfile = compactFixedProfile(args.fixedProfile ?? null);
  const weather =
    args.weather && Object.keys(args.weather).length > 0
      ? (omitEmptyDeep(args.weather) as Record<string, unknown> | undefined)
      : undefined;

  const fixedProfileSummary = summarizeFixedProfileForAi(
    args.fixedProfile ?? null,
  );

  const notesForModel = [
    "優先順位: SOXAI実測 > 当日情報 > 固定プロフィール > 気象 > 一般参考基準",
    "未入力項目は触れない。推測・断定しない。",
    "固定プロフィールは普段の傾向。当日の状態と混同しない。",
    "医療診断・病名の断定はしない。",
  ];

  return {
    schemaVersion: 1,
    priorityOrder: [
      "soxai_measured",
      "day_context",
      "fixed_profile",
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
    weather,
    notesForModel,
  };
}

/** 開発環境向けログ（本番画面には出さない） */
export function logAnalysisAiInputInDev(aiInput: AnalysisAiInput) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[analysis-ai-input]", JSON.stringify(aiInput, null, 2));
}
