/**
 * Client Profile V2 — fixed profile JSONB sections + day context + weather
 * schema_version: 1
 *
 * Fixed profile → client_profiles
 * Per-analysis day data → analyses.day_context
 * Weather → weather_records
 *
 * Extension (see lib/masters/occupation-environment.ts +
 * docs/design-occupation-environment-baselines.md):
 * - occupation_master / client_occupation_attributes … 環境属性（職業名ではない）
 * - environment_event_master / analysis_environment_events … 環境イベント
 * - personal_baseline … 本人 当日/7/30/90/180/365 日基準（一般基準は最後の補助）
 * - MetricSample.provider … soxai / apple_watch / garmin / oura / manual 等
 */

import type { DayContextEnvironmentEvent } from "@/lib/masters/occupation-environment";

export type {
  AnalysisEnvironmentEvent,
  DayContextEnvironmentEvent,
  PersonalBaselineSnapshot,
} from "@/lib/masters/occupation-environment";

export const CLIENT_PROFILE_SCHEMA_VERSION = 1 as const;

/**
 * 職業プリセット（フォーム表示用）
 * AI 分析には渡さない。選択後は環境属性 ID へ展開する
 * （例: パン職人 → 高温・立ち仕事・早朝勤務・粉塵）
 * @see OCCUPATION_PRESET_TO_ATTRIBUTES
 */
export const OCCUPATION_PRESETS = [
  "事務職",
  "デスクワーク",
  "営業",
  "接客業",
  "看護師",
  "介護士",
  "医師",
  "保育士",
  "幼稚園教諭",
  "学校教諭",
  "調理師",
  "パン職人",
  "ガラス職人",
  "焼き鳥店の焼き手",
  "鰻店の焼き手",
  "厨房スタッフ",
  "ラーメン店の調理担当",
  "中華料理店の調理担当",
  "サウナ、温浴施設スタッフ",
  "ホットヨガ講師",
  "常温ヨガ講師",
  "マットピラティス講師",
  "マシンピラティス講師",
  "岩盤浴施設スタッフ",
  "製鉄、鋳造、溶接関係",
  "クリーニング工場",
  "ボイラー室勤務",
  "建設作業",
  "警備",
  "配送、運転",
  "屋外作業",
  "工場勤務",
  "自営業",
  "主婦、主夫",
  "学生",
  "無職",
  "その他",
] as const;

/**
 * 旧職業プリセット → 現行表示名。
 * 既存プロフィールの互換用（保存値は読み込み時に正規化可能）。
 */
export const OCCUPATION_PRESET_LEGACY_TO_CURRENT: Readonly<
  Record<string, string>
> = {
  ホットヨガインストラクター: "ホットヨガ講師",
  常温ヨガインストラクター: "常温ヨガ講師",
  マットピラティスインストラクター: "マットピラティス講師",
  マシンピラティスインストラクター: "マシンピラティス講師",
  ヨガインストラクター: "常温ヨガ講師",
  ピラティスインストラクター: "マットピラティス講師",
};

/** 旧名称を現行プリセット名へ揃える（未知の値はそのまま） */
export function canonicalizeOccupationPreset(
  preset: string | null | undefined,
): string {
  const trimmed = String(preset ?? "").trim();
  if (!trimmed) return "";
  return OCCUPATION_PRESET_LEGACY_TO_CURRENT[trimmed] ?? trimmed;
}

/**
 * 画面・レポート・PDF 向けの職業表示名。
 * custom 優先。プリセットは旧名称も現行表記へ変換する。
 */
export function formatOccupationLabel(
  occupationCustom?: string | null,
  occupationPreset?: string | null,
): string {
  const custom = String(occupationCustom ?? "").trim();
  if (custom) return canonicalizeOccupationPreset(custom);
  const preset = String(occupationPreset ?? "").trim();
  if (!preset || preset === "その他") return "";
  return canonicalizeOccupationPreset(preset);
}

export const WORK_STYLE_OPTIONS = [
  "日勤",
  "早朝勤務",
  "夜勤",
  "二交代",
  "三交代",
  "シフト制",
  "フレックス",
  "在宅勤務",
  "不規則勤務",
] as const;

export const WORK_TRAIT_OPTIONS = [
  "座り仕事が多い",
  "立ち仕事が多い",
  "歩く仕事",
  "重い物を持つ",
  "身体活動量が多い",
  "身体活動量が少ない",
  "長時間運転",
  "パソコン作業",
  "スマートフォン作業",
  "対人対応が多い",
  "強い集中を必要とする",
  "騒音がある",
  "屋外勤務",
  "高温環境（ホットヨガ・サウナ・厨房など）",
  "湿度が高い",
  "寒い環境",
  "乾燥した環境",
  "火・炉・オーブンの近く",
  "強い輻射熱",
  "煙が多い",
  "粉塵が多い",
  "夜間勤務",
  "早朝勤務",
  "休憩が取りにくい",
  "終了後すぐに移動する",
  "その他",
] as const;

export const SCREEN_TIME_OPTIONS = [
  "1時間未満",
  "1〜3時間",
  "3〜6時間",
  "6〜8時間",
  "8時間以上",
] as const;

export const HEAT_ENVIRONMENT_TYPES = [
  "ホットヨガ",
  "サウナ",
  "岩盤浴",
  "厨房",
  "パン工房",
  "焼き場",
  "ガラス工房",
  "製鉄、鋳造",
  "屋外作業",
  "その他",
] as const;

export const DRINKING_FREQUENCY_OPTIONS = [
  "飲まない",
  "月1〜数回",
  "週1〜2回",
  "週3〜5回",
  "毎日",
] as const;

export const SMOKING_TYPE_OPTIONS = [
  "吸わない",
  "紙巻きタバコ",
  "加熱式タバコ",
  "電子タバコ",
] as const;

export const CAFFEINE_TYPE_OPTIONS = [
  "コーヒー",
  "紅茶",
  "緑茶",
  "ウーロン茶",
  "抹茶",
  "ほうじ茶",
  "エナジードリンク",
  "コーラ",
  "カフェイン入りサプリ",
  "その他",
] as const;

export const EXERCISE_TYPE_OPTIONS = [
  "ヨガ",
  "ホットヨガ",
  "ピラティス",
  "筋力トレーニング",
  "ランニング",
  "ウォーキング",
  "水泳",
  "自転車",
  "スポーツ",
  "その他",
] as const;

export const INDOOR_OUTDOOR_OPTIONS = ["屋内", "屋外", "両方"] as const;

export type IndoorOutdoor = (typeof INDOOR_OUTDOOR_OPTIONS)[number] | "";

// ---------------------------------------------------------------------------
// 1. basic
// ---------------------------------------------------------------------------

export type ClientProfileBasic = {
  /** 氏名（clients.name と同期可） */
  fullName?: string;
  /** YYYY-MM-DD */
  birthDate?: string;
  /** 年齢（歳）。生年月日から自動計算、または直接入力 */
  ageYears?: number | null;
  gender?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  /** 身長・体重から自動計算 */
  bmi?: number | null;
  residenceRegion?: string;
  workplaceRegion?: string;
};

// ---------------------------------------------------------------------------
// 2. work
// ---------------------------------------------------------------------------

export type ClientProfileWork = {
  occupationPreset?: string;
  occupationCustom?: string;
  workStyle?: string;
  workStartTime?: string;
  workEndTime?: string;
  workDurationHours?: number | null;
  workDaysPerWeek?: number | null;
  overtimeHoursPerWeek?: number | null;
  remoteWorkFrequency?: string;
  nightShiftsPerMonth?: number | null;
  workStressSelf?: string;
  breakCountPerDay?: number | null;
  breakTotalDurationMinutes?: number | null;
  /** 表示用ラベル配列（後方互換）。正規化は environmentAttributeIds */
  traits?: string[];
  traitsOther?: string;
  /**
   * occupation_master.id の配列（勤務環境属性）。
   * 例: high_heat, standing_work, night_shift, pc_work
   */
  environmentAttributeIds?: string[];
  pcUsageDaily?: string;
  smartphoneUsageDaily?: string;
};

// ---------------------------------------------------------------------------
// 3. commute
// ---------------------------------------------------------------------------

export type CommuteModeMinutes = {
  walkOneWayMinutes?: number | null;
  bicycleOneWayMinutes?: number | null;
  trainOneWayMinutes?: number | null;
  busOneWayMinutes?: number | null;
  carOneWayMinutes?: number | null;
  motorcycleOneWayMinutes?: number | null;
  otherOneWayMinutes?: number | null;
  otherModeLabel?: string;
};

export type ClientProfileCommute = CommuteModeMinutes & {
  transferCount?: number | null;
  commuteDaysPerWeek?: number | null;
  crowdingLevel?: string;
  commuteStressSelf?: string;
};

// ---------------------------------------------------------------------------
// 4. heatExposure（固定＝普段の傾向。当日の実測は AnalysisDayContext）
// ---------------------------------------------------------------------------

/**
 * 固定プロフィールの高温環境（普段の傾向）
 * 当日の「その日にいた時間・その日の室温」などは day_context へ。
 */
export type ClientProfileHeatExposure = {
  /** 普段、暑い環境で活動・勤務するか */
  worksInHeat?: boolean | null;
  /** 暑い環境の種類（ホットヨガ・サウナ・厨房など） */
  heatEnvironmentTypes?: string[];
  heatEnvironmentOther?: string;
  /** 普段、暑い環境にいる時間の目安（分）。当日分は day_context.heatActivityDurationMinutes */
  exposureDurationMinutes?: number | null;
  /** 普段の活動場所の室温目安。当日分は day_context */
  roomTemperatureC?: number | null;
  /** 普段の活動場所の湿度目安。当日分は day_context */
  humidityPercent?: number | null;
  indoorOutdoor?: IndoorOutdoor;
  nearFireOven?: boolean | null;
  /** 普段のかく汗の量の目安 */
  sweatAmount?: string;
  waterIntakeDuringWorkMl?: number | null;
  breakCount?: number | null;
  changesClothesAfterWork?: boolean | null;
  showerAfterWork?: boolean | null;
  /** 普段、涼しい場所で休む時間の目安。当日分は day_context */
  cooldownDurationMinutes?: number | null;
  /** 普段、終了後すぐに移動するか。当日分は day_context.movedImmediatelyAfter */
  movesImmediatelyAfterWork?: boolean | null;
  minutesUntilMoveAfterWork?: number | null;
};

// ---------------------------------------------------------------------------
// 5. lifestyle（固定習慣。当日分は day_context）
// ---------------------------------------------------------------------------

export type ClientProfileLifestyle = {
  drinkingFrequency?: string;
  drinkingAmountPerOccasion?: string;
  drinkingStartTimeTypical?: string;
  drinkingEndTimeTypical?: string;
  hoursBeforeBedTypical?: number | null;
  alcoholTypes?: string;
  /** Phase1 互換メモ */
  drinkingHabitNote?: string;
  smokingType?: string;
  cigarettesPerDay?: number | null;
};

// ---------------------------------------------------------------------------
// 6. caffeine
// ---------------------------------------------------------------------------

export type CaffeineEntry = {
  type: string;
  cupsOrCountPerDay?: number | null;
  amountNote?: string;
  lastIntakeTimeTypical?: string;
  intakeAfterEvening?: boolean | null;
  isDecaf?: boolean | null;
};

export type ClientProfileCaffeine = {
  entries?: CaffeineEntry[];
  notes?: string;
};

// ---------------------------------------------------------------------------
// 7. hydration
// ---------------------------------------------------------------------------

export type ClientProfileHydration = {
  waterMl?: number | null;
  teaMl?: number | null;
  coffeeTeaMl?: number | null;
  sportsDrinkMl?: number | null;
  alcoholMl?: number | null;
  otherBeverageMl?: number | null;
  /** 自動合計 */
  totalFluidMl?: number | null;
  preSleep2hFluidMl?: number | null;
  duringExerciseFluidMl?: number | null;
  duringHeatWorkFluidMl?: number | null;
  nocturia?: boolean | null;
  nighttimeUrinationCount?: number | null;
};

// ---------------------------------------------------------------------------
// 8. exercise（固定習慣）
// ---------------------------------------------------------------------------

export type ClientProfileExercise = {
  frequency?: string;
  types?: string[];
  typeOther?: string;
  durationMinutes?: number | null;
  intensity?: string;
  endTimeTypical?: string;
  indoorOutdoor?: IndoorOutdoor;
  inHeatEnvironment?: boolean | null;
  sweatAmount?: string;
  fluidAfterExercise?: string;
  changesClothesAfter?: boolean | null;
  showerAfter?: boolean | null;
  cooldownDurationMinutes?: number | null;
  movesImmediatelyAfter?: boolean | null;
  /** Phase1 互換メモ */
  exerciseHabitNote?: string;
};

// ---------------------------------------------------------------------------
// 9. health（機微情報）
// ---------------------------------------------------------------------------

export type MedicationEntry = {
  name?: string;
  intakeTime?: string;
  frequency?: string;
};

export type ClientProfileHealth = {
  menopause?: string;
  pregnancy?: string;
  medications?: MedicationEntry[];
  /** Phase1 互換の自由記述 */
  medicationsNote?: string;
  sleepMedicationUse?: string;
  nasalCongestionHabitual?: string;
  pollenAllergy?: string;
  allergies?: string;
  snoring?: string;
  snoringNasalNote?: string;
  sleepApneaDiagnosed?: string;
  hypertension?: string;
  diabetes?: string;
  dyslipidemia?: string;
  heartDisease?: string;
  respiratoryDisease?: string;
  chronicPain?: string;
  otherConditions?: string;
  medicalHistoryNote?: string;
  freeText?: string;
};

// ---------------------------------------------------------------------------
// 10. sleepEnvironment（普段の環境。当日実測は day_context）
// ---------------------------------------------------------------------------

export type EnvironmentControls = {
  airConditioning?: boolean | null;
  heating?: boolean | null;
  dehumidifier?: boolean | null;
  humidifier?: boolean | null;
  fan?: boolean | null;
  windowOpen?: boolean | null;
  blackoutCurtain?: boolean | null;
};

export type ClientProfileSleepEnvironment = {
  typicalBedtime?: string;
  typicalWakeTime?: string;
  napHabit?: string;
  napDurationMinutes?: number | null;
  daytimeSleepiness?: string;
  sleepSatisfaction?: string;
  cohabitants?: string;
  youngChildren?: string;
  caregiving?: string;
  pets?: string;

  homeTemperatureC?: number | null;
  homeHumidityPercent?: number | null;
  bedroomBedtimeTemperatureC?: number | null;
  bedroomBedtimeHumidityPercent?: number | null;
  bedroomWakeTemperatureC?: number | null;
  bedroomWakeHumidityPercent?: number | null;
  bedroomControls?: EnvironmentControls;
  beddingNotes?: string;

  workplaceTemperatureC?: number | null;
  workplaceHumidityPercent?: number | null;
  workplaceAirConditioning?: boolean | null;
  workplaceHeating?: boolean | null;
  workplaceIndoorOutdoor?: IndoorOutdoor;
  workplaceHeatExposureDurationMinutes?: number | null;
};

// ---------------------------------------------------------------------------
// Combined fixed profile
// ---------------------------------------------------------------------------

export type ClientProfileSections = {
  basic: ClientProfileBasic;
  work: ClientProfileWork;
  commute: ClientProfileCommute;
  heatExposure: ClientProfileHeatExposure;
  lifestyle: ClientProfileLifestyle;
  caffeine: ClientProfileCaffeine;
  hydration: ClientProfileHydration;
  exercise: ClientProfileExercise;
  health: ClientProfileHealth;
  sleepEnvironment: ClientProfileSleepEnvironment;
};

export type ClientProfileRecord = ClientProfileSections & {
  id?: string;
  clientId: string;
  ownerId?: string;
  schemaVersion: number;
  createdAt?: string;
  updatedAt?: string;
};

// ---------------------------------------------------------------------------
// Day context（分析日ごと — 固定と混在させない）
// ---------------------------------------------------------------------------

/**
 * 分析日ごとの当日情報（固定プロフィールと混在させない）
 * 例: その日の飲酒量 / 運動 / 高温環境にいた時間 / 水分 / 室温・湿度 /
 *     活動後すぐに移動したか / 鼻づまり / 自分で感じるストレス
 *
 * 今回はフォーム未実装。型と AI 入力結合のみ準備する。
 */
export type AnalysisDayContext = {
  schemaVersion?: number;
  /** 分析対象日 YYYY-MM-DD */
  analysisDate?: string;
  /** 気象参照地域の選択 */
  weatherRegionChoice?: "residence" | "workplace" | "custom" | "";
  weatherRegionCustom?: string;
  weatherRecordId?: string;

  /** 当日の飲酒量など */
  previousDayAlcoholAmount?: string;
  caffeineLastIntakeTime?: string;
  waterIntakeMl?: number | null;
  totalFluidMl?: number | null;

  meals?: Array<{
    label?: string;
    time?: string;
    content?: string;
    eaten?: string;
  }>;

  exerciseSummary?: string;
  exerciseEndTime?: string;
  /** 当日、高温環境にいた時間（分） */
  heatActivityDurationMinutes?: number | null;
  sweatAmount?: string;
  changedClothes?: boolean | null;
  showered?: boolean | null;
  /** 当日、涼しい場所で休んだ時間（分） */
  cooldownDurationMinutes?: number | null;
  /** 当日、終了後すぐに移動したか */
  movedImmediatelyAfter?: boolean | null;

  /** 当日の室温・湿度 */
  homeTemperatureC?: number | null;
  homeHumidityPercent?: number | null;
  bedroomTemperatureC?: number | null;
  bedroomHumidityPercent?: number | null;
  workplaceTemperatureC?: number | null;
  workplaceHumidityPercent?: number | null;

  /**
   * 環境イベント要約（旅行・ホテル・飛行機等）。
   * 正規化保存は analysis_environment_events。ここは入力・AI渡し用。
   */
  environmentEvents?: DayContextEnvironmentEvent[];

  /** 当日、自分で感じるストレス */
  stressSelf?: string;
  condition?: string;
  /** 当日の鼻づまり */
  nasalCongestion?: string;
  medicationsToday?: string;
  notes?: string;

  /**
   * 分析フォームの当日入力スナップショット（星評価・「今回」表示用）。
   * 旧レコードには存在しない。無い場合は「記録なし」扱い。
   */
  formLifestyle?: {
    alcohol?: string;
    alcoholDrank?: string;
    caffeine?: string;
    caffeineDone?: string;
    bathing?: string;
    yoga?: string;
    yogaDone?: string;
    pilates?: string;
    pilatesDone?: string;
    meals?: string;
    otherExerciseDone?: string;
    exercise?: string;
    dinnerTime?: string;
    stress?: string;
  };
};

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export type WeatherRecord = {
  id?: string;
  ownerId?: string;
  targetDate: string;
  region: string;
  latitude?: number | null;
  longitude?: number | null;
  tempMaxC?: number | null;
  tempMinC?: number | null;
  humidityPercent?: number | null;
  pressureHpa?: number | null;
  precipitationMm?: number | null;
  weatherCondition?: string;
  heatIndexC?: number | null;
  sunriseTime?: string;
  sunsetTime?: string;
  source?: string;
  fetchedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
