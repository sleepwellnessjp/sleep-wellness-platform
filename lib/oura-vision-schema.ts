/**
 * Oura Ring Vision 方式: 画像から取る項目のスキーマ。
 * SOXAI Vision とは完全分離。OCR / ROI は使わない。
 */

export type OuraVisionMetrics = {
  sleepScore: number | null;
  readinessScore: number | null;
  activityScore: number | null;
  totalSleep: number | null; // minutes
  timeInBed: number | null; // minutes
  sleepEfficiency: number | null; // percent
  sleepLatency: number | null; // minutes
  bedtime: string | null;
  wakeTime: string | null;
  awakeTime: string | null;
  awakeDuration: number | null; // minutes
  awakePercent: number | null;
  remDuration: number | null;
  remPercent: number | null;
  lightSleepDuration: number | null;
  lightSleepPercent: number | null;
  deepSleepDuration: number | null;
  deepSleepPercent: number | null;
  restingHeartRate: number | null; // bpm
  lowestHeartRate: number | null;
  averageHeartRate: number | null;
  averageHrv: number | null; // ms
  maximumHrv: number | null;
  minimumHrv: number | null;
  respiratoryRate: number | null;
  averageSpO2: number | null;
  breathingRegularity: string | null;
  breathingDisturbances: string | null;
  bodyTemperatureDeviation: number | null; // °C
  recoveryIndex: number | null;
  recoveryTime: string | null;
  sleepTiming: string | null;
  sleepBalance: string | null;
  activityBalance: string | null;
  previousDayActivity: string | null;
  restfulness: string | null;
  latencyScore: number | null;
  timingScore: number | null;
  totalSleepScore: number | null;
  remSleepScore: number | null;
  deepSleepScore: number | null;
  efficiencyScore: number | null;
};

export type OuraDeviceSpecificMetrics = {
  sleepContributors: Record<string, unknown>;
  readinessContributors: Record<string, unknown>;
  tags: string[];
  notes: string[];
  /** 画面に見えた追加スコア群（上記以外） */
  extra?: Record<string, unknown>;
};

export type OuraVisionResult = {
  device: "oura";
  measurementDate: string | null;
  metrics: OuraVisionMetrics;
  deviceSpecificMetrics: OuraDeviceSpecificMetrics;
  warnings: string[];
};

export const OURA_VISION_METRIC_KEYS = [
  "sleepScore",
  "readinessScore",
  "activityScore",
  "totalSleep",
  "timeInBed",
  "sleepEfficiency",
  "sleepLatency",
  "bedtime",
  "wakeTime",
  "awakeTime",
  "awakeDuration",
  "awakePercent",
  "remDuration",
  "remPercent",
  "lightSleepDuration",
  "lightSleepPercent",
  "deepSleepDuration",
  "deepSleepPercent",
  "restingHeartRate",
  "lowestHeartRate",
  "averageHeartRate",
  "averageHrv",
  "maximumHrv",
  "minimumHrv",
  "respiratoryRate",
  "averageSpO2",
  "breathingRegularity",
  "breathingDisturbances",
  "bodyTemperatureDeviation",
  "recoveryIndex",
  "recoveryTime",
  "sleepTiming",
  "sleepBalance",
  "activityBalance",
  "previousDayActivity",
  "restfulness",
  "latencyScore",
  "timingScore",
  "totalSleepScore",
  "remSleepScore",
  "deepSleepScore",
  "efficiencyScore",
] as const satisfies ReadonlyArray<keyof OuraVisionMetrics>;

export function emptyOuraVisionMetrics(): OuraVisionMetrics {
  return {
    sleepScore: null,
    readinessScore: null,
    activityScore: null,
    totalSleep: null,
    timeInBed: null,
    sleepEfficiency: null,
    sleepLatency: null,
    bedtime: null,
    wakeTime: null,
    awakeTime: null,
    awakeDuration: null,
    awakePercent: null,
    remDuration: null,
    remPercent: null,
    lightSleepDuration: null,
    lightSleepPercent: null,
    deepSleepDuration: null,
    deepSleepPercent: null,
    restingHeartRate: null,
    lowestHeartRate: null,
    averageHeartRate: null,
    averageHrv: null,
    maximumHrv: null,
    minimumHrv: null,
    respiratoryRate: null,
    averageSpO2: null,
    breathingRegularity: null,
    breathingDisturbances: null,
    bodyTemperatureDeviation: null,
    recoveryIndex: null,
    recoveryTime: null,
    sleepTiming: null,
    sleepBalance: null,
    activityBalance: null,
    previousDayActivity: null,
    restfulness: null,
    latencyScore: null,
    timingScore: null,
    totalSleepScore: null,
    remSleepScore: null,
    deepSleepScore: null,
    efficiencyScore: null,
  };
}

export function emptyOuraDeviceSpecific(): OuraDeviceSpecificMetrics {
  return {
    sleepContributors: {},
    readinessContributors: {},
    tags: [],
    notes: [],
  };
}

export function emptyOuraVisionResult(): OuraVisionResult {
  return {
    device: "oura",
    measurementDate: null,
    metrics: emptyOuraVisionMetrics(),
    deviceSpecificMetrics: emptyOuraDeviceSpecific(),
    warnings: [],
  };
}

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).trim();
  if (!text) return null;
  // "7時間12分" → minutes
  const jp = text.match(/(\d+)\s*時間\s*(\d+)?\s*分?/);
  if (jp) {
    const h = Number(jp[1]);
    const m = Number(jp[2] ?? 0);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  }
  const hm = text.match(/^(\d+)[:：](\d{1,2})$/);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (Number.isFinite(h) && Number.isFinite(m) && m < 60) return h * 60 + m;
  }
  const n = Number(text.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function asStringRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** Vision / fixture JSON を正規化（推測で埋めない） */
export function normalizeOuraVisionResult(raw: unknown): OuraVisionResult {
  const base = emptyOuraVisionResult();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const record = raw as Record<string, unknown>;
  const metricsRaw =
    record.metrics && typeof record.metrics === "object"
      ? (record.metrics as Record<string, unknown>)
      : record;

  const metrics = emptyOuraVisionMetrics();
  for (const key of OURA_VISION_METRIC_KEYS) {
    const value = metricsRaw[key];
    if (
      key === "bedtime" ||
      key === "wakeTime" ||
      key === "awakeTime" ||
      key === "breathingRegularity" ||
      key === "breathingDisturbances" ||
      key === "recoveryTime" ||
      key === "sleepTiming" ||
      key === "sleepBalance" ||
      key === "activityBalance" ||
      key === "previousDayActivity" ||
      key === "restfulness"
    ) {
      metrics[key] = asNullableString(value);
    } else {
      metrics[key] = asNullableNumber(value);
    }
  }

  const specificRaw =
    record.deviceSpecificMetrics &&
    typeof record.deviceSpecificMetrics === "object"
      ? (record.deviceSpecificMetrics as Record<string, unknown>)
      : {};

  const warnings = Array.isArray(record.warnings)
    ? record.warnings
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 30)
    : [];

  return {
    device: "oura",
    measurementDate: asNullableString(record.measurementDate),
    metrics,
    deviceSpecificMetrics: {
      sleepContributors: asStringRecord(specificRaw.sleepContributors),
      readinessContributors: asStringRecord(specificRaw.readinessContributors),
      tags: asStringArray(specificRaw.tags),
      notes: asStringArray(specificRaw.notes),
      extra:
        specificRaw.extra && typeof specificRaw.extra === "object"
          ? asStringRecord(specificRaw.extra)
          : undefined,
    },
    warnings,
  };
}

/** OpenAI strict JSON schema */
export const ouraVisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["device", "measurementDate", "metrics", "deviceSpecificMetrics", "warnings"],
  properties: {
    device: { type: "string", enum: ["oura"] },
    measurementDate: { type: ["string", "null"] },
    metrics: {
      type: "object",
      additionalProperties: false,
      required: [...OURA_VISION_METRIC_KEYS],
      properties: Object.fromEntries(
        OURA_VISION_METRIC_KEYS.map((key) => {
          if (
            key === "bedtime" ||
            key === "wakeTime" ||
            key === "awakeTime" ||
            key === "breathingRegularity" ||
            key === "breathingDisturbances" ||
            key === "recoveryTime" ||
            key === "sleepTiming" ||
            key === "sleepBalance" ||
            key === "activityBalance" ||
            key === "previousDayActivity" ||
            key === "restfulness"
          ) {
            return [key, { type: ["string", "null"] }];
          }
          return [key, { type: ["number", "null"] }];
        }),
      ),
    },
    deviceSpecificMetrics: {
      type: "object",
      additionalProperties: false,
      required: ["sleepContributors", "readinessContributors", "tags", "notes"],
      properties: {
        sleepContributors: { type: "object", additionalProperties: true },
        readinessContributors: { type: "object", additionalProperties: true },
        tags: { type: "array", items: { type: "string" } },
        notes: { type: "array", items: { type: "string" } },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;
