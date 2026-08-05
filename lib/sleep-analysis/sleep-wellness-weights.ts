/**
 * Sleep Wellness Score — 重み定義。
 * デバイス非依存。合計 1.0。
 */

export type SleepWellnessScoreFactorKey =
  | "sleepDuration"
  | "sleepEfficiency"
  | "rem"
  | "deepSleep"
  | "hrv"
  | "restingHeartRate"
  | "respiratoryRate"
  | "temperatureDeviation"
  | "stress"
  | "recovery";

export const SLEEP_WELLNESS_SCORE_VERSION = "1.0.0";

export const SLEEP_WELLNESS_WEIGHTS: Record<
  SleepWellnessScoreFactorKey,
  number
> = {
  sleepDuration: 0.15,
  sleepEfficiency: 0.12,
  rem: 0.12,
  deepSleep: 0.13,
  hrv: 0.12,
  restingHeartRate: 0.08,
  respiratoryRate: 0.06,
  temperatureDeviation: 0.07,
  stress: 0.07,
  recovery: 0.08,
};

export const SLEEP_WELLNESS_FACTOR_LABELS: Record<
  SleepWellnessScoreFactorKey,
  string
> = {
  sleepDuration: "睡眠時間",
  sleepEfficiency: "睡眠効率",
  rem: "REM",
  deepSleep: "深睡眠",
  hrv: "HRV",
  restingHeartRate: "安静時心拍",
  respiratoryRate: "呼吸数",
  temperatureDeviation: "体温変化",
  stress: "ストレス",
  recovery: "回復",
};

export const SLEEP_WELLNESS_FACTOR_KEYS = Object.keys(
  SLEEP_WELLNESS_WEIGHTS,
) as SleepWellnessScoreFactorKey[];
