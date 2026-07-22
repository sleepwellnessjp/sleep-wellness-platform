import {
  CLIENT_PROFILE_SCHEMA_VERSION,
  type AnalysisDayContext,
  type ClientProfileBasic,
  type ClientProfileCaffeine,
  type ClientProfileCommute,
  type ClientProfileExercise,
  type ClientProfileHealth,
  type ClientProfileHeatExposure,
  type ClientProfileHydration,
  type ClientProfileLifestyle,
  type ClientProfileRecord,
  type ClientProfileSections,
  type ClientProfileSleepEnvironment,
  type ClientProfileWork,
  type WeatherRecord,
} from "@/lib/client-profiles/types";
import {
  calculateBmi,
  resolveAgeYears,
  sumHydrationMl,
} from "@/lib/client-profiles/compute";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asObject(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

export function emptyClientProfileSections(): ClientProfileSections {
  return {
    basic: {},
    work: {},
    commute: {},
    heatExposure: {},
    lifestyle: {},
    caffeine: { entries: [] },
    hydration: {},
    exercise: {},
    health: {},
    sleepEnvironment: {},
  };
}

export function emptyAnalysisDayContext(
  analysisDate?: string,
): AnalysisDayContext {
  return {
    schemaVersion: CLIENT_PROFILE_SCHEMA_VERSION,
    analysisDate: analysisDate ?? "",
  };
}

/** 生年月日 / 身長体重から ageYears・bmi・totalFluidMl を再計算 */
export function withDerivedProfileFields(
  sections: ClientProfileSections,
): ClientProfileSections {
  const ageYears = resolveAgeYears({
    birthDate: sections.basic.birthDate,
    ageYears: sections.basic.ageYears,
  });
  const bmi = calculateBmi(sections.basic.heightCm, sections.basic.weightKg);
  const totalFluidMl = sumHydrationMl(sections.hydration);

  return {
    ...sections,
    basic: {
      ...sections.basic,
      ageYears,
      bmi,
    },
    hydration: {
      ...sections.hydration,
      totalFluidMl,
    },
  };
}

export function normalizeClientProfileSections(
  raw: Partial<ClientProfileSections> | null | undefined,
): ClientProfileSections {
  const base = emptyClientProfileSections();
  if (!raw) return base;

  return withDerivedProfileFields({
    basic: { ...base.basic, ...(raw.basic ?? {}) },
    work: { ...base.work, ...(raw.work ?? {}) },
    commute: { ...base.commute, ...(raw.commute ?? {}) },
    heatExposure: { ...base.heatExposure, ...(raw.heatExposure ?? {}) },
    lifestyle: { ...base.lifestyle, ...(raw.lifestyle ?? {}) },
    caffeine: {
      ...base.caffeine,
      ...(raw.caffeine ?? {}),
      entries: Array.isArray(raw.caffeine?.entries)
        ? raw.caffeine.entries
        : [],
    },
    hydration: { ...base.hydration, ...(raw.hydration ?? {}) },
    exercise: { ...base.exercise, ...(raw.exercise ?? {}) },
    health: { ...base.health, ...(raw.health ?? {}) },
    sleepEnvironment: {
      ...base.sleepEnvironment,
      ...(raw.sleepEnvironment ?? {}),
    },
  });
}

export function normalizeAnalysisDayContext(
  raw: unknown,
): AnalysisDayContext {
  const obj = asObject(raw);
  const environmentEvents = Array.isArray(obj.environmentEvents)
    ? obj.environmentEvents.filter(
        (item): item is Record<string, unknown> => isPlainObject(item),
      )
    : undefined;

  return {
    ...emptyAnalysisDayContext(),
    ...(obj as AnalysisDayContext),
    schemaVersion:
      typeof obj.schemaVersion === "number"
        ? obj.schemaVersion
        : CLIENT_PROFILE_SCHEMA_VERSION,
    environmentEvents: environmentEvents as AnalysisDayContext["environmentEvents"],
  };
}

export type DbClientProfileRow = {
  id: string;
  client_id: string;
  owner_id: string;
  schema_version: number;
  basic: unknown;
  work: unknown;
  commute: unknown;
  heat_exposure: unknown;
  lifestyle: unknown;
  caffeine: unknown;
  hydration: unknown;
  exercise: unknown;
  health: unknown;
  sleep_environment: unknown;
  created_at: string;
  updated_at: string;
};

export function mapDbClientProfileRow(
  row: DbClientProfileRow,
): ClientProfileRecord {
  const sections = normalizeClientProfileSections({
    basic: asObject(row.basic) as ClientProfileBasic,
    work: asObject(row.work) as ClientProfileWork,
    commute: asObject(row.commute) as ClientProfileCommute,
    heatExposure: asObject(row.heat_exposure) as ClientProfileHeatExposure,
    lifestyle: asObject(row.lifestyle) as ClientProfileLifestyle,
    caffeine: asObject(row.caffeine) as ClientProfileCaffeine,
    hydration: asObject(row.hydration) as ClientProfileHydration,
    exercise: asObject(row.exercise) as ClientProfileExercise,
    health: asObject(row.health) as ClientProfileHealth,
    sleepEnvironment: asObject(
      row.sleep_environment,
    ) as ClientProfileSleepEnvironment,
  });

  return {
    id: row.id,
    clientId: row.client_id,
    ownerId: row.owner_id,
    schemaVersion: row.schema_version || CLIENT_PROFILE_SCHEMA_VERSION,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...sections,
  };
}

export function sectionsToDbPayload(sections: ClientProfileSections) {
  const derived = withDerivedProfileFields(
    normalizeClientProfileSections(sections),
  );
  return {
    schema_version: CLIENT_PROFILE_SCHEMA_VERSION,
    basic: derived.basic,
    work: derived.work,
    commute: derived.commute,
    heat_exposure: derived.heatExposure,
    lifestyle: derived.lifestyle,
    caffeine: derived.caffeine,
    hydration: derived.hydration,
    exercise: derived.exercise,
    health: derived.health,
    sleep_environment: derived.sleepEnvironment,
  };
}

export type DbWeatherRow = {
  id: string;
  owner_id: string;
  target_date: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  temp_max_c: number | null;
  temp_min_c: number | null;
  humidity_percent: number | null;
  pressure_hpa: number | null;
  precipitation_mm: number | null;
  weather_condition: string;
  heat_index_c: number | null;
  sunrise_time: string;
  sunset_time: string;
  source: string;
  fetched_at: string | null;
  created_at: string;
  updated_at: string;
};

export function mapDbWeatherRow(row: DbWeatherRow): WeatherRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    targetDate: row.target_date,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
    tempMaxC: row.temp_max_c,
    tempMinC: row.temp_min_c,
    humidityPercent: row.humidity_percent,
    pressureHpa: row.pressure_hpa,
    precipitationMm: row.precipitation_mm,
    weatherCondition: row.weather_condition,
    heatIndexC: row.heat_index_c,
    sunriseTime: row.sunrise_time,
    sunsetTime: row.sunset_time,
    source: row.source,
    fetchedAt: row.fetched_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function weatherToDbPayload(record: WeatherRecord) {
  return {
    target_date: record.targetDate,
    region: record.region ?? "",
    latitude: record.latitude ?? null,
    longitude: record.longitude ?? null,
    temp_max_c: record.tempMaxC ?? null,
    temp_min_c: record.tempMinC ?? null,
    humidity_percent: record.humidityPercent ?? null,
    pressure_hpa: record.pressureHpa ?? null,
    precipitation_mm: record.precipitationMm ?? null,
    weather_condition: record.weatherCondition ?? "",
    heat_index_c: record.heatIndexC ?? null,
    sunrise_time: record.sunriseTime ?? "",
    sunset_time: record.sunsetTime ?? "",
    source: record.source ?? "",
    fetched_at: record.fetchedAt ?? null,
  };
}
