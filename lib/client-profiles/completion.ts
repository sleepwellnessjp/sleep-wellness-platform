/**
 * 固定プロフィール完成率
 * 完成率 = 入力済み項目数 ÷ 全項目数
 */

import {
  isMissingNumber,
  isMissingString,
} from "@/lib/client-profiles/display";
import {
  PROFILE_LABELS,
  PROFILE_SECTION_TITLES,
  type ProfileLabelKey,
} from "@/lib/client-profiles/labels";
import type { ClientProfileSections } from "@/lib/client-profiles/types";
import { NUMBER_RULES } from "@/lib/client-profiles/validation";

/** ウィザードのステップ ID（未入力クリック時の遷移用） */
export type ProfileCompletionStepId =
  | "basic"
  | "work"
  | "environment"
  | "heat"
  | "commute"
  | "lifestyle"
  | "hydration"
  | "exercise"
  | "health"
  | "sleep";

export type ProfileCompletionField = {
  key: ProfileLabelKey;
  label: string;
  stepId: ProfileCompletionStepId;
  sectionTitle: string;
  getValue: (sections: ClientProfileSections) => unknown;
  numberRule?: (typeof NUMBER_RULES)[keyof typeof NUMBER_RULES];
};

function isFilledValue(
  value: unknown,
  numberRule?: (typeof NUMBER_RULES)[keyof typeof NUMBER_RULES],
): boolean {
  if (value == null) return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") {
    return !isMissingNumber(value, numberRule ?? NUMBER_RULES.nonNegative);
  }
  if (typeof value === "string") {
    return !isMissingString(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => {
      if (typeof item === "string") return Boolean(item.trim());
      if (typeof item === "number") {
        return !isMissingNumber(item, numberRule ?? NUMBER_RULES.nonNegative);
      }
      return false;
    });
  }
  return false;
}

/**
 * 確認画面と対応する入力対象項目。
 * BMI・水分合計など自動計算のみの項目は含めない。
 */
export const PROFILE_COMPLETION_FIELDS: ProfileCompletionField[] = [
  {
    key: "fullName",
    label: PROFILE_LABELS.fullName,
    stepId: "basic",
    sectionTitle: PROFILE_SECTION_TITLES.basic,
    getValue: (s) => s.basic.fullName,
  },
  {
    key: "birthDate",
    label: PROFILE_LABELS.birthDate,
    stepId: "basic",
    sectionTitle: PROFILE_SECTION_TITLES.basic,
    getValue: (s) => s.basic.birthDate,
  },
  {
    key: "ageYears",
    label: PROFILE_LABELS.ageYears,
    stepId: "basic",
    sectionTitle: PROFILE_SECTION_TITLES.basic,
    getValue: (s) => s.basic.ageYears,
    numberRule: NUMBER_RULES.age,
  },
  {
    key: "gender",
    label: PROFILE_LABELS.gender,
    stepId: "basic",
    sectionTitle: PROFILE_SECTION_TITLES.basic,
    getValue: (s) => s.basic.gender,
  },
  {
    key: "heightCm",
    label: PROFILE_LABELS.heightCm,
    stepId: "basic",
    sectionTitle: PROFILE_SECTION_TITLES.basic,
    getValue: (s) => s.basic.heightCm,
    numberRule: NUMBER_RULES.positive,
  },
  {
    key: "weightKg",
    label: PROFILE_LABELS.weightKg,
    stepId: "basic",
    sectionTitle: PROFILE_SECTION_TITLES.basic,
    getValue: (s) => s.basic.weightKg,
    numberRule: NUMBER_RULES.positive,
  },
  {
    key: "residenceRegion",
    label: PROFILE_LABELS.residenceRegion,
    stepId: "basic",
    sectionTitle: PROFILE_SECTION_TITLES.basic,
    getValue: (s) => s.basic.residenceRegion,
  },
  {
    key: "workplaceRegion",
    label: PROFILE_LABELS.workplaceRegion,
    stepId: "basic",
    sectionTitle: PROFILE_SECTION_TITLES.basic,
    getValue: (s) => s.basic.workplaceRegion,
  },
  {
    key: "occupation",
    label: PROFILE_LABELS.occupation,
    stepId: "work",
    sectionTitle: PROFILE_SECTION_TITLES.work,
    getValue: (s) => s.work.occupationCustom || s.work.occupationPreset,
  },
  {
    key: "workStyle",
    label: PROFILE_LABELS.workStyle,
    stepId: "work",
    sectionTitle: PROFILE_SECTION_TITLES.work,
    getValue: (s) => s.work.workStyle,
  },
  {
    key: "workStartTime",
    label: PROFILE_LABELS.workStartTime,
    stepId: "work",
    sectionTitle: PROFILE_SECTION_TITLES.work,
    getValue: (s) => s.work.workStartTime,
  },
  {
    key: "workEndTime",
    label: PROFILE_LABELS.workEndTime,
    stepId: "work",
    sectionTitle: PROFILE_SECTION_TITLES.work,
    getValue: (s) => s.work.workEndTime,
  },
  {
    key: "workDaysPerWeek",
    label: PROFILE_LABELS.workDaysPerWeek,
    stepId: "work",
    sectionTitle: PROFILE_SECTION_TITLES.work,
    getValue: (s) => s.work.workDaysPerWeek,
  },
  {
    key: "nightShiftsPerMonth",
    label: PROFILE_LABELS.nightShiftsPerMonth,
    stepId: "work",
    sectionTitle: PROFILE_SECTION_TITLES.work,
    getValue: (s) => s.work.nightShiftsPerMonth,
  },
  {
    key: "workStressSelf",
    label: PROFILE_LABELS.workStressSelf,
    stepId: "work",
    sectionTitle: PROFILE_SECTION_TITLES.work,
    getValue: (s) => s.work.workStressSelf,
  },
  {
    key: "environmentAttributes",
    label: PROFILE_LABELS.environmentAttributes,
    stepId: "environment",
    sectionTitle: PROFILE_SECTION_TITLES.environment,
    getValue: (s) => s.work.environmentAttributeIds ?? s.work.traits ?? [],
  },
  {
    key: "environmentTraitsOther",
    label: PROFILE_LABELS.environmentTraitsOther,
    stepId: "environment",
    sectionTitle: PROFILE_SECTION_TITLES.environment,
    getValue: (s) => s.work.traitsOther,
  },
  {
    key: "worksInHeat",
    label: PROFILE_LABELS.worksInHeat,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.worksInHeat,
  },
  {
    key: "heatEnvironmentTypes",
    label: PROFILE_LABELS.heatEnvironmentTypes,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.heatEnvironmentTypes,
  },
  {
    key: "heatEnvironmentOther",
    label: PROFILE_LABELS.heatEnvironmentOther,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.heatEnvironmentOther,
  },
  {
    key: "heatRoomTemperatureC",
    label: PROFILE_LABELS.heatRoomTemperatureC,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.roomTemperatureC,
    numberRule: NUMBER_RULES.temperatureC,
  },
  {
    key: "heatHumidityPercent",
    label: PROFILE_LABELS.heatHumidityPercent,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.humidityPercent,
    numberRule: NUMBER_RULES.humidity,
  },
  {
    key: "exposureDurationMinutes",
    label: PROFILE_LABELS.exposureDurationMinutes,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.exposureDurationMinutes,
  },
  {
    key: "sweatAmount",
    label: PROFILE_LABELS.sweatAmount,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.sweatAmount,
  },
  {
    key: "waterIntakeDuringWorkMl",
    label: PROFILE_LABELS.waterIntakeDuringWorkMl,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.waterIntakeDuringWorkMl,
  },
  {
    key: "breakCount",
    label: PROFILE_LABELS.breakCount,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.breakCount,
  },
  {
    key: "changesClothesAfterWork",
    label: PROFILE_LABELS.changesClothesAfterWork,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.changesClothesAfterWork,
  },
  {
    key: "showerAfterWork",
    label: PROFILE_LABELS.showerAfterWork,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.showerAfterWork,
  },
  {
    key: "cooldownDurationMinutes",
    label: PROFILE_LABELS.cooldownDurationMinutes,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.cooldownDurationMinutes,
  },
  {
    key: "movesImmediatelyAfterWork",
    label: PROFILE_LABELS.movesImmediatelyAfterWork,
    stepId: "heat",
    sectionTitle: PROFILE_SECTION_TITLES.heat,
    getValue: (s) => s.heatExposure.movesImmediatelyAfterWork,
  },
  {
    key: "walkOneWayMinutes",
    label: PROFILE_LABELS.walkOneWayMinutes,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.walkOneWayMinutes,
  },
  {
    key: "bicycleOneWayMinutes",
    label: PROFILE_LABELS.bicycleOneWayMinutes,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.bicycleOneWayMinutes,
  },
  {
    key: "trainOneWayMinutes",
    label: PROFILE_LABELS.trainOneWayMinutes,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.trainOneWayMinutes,
  },
  {
    key: "busOneWayMinutes",
    label: PROFILE_LABELS.busOneWayMinutes,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.busOneWayMinutes,
  },
  {
    key: "carOneWayMinutes",
    label: PROFILE_LABELS.carOneWayMinutes,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.carOneWayMinutes,
  },
  {
    key: "motorcycleOneWayMinutes",
    label: PROFILE_LABELS.motorcycleOneWayMinutes,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.motorcycleOneWayMinutes,
  },
  {
    key: "transferCount",
    label: PROFILE_LABELS.transferCount,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.transferCount,
  },
  {
    key: "commuteDaysPerWeek",
    label: PROFILE_LABELS.commuteDaysPerWeek,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.commuteDaysPerWeek,
  },
  {
    key: "crowdingLevel",
    label: PROFILE_LABELS.crowdingLevel,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.crowdingLevel,
  },
  {
    key: "commuteStressSelf",
    label: PROFILE_LABELS.commuteStressSelf,
    stepId: "commute",
    sectionTitle: PROFILE_SECTION_TITLES.commute,
    getValue: (s) => s.commute.commuteStressSelf,
  },
  {
    key: "drinkingFrequency",
    label: PROFILE_LABELS.drinkingFrequency,
    stepId: "lifestyle",
    sectionTitle: PROFILE_SECTION_TITLES.lifestyle,
    getValue: (s) => s.lifestyle.drinkingFrequency,
  },
  {
    key: "drinkingAmountPerOccasion",
    label: PROFILE_LABELS.drinkingAmountPerOccasion,
    stepId: "lifestyle",
    sectionTitle: PROFILE_SECTION_TITLES.lifestyle,
    getValue: (s) => s.lifestyle.drinkingAmountPerOccasion,
  },
  {
    key: "smokingType",
    label: PROFILE_LABELS.smokingType,
    stepId: "lifestyle",
    sectionTitle: PROFILE_SECTION_TITLES.lifestyle,
    getValue: (s) => s.lifestyle.smokingType,
  },
  {
    key: "caffeineType",
    label: PROFILE_LABELS.caffeineType,
    stepId: "lifestyle",
    sectionTitle: PROFILE_SECTION_TITLES.lifestyle,
    getValue: (s) => s.caffeine.entries?.[0]?.type,
  },
  {
    key: "caffeineAmount",
    label: PROFILE_LABELS.caffeineAmount,
    stepId: "lifestyle",
    sectionTitle: PROFILE_SECTION_TITLES.lifestyle,
    getValue: (s) => s.caffeine.entries?.[0]?.amountNote,
  },
  {
    key: "caffeineLastIntakeTime",
    label: PROFILE_LABELS.caffeineLastIntakeTime,
    stepId: "lifestyle",
    sectionTitle: PROFILE_SECTION_TITLES.lifestyle,
    getValue: (s) => s.caffeine.entries?.[0]?.lastIntakeTimeTypical,
  },
  {
    key: "caffeineDecaf",
    label: PROFILE_LABELS.caffeineDecaf,
    stepId: "lifestyle",
    sectionTitle: PROFILE_SECTION_TITLES.lifestyle,
    getValue: (s) => s.caffeine.entries?.[0]?.isDecaf,
  },
  {
    key: "hydrationWaterMl",
    label: PROFILE_LABELS.hydrationWaterMl,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.waterMl,
  },
  {
    key: "hydrationTeaMl",
    label: PROFILE_LABELS.hydrationTeaMl,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.teaMl,
  },
  {
    key: "hydrationCoffeeTeaMl",
    label: PROFILE_LABELS.hydrationCoffeeTeaMl,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.coffeeTeaMl,
  },
  {
    key: "hydrationSportsDrinkMl",
    label: PROFILE_LABELS.hydrationSportsDrinkMl,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.sportsDrinkMl,
  },
  {
    key: "hydrationAlcoholMl",
    label: PROFILE_LABELS.hydrationAlcoholMl,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.alcoholMl,
  },
  {
    key: "hydrationOtherMl",
    label: PROFILE_LABELS.hydrationOtherMl,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.otherBeverageMl,
  },
  {
    key: "preSleep2hFluidMl",
    label: PROFILE_LABELS.preSleep2hFluidMl,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.preSleep2hFluidMl,
  },
  {
    key: "nocturia",
    label: PROFILE_LABELS.nocturia,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.nocturia,
  },
  {
    key: "nighttimeUrinationCount",
    label: PROFILE_LABELS.nighttimeUrinationCount,
    stepId: "hydration",
    sectionTitle: PROFILE_SECTION_TITLES.hydration,
    getValue: (s) => s.hydration.nighttimeUrinationCount,
  },
  {
    key: "exerciseFrequency",
    label: PROFILE_LABELS.exerciseFrequency,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.frequency,
  },
  {
    key: "exerciseTypes",
    label: PROFILE_LABELS.exerciseTypes,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.types,
  },
  {
    key: "exerciseTypeOther",
    label: PROFILE_LABELS.exerciseTypeOther,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.typeOther,
  },
  {
    key: "exerciseDurationMinutes",
    label: PROFILE_LABELS.exerciseDurationMinutes,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.durationMinutes,
  },
  {
    key: "exerciseIntensity",
    label: PROFILE_LABELS.exerciseIntensity,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.intensity,
  },
  {
    key: "exerciseEndTime",
    label: PROFILE_LABELS.exerciseEndTime,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.endTimeTypical,
  },
  {
    key: "exerciseInHeat",
    label: PROFILE_LABELS.exerciseInHeat,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.inHeatEnvironment,
  },
  {
    key: "exerciseSweatAmount",
    label: PROFILE_LABELS.exerciseSweatAmount,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.sweatAmount,
  },
  {
    key: "fluidAfterExercise",
    label: PROFILE_LABELS.fluidAfterExercise,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.fluidAfterExercise,
  },
  {
    key: "changesClothesAfterExercise",
    label: PROFILE_LABELS.changesClothesAfterExercise,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.changesClothesAfter,
  },
  {
    key: "showerAfterExercise",
    label: PROFILE_LABELS.showerAfterExercise,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.showerAfter,
  },
  {
    key: "exerciseCooldownMinutes",
    label: PROFILE_LABELS.exerciseCooldownMinutes,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.cooldownDurationMinutes,
  },
  {
    key: "movesImmediatelyAfterExercise",
    label: PROFILE_LABELS.movesImmediatelyAfterExercise,
    stepId: "exercise",
    sectionTitle: PROFILE_SECTION_TITLES.exercise,
    getValue: (s) => s.exercise.movesImmediatelyAfter,
  },
  {
    key: "menopause",
    label: PROFILE_LABELS.menopause,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.menopause,
  },
  {
    key: "medicationsNote",
    label: PROFILE_LABELS.medicationsNote,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.medicationsNote,
  },
  {
    key: "sleepMedicationUse",
    label: PROFILE_LABELS.sleepMedicationUse,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.sleepMedicationUse,
  },
  {
    key: "nasalCongestionHabitual",
    label: PROFILE_LABELS.nasalCongestionHabitual,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.nasalCongestionHabitual,
  },
  {
    key: "pollenAllergy",
    label: PROFILE_LABELS.pollenAllergy,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.pollenAllergy,
  },
  {
    key: "allergies",
    label: PROFILE_LABELS.allergies,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.allergies,
  },
  {
    key: "snoring",
    label: PROFILE_LABELS.snoring,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.snoring,
  },
  {
    key: "sleepApneaDiagnosed",
    label: PROFILE_LABELS.sleepApneaDiagnosed,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.sleepApneaDiagnosed,
  },
  {
    key: "hypertension",
    label: PROFILE_LABELS.hypertension,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.hypertension,
  },
  {
    key: "diabetes",
    label: PROFILE_LABELS.diabetes,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.diabetes,
  },
  {
    key: "dyslipidemia",
    label: PROFILE_LABELS.dyslipidemia,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.dyslipidemia,
  },
  {
    key: "heartDisease",
    label: PROFILE_LABELS.heartDisease,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.heartDisease,
  },
  {
    key: "respiratoryDisease",
    label: PROFILE_LABELS.respiratoryDisease,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.respiratoryDisease,
  },
  {
    key: "chronicPain",
    label: PROFILE_LABELS.chronicPain,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.chronicPain,
  },
  {
    key: "otherConditions",
    label: PROFILE_LABELS.otherConditions,
    stepId: "health",
    sectionTitle: PROFILE_SECTION_TITLES.health,
    getValue: (s) => s.health.otherConditions,
  },
  {
    key: "typicalBedtime",
    label: PROFILE_LABELS.typicalBedtime,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.typicalBedtime,
  },
  {
    key: "typicalWakeTime",
    label: PROFILE_LABELS.typicalWakeTime,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.typicalWakeTime,
  },
  {
    key: "napHabit",
    label: PROFILE_LABELS.napHabit,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.napHabit,
  },
  {
    key: "daytimeSleepiness",
    label: PROFILE_LABELS.daytimeSleepiness,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.daytimeSleepiness,
  },
  {
    key: "sleepSatisfaction",
    label: PROFILE_LABELS.sleepSatisfaction,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.sleepSatisfaction,
  },
  {
    key: "cohabitants",
    label: PROFILE_LABELS.cohabitants,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.cohabitants,
  },
  {
    key: "youngChildren",
    label: PROFILE_LABELS.youngChildren,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.youngChildren,
  },
  {
    key: "caregiving",
    label: PROFILE_LABELS.caregiving,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.caregiving,
  },
  {
    key: "pets",
    label: PROFILE_LABELS.pets,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.pets,
  },
  {
    key: "homeTemperatureC",
    label: PROFILE_LABELS.homeTemperatureC,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.homeTemperatureC,
    numberRule: NUMBER_RULES.temperatureC,
  },
  {
    key: "homeHumidityPercent",
    label: PROFILE_LABELS.homeHumidityPercent,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.homeHumidityPercent,
    numberRule: NUMBER_RULES.humidity,
  },
  {
    key: "bedroomBedtimeTemperatureC",
    label: PROFILE_LABELS.bedroomBedtimeTemperatureC,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomBedtimeTemperatureC,
    numberRule: NUMBER_RULES.temperatureC,
  },
  {
    key: "bedroomBedtimeHumidityPercent",
    label: PROFILE_LABELS.bedroomBedtimeHumidityPercent,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomBedtimeHumidityPercent,
    numberRule: NUMBER_RULES.humidity,
  },
  {
    key: "workplaceTemperatureC",
    label: PROFILE_LABELS.workplaceTemperatureC,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.workplaceTemperatureC,
    numberRule: NUMBER_RULES.temperatureC,
  },
  {
    key: "workplaceHumidityPercent",
    label: PROFILE_LABELS.workplaceHumidityPercent,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.workplaceHumidityPercent,
    numberRule: NUMBER_RULES.humidity,
  },
  {
    key: "airConditioning",
    label: PROFILE_LABELS.airConditioning,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomControls?.airConditioning,
  },
  {
    key: "heating",
    label: PROFILE_LABELS.heating,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomControls?.heating,
  },
  {
    key: "dehumidifier",
    label: PROFILE_LABELS.dehumidifier,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomControls?.dehumidifier,
  },
  {
    key: "humidifier",
    label: PROFILE_LABELS.humidifier,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomControls?.humidifier,
  },
  {
    key: "fan",
    label: PROFILE_LABELS.fan,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomControls?.fan,
  },
  {
    key: "windowOpen",
    label: PROFILE_LABELS.windowOpen,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomControls?.windowOpen,
  },
  {
    key: "blackoutCurtain",
    label: PROFILE_LABELS.blackoutCurtain,
    stepId: "sleep",
    sectionTitle: PROFILE_SECTION_TITLES.sleep,
    getValue: (s) => s.sleepEnvironment.bedroomControls?.blackoutCurtain,
  },
];

export type MissingProfileField = {
  key: ProfileLabelKey;
  label: string;
  stepId: ProfileCompletionStepId;
  sectionTitle: string;
};

export type ProfileCompletion = {
  filledCount: number;
  totalCount: number;
  missingCount: number;
  /** 0〜100 の整数 */
  percent: number;
  missingFields: MissingProfileField[];
};

export type ProfileCompletionOverrides = {
  /** 生年月日から導出した年齢など、画面上の派生値 */
  ageYears?: number | null;
};

/**
 * 入力済み ÷ 全項目で完成率を算出する。
 */
export function calculateProfileCompletion(
  sections: ClientProfileSections,
  overrides?: ProfileCompletionOverrides,
): ProfileCompletion {
  const totalCount = PROFILE_COMPLETION_FIELDS.length;
  const missingFields: MissingProfileField[] = [];
  let filledCount = 0;

  for (const field of PROFILE_COMPLETION_FIELDS) {
    let value = field.getValue(sections);
    if (field.key === "ageYears" && overrides?.ageYears != null) {
      value = overrides.ageYears;
    }

    if (isFilledValue(value, field.numberRule)) {
      filledCount += 1;
    } else {
      missingFields.push({
        key: field.key,
        label: field.label,
        stepId: field.stepId,
        sectionTitle: field.sectionTitle,
      });
    }
  }

  const percent =
    totalCount === 0 ? 0 : Math.round((filledCount / totalCount) * 100);

  return {
    filledCount,
    totalCount,
    missingCount: missingFields.length,
    percent,
    missingFields,
  };
}

/** プログレスバー用（10ブロック） */
export function profileCompletionBlocks(percent: number): {
  filled: number;
  empty: number;
} {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)));
  return { filled, empty: 10 - filled };
}
