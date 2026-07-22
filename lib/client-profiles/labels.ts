/**
 * 固定プロフィールの表示名（入力・確認・詳細で共通）
 * 専門用語を避け、一般利用者が理解できる短い日本語に統一する。
 */

export type ProfileLabelKey =
  | "fullName"
  | "birthDate"
  | "ageYears"
  | "gender"
  | "heightCm"
  | "weightKg"
  | "bmi"
  | "residenceRegion"
  | "workplaceRegion"
  | "occupation"
  | "workStyle"
  | "workStartTime"
  | "workEndTime"
  | "workDaysPerWeek"
  | "nightShiftsPerMonth"
  | "workStressSelf"
  | "environmentAttributes"
  | "environmentTraitsOther"
  | "worksInHeat"
  | "heatEnvironmentTypes"
  | "heatEnvironmentOther"
  | "heatRoomTemperatureC"
  | "heatHumidityPercent"
  | "exposureDurationMinutes"
  | "sweatAmount"
  | "waterIntakeDuringWorkMl"
  | "breakCount"
  | "changesClothesAfterWork"
  | "showerAfterWork"
  | "cooldownDurationMinutes"
  | "movesImmediatelyAfterWork"
  | "walkOneWayMinutes"
  | "bicycleOneWayMinutes"
  | "trainOneWayMinutes"
  | "busOneWayMinutes"
  | "carOneWayMinutes"
  | "motorcycleOneWayMinutes"
  | "transferCount"
  | "commuteDaysPerWeek"
  | "crowdingLevel"
  | "commuteStressSelf"
  | "drinkingFrequency"
  | "drinkingAmountPerOccasion"
  | "smokingType"
  | "caffeineType"
  | "caffeineAmount"
  | "caffeineLastIntakeTime"
  | "caffeineDecaf"
  | "hydrationWaterMl"
  | "hydrationTeaMl"
  | "hydrationCoffeeTeaMl"
  | "hydrationSportsDrinkMl"
  | "hydrationAlcoholMl"
  | "hydrationOtherMl"
  | "hydrationTotalMl"
  | "preSleep2hFluidMl"
  | "nocturia"
  | "nighttimeUrinationCount"
  | "exerciseFrequency"
  | "exerciseTypes"
  | "exerciseTypeOther"
  | "exerciseDurationMinutes"
  | "exerciseIntensity"
  | "exerciseEndTime"
  | "exerciseInHeat"
  | "exerciseSweatAmount"
  | "fluidAfterExercise"
  | "changesClothesAfterExercise"
  | "showerAfterExercise"
  | "exerciseCooldownMinutes"
  | "movesImmediatelyAfterExercise"
  | "menopause"
  | "medicationsNote"
  | "sleepMedicationUse"
  | "nasalCongestionHabitual"
  | "pollenAllergy"
  | "allergies"
  | "snoring"
  | "sleepApneaDiagnosed"
  | "hypertension"
  | "diabetes"
  | "dyslipidemia"
  | "heartDisease"
  | "respiratoryDisease"
  | "chronicPain"
  | "otherConditions"
  | "typicalBedtime"
  | "typicalWakeTime"
  | "napHabit"
  | "daytimeSleepiness"
  | "sleepSatisfaction"
  | "cohabitants"
  | "youngChildren"
  | "caregiving"
  | "pets"
  | "homeTemperatureC"
  | "homeHumidityPercent"
  | "bedroomBedtimeTemperatureC"
  | "bedroomBedtimeHumidityPercent"
  | "workplaceTemperatureC"
  | "workplaceHumidityPercent"
  | "airConditioning"
  | "heating"
  | "dehumidifier"
  | "humidifier"
  | "fan"
  | "windowOpen"
  | "blackoutCurtain";

/** 画面共通の表示名 */
export const PROFILE_LABELS: Record<ProfileLabelKey, string> = {
  fullName: "氏名",
  birthDate: "生年月日",
  ageYears: "年齢",
  gender: "性別",
  heightCm: "身長（cm）",
  weightKg: "体重（kg）",
  bmi: "BMI",
  residenceRegion: "居住地域",
  workplaceRegion: "勤務先地域",
  occupation: "職業",
  workStyle: "勤務形態",
  workStartTime: "勤務開始",
  workEndTime: "勤務終了",
  workDaysPerWeek: "週の勤務日数",
  nightShiftsPerMonth: "夜勤回数（回/月）",
  workStressSelf: "仕事で感じるストレス",
  environmentAttributes: "仕事の環境・特徴",
  environmentTraitsOther: "その他の環境メモ",
  worksInHeat: "高温環境での活動・勤務",
  heatEnvironmentTypes: "暑い環境の種類",
  heatEnvironmentOther: "暑い環境の種類（自由入力）",
  heatRoomTemperatureC: "普段の室温（℃）",
  heatHumidityPercent: "普段の湿度（%）",
  exposureDurationMinutes: "高温環境にいた時間（分）",
  sweatAmount: "汗をかいた量",
  waterIntakeDuringWorkMl: "活動中の水分摂取（mL）",
  breakCount: "休憩回数",
  changesClothesAfterWork: "活動後の着替え",
  showerAfterWork: "活動後のシャワー",
  cooldownDurationMinutes: "涼しい場所で休んだ時間（分）",
  movesImmediatelyAfterWork: "終了後すぐに移動した",
  walkOneWayMinutes: "徒歩（片道・分）",
  bicycleOneWayMinutes: "自転車（片道・分）",
  trainOneWayMinutes: "電車（片道・分）",
  busOneWayMinutes: "バス（片道・分）",
  carOneWayMinutes: "車（片道・分）",
  motorcycleOneWayMinutes: "バイク（片道・分）",
  transferCount: "乗り換え回数",
  commuteDaysPerWeek: "通勤日数（日/週）",
  crowdingLevel: "混雑の程度",
  commuteStressSelf: "通勤で感じるストレス",
  drinkingFrequency: "普段の飲酒頻度",
  drinkingAmountPerOccasion: "1回あたりの飲酒量",
  smokingType: "喫煙",
  caffeineType: "カフェインの種類",
  caffeineAmount: "カフェインの量",
  caffeineLastIntakeTime: "最後に飲む時刻（目安）",
  caffeineDecaf: "デカフェ",
  hydrationWaterMl: "水（mL/日）",
  hydrationTeaMl: "お茶（mL/日）",
  hydrationCoffeeTeaMl: "コーヒー・紅茶（mL/日）",
  hydrationSportsDrinkMl: "スポーツドリンク（mL/日）",
  hydrationAlcoholMl: "アルコール（mL/日）",
  hydrationOtherMl: "その他の飲み物（mL/日）",
  hydrationTotalMl: "水分の合計（mL/日）",
  preSleep2hFluidMl: "就寝前2時間の水分（mL）",
  nocturia: "夜間の頻尿",
  nighttimeUrinationCount: "夜間排尿回数",
  exerciseFrequency: "運動の頻度",
  exerciseTypes: "運動の種類",
  exerciseTypeOther: "運動の種類（自由入力）",
  exerciseDurationMinutes: "運動時間（分）",
  exerciseIntensity: "運動の強度",
  exerciseEndTime: "運動の終了時刻（目安）",
  exerciseInHeat: "暑い環境での運動",
  exerciseSweatAmount: "汗をかいた量",
  fluidAfterExercise: "運動後の水分補給",
  changesClothesAfterExercise: "運動後の着替え",
  showerAfterExercise: "運動後のシャワー",
  exerciseCooldownMinutes: "涼しい場所で休んだ時間（分）",
  movesImmediatelyAfterExercise: "終了後すぐに移動した",
  menopause: "更年期",
  medicationsNote: "服薬",
  sleepMedicationUse: "睡眠薬",
  nasalCongestionHabitual: "普段の鼻づまり",
  pollenAllergy: "花粉症",
  allergies: "アレルギー",
  snoring: "いびき",
  sleepApneaDiagnosed: "睡眠時無呼吸",
  hypertension: "高血圧",
  diabetes: "糖尿病",
  dyslipidemia: "脂質異常症",
  heartDisease: "心疾患",
  respiratoryDisease: "呼吸器疾患",
  chronicPain: "慢性疼痛",
  otherConditions: "その他の持病・体調",
  typicalBedtime: "普段の就寝時刻",
  typicalWakeTime: "普段の起床時刻",
  napHabit: "昼寝の習慣",
  daytimeSleepiness: "日中の眠気",
  sleepSatisfaction: "睡眠の満足度",
  cohabitants: "同居家族",
  youngChildren: "小さな子ども",
  caregiving: "介護",
  pets: "ペット",
  homeTemperatureC: "自宅の室温（℃）",
  homeHumidityPercent: "自宅の湿度（%）",
  bedroomBedtimeTemperatureC: "寝室の室温（℃）",
  bedroomBedtimeHumidityPercent: "寝室の湿度（%）",
  workplaceTemperatureC: "仕事場の室温（℃）",
  workplaceHumidityPercent: "仕事場の湿度（%）",
  airConditioning: "冷房",
  heating: "暖房",
  dehumidifier: "除湿",
  humidifier: "加湿器",
  fan: "扇風機",
  windowOpen: "窓を開けて寝る",
  blackoutCurtain: "遮光カーテン",
};

/** 入力画面用の短い補足（確認画面では不要） */
export const PROFILE_HINTS: Partial<Record<ProfileLabelKey, string>> = {
  workStressSelf: "普段、仕事でどのくらいストレスを感じるか",
  environmentAttributes:
    "職業名より、実際の仕事の環境・特徴を優先して選んでください",
  worksInHeat:
    "ホットヨガ・サウナ・厨房・炎天下など、暑い環境での活動や勤務があるか",
  heatEnvironmentTypes: "当てはまる暑い環境を選んでください",
  heatRoomTemperatureC: "普段の活動場所の室温の目安",
  heatHumidityPercent: "普段の活動場所の湿度の目安",
  exposureDurationMinutes:
    "ホットヨガ・サウナ・厨房・炎天下など、暑い環境にいた時間",
  sweatAmount: "普段、どのくらい汗をかくかの目安",
  waterIntakeDuringWorkMl: "暑い環境での活動中に飲む水分量の目安",
  changesClothesAfterWork: "活動や仕事の後に着替える習慣があるか",
  showerAfterWork: "活動や仕事の後にシャワーを浴びる習慣があるか",
  cooldownDurationMinutes:
    "活動後に体を落ち着かせるため、涼しい場所で休んだ時間",
  movesImmediatelyAfterWork:
    "活動や仕事の後、休まずに屋外や次の場所へ移動した場合",
  commuteStressSelf: "普段の通勤で感じるストレス",
  drinkingFrequency: "普段の飲酒の頻度（当日の量は分析時に別途入力）",
  exerciseInHeat: "ホットヨガなど、暑い環境で運動することがあるか",
  exerciseSweatAmount: "運動時にどのくらい汗をかくかの目安",
  exerciseCooldownMinutes:
    "運動後に体を落ち着かせるため、涼しい場所で休んだ時間",
  movesImmediatelyAfterExercise:
    "運動の後、休まずに屋外や次の場所へ移動した場合",
  nighttimeUrinationCount: "0回も有効な回答です",
  nasalCongestionHabitual: "普段の鼻づまりの傾向（当日の状態は分析時に別途）",
  bedroomBedtimeTemperatureC: "普段、就寝時の寝室の室温の目安",
  bedroomBedtimeHumidityPercent: "普段、就寝時の寝室の湿度の目安",
};

/** ウィザードのステップ見出し */
export const PROFILE_STEP_LABELS = {
  basic: "基本情報",
  work: "職業・勤務",
  environment: "仕事の環境・特徴",
  heat: "高温環境での活動・勤務",
  commute: "通勤",
  lifestyle: "生活習慣",
  hydration: "水分",
  exercise: "運動",
  health: "健康情報",
  sleep: "睡眠・環境",
} as const;

/** セクション見出し（確認画面用） */
export const PROFILE_SECTION_TITLES = {
  basic: "基本情報",
  work: "職業・勤務形態",
  environment: "仕事の環境・特徴",
  heat: "高温環境での活動・勤務",
  commute: "通勤",
  lifestyle: "生活習慣",
  hydration: "水分",
  exercise: "運動",
  health: "健康情報",
  sleep: "睡眠・生活環境",
} as const;

export function profileLabel(key: ProfileLabelKey): string {
  return PROFILE_LABELS[key];
}

export function profileHint(key: ProfileLabelKey): string | undefined {
  return PROFILE_HINTS[key];
}
