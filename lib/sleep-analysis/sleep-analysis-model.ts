/**
 * Sleep Wellness Platform 共通分析データモデル。
 * SOXAI / Oura / 将来の Apple Watch・Garmin・Fitbit を同じ分析エンジンへ渡すための契約。
 *
 * 既存の AnalysisMetrics / OuraVisionMetrics は維持し、
 * 本モデルは Mapper 経由で生成する（OCR 追加なし）。
 */

export type SleepAnalysisDevice =
  | "soxai"
  | "oura"
  | "apple_watch"
  | "garmin"
  | "fitbit"
  | "other"
  | "manual";

export type SleepAnalysisSourceImage = {
  id?: string;
  /** data URL またはストレージキー（任意） */
  url?: string;
  /** 画面カテゴリ（wearable classify 等） */
  category?: string;
  confidence?: number | null;
};

/**
 * デバイス非依存の共通睡眠分析入力。
 * 未取得は null（推測で埋めない）。
 */
export type SleepAnalysisData = {
  device: SleepAnalysisDevice;

  sleepScore: number | null;
  readinessScore: number | null;
  activityScore: number | null;

  totalSleepMinutes: number | null;
  timeInBedMinutes: number | null;
  sleepEfficiency: number | null;
  sleepLatencyMinutes: number | null;

  awakeMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  deepMinutes: number | null;

  lowestHeartRate: number | null;
  averageHeartRate: number | null;
  restingHeartRate: number | null;
  hrv: number | null;

  respiratoryRate: number | null;
  temperatureDeviation: number | null;
  spo2: number | null;

  stressMinutes: number | null;
  recoveryMinutes: number | null;
  resilienceScore: number | null;
  cardiovascularAge: number | null;
  sleepDebt: number | null;

  warningMessages: string[];

  /** デバイス固有の生メトリクス（損失防止） */
  rawMetrics: Record<string, unknown>;

  sourceImages: SleepAnalysisSourceImage[];

  /**
   * 全体の信頼度 0〜100。
   * 画像分類・抽出の平均など。未算出は null。
   */
  confidence: number | null;
};

export function emptySleepAnalysisData(
  device: SleepAnalysisDevice = "other",
): SleepAnalysisData {
  return {
    device,
    sleepScore: null,
    readinessScore: null,
    activityScore: null,
    totalSleepMinutes: null,
    timeInBedMinutes: null,
    sleepEfficiency: null,
    sleepLatencyMinutes: null,
    awakeMinutes: null,
    remMinutes: null,
    lightMinutes: null,
    deepMinutes: null,
    lowestHeartRate: null,
    averageHeartRate: null,
    restingHeartRate: null,
    hrv: null,
    respiratoryRate: null,
    temperatureDeviation: null,
    spo2: null,
    stressMinutes: null,
    recoveryMinutes: null,
    resilienceScore: null,
    cardiovascularAge: null,
    sleepDebt: null,
    warningMessages: [],
    rawMetrics: {},
    sourceImages: [],
    confidence: null,
  };
}
