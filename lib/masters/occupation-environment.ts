/**
 * 勤務環境属性・環境イベント・本人ベースライン・測定 provider
 *
 * Design: docs/design-occupation-environment-baselines.md
 * - occupation_master = 職業名ではなく環境属性（高温・立ち仕事・夜勤等）
 * - 測定値は provider（soxai / apple_watch / garmin / oura / manual …）を持てる
 * - 本人基準窓: 当日 / 7 / 30 / 90 / 180 / 365 日。一般基準は最後の補助のみ
 */

export const OCCUPATION_ATTRIBUTE_CATEGORIES = [
  "thermal",
  "posture",
  "schedule",
  "digital",
  "physical",
  "sensory",
  "recovery",
  "other",
] as const;

export type OccupationAttributeCategory =
  (typeof OCCUPATION_ATTRIBUTE_CATEGORIES)[number];

export const ENVIRONMENT_EVENT_CATEGORIES = [
  "travel",
  "lodging",
  "transport",
  "outdoor",
  "work",
  "other",
] as const;

export type EnvironmentEventCategory =
  (typeof ENVIRONMENT_EVENT_CATEGORIES)[number];

export const ATTRIBUTE_INTENSITY_OPTIONS = [
  "mild",
  "moderate",
  "high",
  "unknown",
] as const;

export type AttributeIntensity = (typeof ATTRIBUTE_INTENSITY_OPTIONS)[number];

/** 本人基準の計算窓（日数）。一般基準はこの後の補助のみ */
export const BASELINE_WINDOWS = [1, 7, 30, 90, 180, 365] as const;
export type BaselineWindowDays = (typeof BASELINE_WINDOWS)[number];

export const BASELINE_WINDOW_KEYS = [
  "d1",
  "d7",
  "d30",
  "d90",
  "d180",
  "d365",
] as const;
export type BaselineWindowKey = (typeof BASELINE_WINDOW_KEYS)[number];

export const BASELINE_WINDOW_KEY_BY_DAYS: Record<
  BaselineWindowDays,
  BaselineWindowKey
> = {
  1: "d1",
  7: "d7",
  30: "d30",
  90: "d90",
  180: "d180",
  365: "d365",
};

/** サンプル不足とみなす有効日数の下限（未満で insufficient） */
export const BASELINE_INSUFFICIENT_SAMPLE_DAYS: Record<
  BaselineWindowDays,
  number
> = {
  1: 1,
  7: 3,
  30: 3,
  90: 7,
  180: 14,
  365: 28,
};

/** AI / 集計で使うメトリクスキー（拡張時はここに追加） */
export const BASELINE_METRIC_KEYS = [
  "sleep_score",
  "sleep_duration_min",
  "sleep_efficiency",
  "deep_sleep_min",
  "rem_sleep_min",
  "light_sleep_min",
  "awakenings_min",
  "sleep_latency_min",
  "spo2",
  "hrv",
  "resting_heart_rate",
  "respiratory_rate",
  "skin_temperature",
  "stress",
] as const;

export type BaselineMetricKey = (typeof BASELINE_METRIC_KEYS)[number];

/** 測定ソース。将来デバイス連携用 */
export const METRIC_PROVIDERS = [
  "soxai",
  "apple_watch",
  "garmin",
  "oura",
  "manual",
  "unknown",
] as const;

export type MetricProvider =
  | (typeof METRIC_PROVIDERS)[number]
  | (string & {});

/**
 * 同一メトリクスに複数 provider がある場合の既定優先度（高いほど優先）
 * プロダクト設定で上書き可能な余地を残す
 */
export const METRIC_PROVIDER_PRIORITY: Record<string, number> = {
  manual: 100,
  apple_watch: 80,
  garmin: 80,
  oura: 80,
  soxai: 60,
  unknown: 10,
};

export type MetricSample = {
  metricKey: BaselineMetricKey | string;
  value: number | string | null;
  unit?: string;
  observedAt?: string;
  provider: MetricProvider;
  confidence?: number;
  sourceRef?: string;
  raw?: Record<string, unknown>;
};

export type MetricSet = {
  schemaVersion: 1;
  confirmed: Record<string, MetricSample>;
  samples?: MetricSample[];
};

/** @deprecated Prefer OCCUPATION_PRESET_TO_ATTRIBUTES in environment-attributes.ts */
export const OCCUPATION_NAME_TO_ATTRIBUTE_EXAMPLES: Record<string, string[]> = {
  パン職人: ["heat_high", "standing_work", "early_shift", "dust_exposure"],
  看護師: ["night_shift", "standing_work", "interpersonal"],
  ホットヨガ講師: ["heat_high", "humidity_high", "standing_work"],
  ホットヨガインストラクター: ["heat_high", "humidity_high", "standing_work"],
};

export type OccupationMasterRecord = {
  id: string;
  label: string;
  category: OccupationAttributeCategory;
  description: string;
  aiContext: string;
  sleepRelevance: string[];
  sortOrder: number;
  isActive: boolean;
  schemaVersion: number;
};

export type ClientOccupationAttribute = {
  id?: string;
  clientId: string;
  ownerId?: string;
  attributeId: string;
  intensity: AttributeIntensity;
  notes?: string;
  /** 曝露時間・頻度など属性固有の拡張 */
  payload?: Record<string, unknown>;
};

export type EnvironmentEventMasterRecord = {
  id: string;
  label: string;
  category: EnvironmentEventCategory;
  description: string;
  aiContext: string;
  sleepRelevance: string[];
  payloadSchema?: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  schemaVersion: number;
};

export type AnalysisEnvironmentEvent = {
  id?: string;
  analysisId?: string;
  clientId: string;
  ownerId?: string;
  eventTypeId: string;
  eventDate?: string;
  startedAt?: string;
  endedAt?: string;
  notes?: string;
  /** 目的地・宿泊数・移動時間など */
  payload?: Record<string, unknown>;
};

export type MetricBaselineValue = {
  metricKey: BaselineMetricKey | string;
  sampleCount: number;
  avgValue: number | null;
  medianValue?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  stddevValue?: number | null;
  unit?: string;
  /** 当該窓の集計に使った provider 一覧 */
  providers?: MetricProvider[];
};

export type PersonalBaselineWindow = {
  windowDays: BaselineWindowDays;
  asOfDate: string;
  sampleDays?: number;
  metrics: MetricBaselineValue[];
  /** サンプル不足で信頼度が低い場合 */
  insufficientData?: boolean;
};

/**
 * analyses.personal_baseline に保存するスナップショット形状
 * AI は generalReference より personal windows を優先する
 */
export type PersonalBaselineSnapshot = {
  schemaVersion: 2;
  asOfDate: string;
  /** 評価優先度: personal_first = 本人平均優先（一般は補助のみ） */
  evaluationPolicy: "personal_first" | "general_only";
  windows: Partial<Record<BaselineWindowKey, PersonalBaselineWindow>>;
  /**
   * 一般基準は参考のみ（本人平均が十分にある場合は本文で優先しない）
   * キーは BaselineMetricKey
   */
  generalReference?: Partial<
    Record<string, { label: string; note: string }>
  >;
  occupationAttributeIds?: string[];
  environmentEventTypeIds?: string[];
  metricProvidersUsed?: MetricProvider[];
  computedAt?: string;
};

/** day_context に埋め込む環境イベント要約（正規化表と併用可） */
export type DayContextEnvironmentEvent = {
  eventTypeId: string;
  eventDate?: string;
  startedAt?: string;
  endedAt?: string;
  notes?: string;
  payload?: Record<string, unknown>;
};

/**
 * AI プロンプト用の優先ルール文言
 */
export const PERSONAL_BASELINE_AI_RULES = `
【評価優先ルール — 環境属性・本人ベースライン】
1. 職業名そのもので評価しない。パン職人／看護師／ホットヨガ講師などの表示名は使わず、展開済みの環境属性（高温・立ち仕事・夜勤・粉塵・高湿度・発汗・高ストレス等）だけを参照する。
2. 一般的な睡眠基準（例: 7〜9時間）だけで良し悪しを断定しない。一般基準は最後の補助評価のみ。
3. personal_baseline.windows がある場合、本人基準を第一とする。窓の使い分け:
   - d1（当日）: その夜の値・例外日の起点
   - d7: 超短期トレンド
   - d30: 短期本人基準
   - d90: 中期本人基準
   - d180 / d365: 半期・長期トレンド
4. サンプル十分な窓を優先して「本人平均との差」で評価する。不足（insufficientData または sampleDays が目安未満）の窓は使わず、より長い窓へ。なお不足なら一般基準を補助的に使う（断定しない）。
5. 測定値に provider（soxai / apple_watch / garmin / oura / manual 等）がある場合、確定値（confirmed）を主根拠とする。ソース名の羅列は不要。
6. 環境属性と環境イベントは「可能性」として述べ、原因断定をしない。
7. 環境イベントがある日は例外日として扱い、本人平均からの一時的なずれの可能性を優先して説明する。
`.trim();
