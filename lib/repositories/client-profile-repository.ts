/**
 * Client Profile V2 — save / fetch
 * Does not replace Phase1 client-repository basics.
 */

import {
  emptyAnalysisDayContext,
  emptyClientProfileSections,
  mapDbClientProfileRow,
  mapDbWeatherRow,
  normalizeAnalysisDayContext,
  sectionsToDbPayload,
  weatherToDbPayload,
  type DbClientProfileRow,
  type DbWeatherRow,
} from "@/lib/client-profiles/normalize";
import {
  CLIENT_PROFILE_SCHEMA_VERSION,
  type AnalysisDayContext,
  type ClientProfileRecord,
  type ClientProfileSections,
  type WeatherRecord,
} from "@/lib/client-profiles/types";
import { updateClientProfile } from "@/lib/repositories/client-repository";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";
import { formatSupabaseError } from "@/lib/supabase/errors";

/** clients テーブルへ同期する最小項目のみ（氏名）。年齢・身長等は client_profiles に残す */
async function syncClientsBasicsFromProfile(
  clientId: string,
  sections: ClientProfileSections,
) {
  const fullName = sections.basic.fullName?.trim();
  if (!fullName) return;

  try {
    // updateClientProfile 経由だと profile upsert と循環するため、最小カラムを直接更新
    const auth = await getSupabaseAuth();
    if (!auth) {
      await updateClientProfile(clientId, { name: fullName });
      return;
    }

    const { error } = await auth.supabase
      .from("clients")
      .update({ name: fullName })
      .eq("instructor_id", auth.userId)
      .eq("id", clientId);

    if (error) {
      throw formatSupabaseError(error, "syncClientsBasicsFromProfile");
    }
  } catch (error) {
    console.error(
      "[client-profile] syncClientsBasicsFromProfile failed:",
      error,
    );
  }
}

type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
};

const LOCAL_PROFILE_KEY = "swij-client-profiles-v2";
const LOCAL_WEATHER_KEY = "swij-weather-records-v2";

async function getSupabaseAuth(): Promise<SupabaseAuth | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return { supabase, userId: user.id };
}

function readLocalProfiles(): Record<string, ClientProfileRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, ClientProfileRecord>;
  } catch {
    return {};
  }
}

function writeLocalProfiles(map: Record<string, ClientProfileRecord>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(map));
}

function readLocalWeather(): WeatherRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_WEATHER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WeatherRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalWeather(rows: WeatherRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_WEATHER_KEY, JSON.stringify(rows));
}

/** 固定プロフィール取得。無ければ空セクションを返す（clientId 付き） */
export async function getClientProfile(
  clientId: string,
): Promise<ClientProfileRecord> {
  const empty: ClientProfileRecord = {
    clientId,
    schemaVersion: CLIENT_PROFILE_SCHEMA_VERSION,
    ...emptyClientProfileSections(),
  };

  const auth = await getSupabaseAuth();
  if (!auth) {
    return readLocalProfiles()[clientId] ?? empty;
  }

  // 他講師のクライアントは閲覧不可（URL 直打ち対策）
  const { data: ownedClient, error: ownedError } = await auth.supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("instructor_id", auth.userId)
    .maybeSingle();

  if (ownedError) {
    throw formatSupabaseError(ownedError, "getClientProfile:client");
  }
  if (!ownedClient) {
    throw new Error("クライアントが見つかりません。");
  }

  const { data, error } = await auth.supabase
    .from("client_profiles")
    .select("*")
    .eq("client_id", clientId)
    .eq("owner_id", auth.userId)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError(error, "getClientProfile");
  }

  if (!data) return empty;
  return mapDbClientProfileRow(data as DbClientProfileRow);
}

/**
 * 固定プロフィールを UPSERT。
 * 派生値（ageYears / bmi / totalFluidMl）は保存前に再計算する。
 */
export async function upsertClientProfile(
  clientId: string,
  sections: Partial<ClientProfileSections>,
): Promise<ClientProfileRecord> {
  const current = await getClientProfile(clientId);
  const merged: ClientProfileSections = {
    basic: { ...current.basic, ...(sections.basic ?? {}) },
    work: { ...current.work, ...(sections.work ?? {}) },
    commute: { ...current.commute, ...(sections.commute ?? {}) },
    heatExposure: {
      ...current.heatExposure,
      ...(sections.heatExposure ?? {}),
    },
    lifestyle: { ...current.lifestyle, ...(sections.lifestyle ?? {}) },
    caffeine: { ...current.caffeine, ...(sections.caffeine ?? {}) },
    hydration: { ...current.hydration, ...(sections.hydration ?? {}) },
    exercise: { ...current.exercise, ...(sections.exercise ?? {}) },
    health: { ...current.health, ...(sections.health ?? {}) },
    sleepEnvironment: {
      ...current.sleepEnvironment,
      ...(sections.sleepEnvironment ?? {}),
    },
  };

  const payload = sectionsToDbPayload(merged);
  const auth = await getSupabaseAuth();

  const derivedSections: ClientProfileSections = {
    basic: payload.basic,
    work: payload.work,
    commute: payload.commute,
    heatExposure: payload.heat_exposure,
    lifestyle: payload.lifestyle,
    caffeine: payload.caffeine,
    hydration: payload.hydration,
    exercise: payload.exercise,
    health: payload.health,
    sleepEnvironment: payload.sleep_environment,
  };

  if (!auth) {
    const now = new Date().toISOString();
    const record: ClientProfileRecord = {
      id: current.id ?? `local-profile-${clientId}`,
      clientId,
      schemaVersion: CLIENT_PROFILE_SCHEMA_VERSION,
      createdAt: current.createdAt ?? now,
      updatedAt: now,
      ...derivedSections,
    };
    const map = readLocalProfiles();
    map[clientId] = record;
    writeLocalProfiles(map);
    await syncClientsBasicsFromProfile(clientId, derivedSections);
    return record;
  }

  const { data, error } = await auth.supabase
    .from("client_profiles")
    .upsert(
      {
        client_id: clientId,
        owner_id: auth.userId,
        ...payload,
      },
      { onConflict: "client_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw formatSupabaseError(error, "upsertClientProfile");
  }

  await syncClientsBasicsFromProfile(clientId, derivedSections);
  return mapDbClientProfileRow(data as DbClientProfileRow);
}

/** 分析の day_context 取得 */
export async function getAnalysisDayContext(
  analysisId: string,
): Promise<AnalysisDayContext> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    return emptyAnalysisDayContext();
  }

  const { data, error } = await auth.supabase
    .from("analyses")
    .select("day_context")
    .eq("id", analysisId)
    .eq("owner_id", auth.userId)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError(error, "getAnalysisDayContext");
  }

  return normalizeAnalysisDayContext(
    data && typeof data === "object"
      ? (data as { day_context?: unknown }).day_context
      : {},
  );
}

/** 分析の day_context を更新（固定プロフィールとは分離） */
export async function updateAnalysisDayContext(
  analysisId: string,
  dayContext: AnalysisDayContext,
): Promise<AnalysisDayContext> {
  const normalized = normalizeAnalysisDayContext(dayContext);
  const auth = await getSupabaseAuth();

  if (!auth) {
    return normalized;
  }

  const { data, error } = await auth.supabase
    .from("analyses")
    .update({ day_context: normalized as unknown as Json })
    .eq("id", analysisId)
    .eq("owner_id", auth.userId)
    .select("day_context")
    .single();

  if (error) {
    throw formatSupabaseError(error, "updateAnalysisDayContext");
  }

  return normalizeAnalysisDayContext(
    data && typeof data === "object"
      ? (data as { day_context?: unknown }).day_context
      : normalized,
  );
}

export async function getWeatherRecord(input: {
  targetDate: string;
  region: string;
}): Promise<WeatherRecord | null> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    const local = readLocalWeather().find(
      (row) =>
        row.targetDate === input.targetDate && row.region === input.region,
    );
    return local ?? null;
  }

  const { data, error } = await auth.supabase
    .from("weather_records")
    .select("*")
    .eq("owner_id", auth.userId)
    .eq("target_date", input.targetDate)
    .eq("region", input.region)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError(error, "getWeatherRecord");
  }

  if (!data) return null;
  return mapDbWeatherRow(data as DbWeatherRow);
}

export async function upsertWeatherRecord(
  record: WeatherRecord,
): Promise<WeatherRecord> {
  const auth = await getSupabaseAuth();
  const payload = weatherToDbPayload(record);

  if (!auth) {
    const now = new Date().toISOString();
    const rows = readLocalWeather();
    const index = rows.findIndex(
      (row) =>
        row.targetDate === record.targetDate && row.region === record.region,
    );
    const next: WeatherRecord = {
      id:
        index >= 0
          ? (rows[index]?.id ?? `local-weather-${now}`)
          : `local-weather-${record.targetDate}-${encodeURIComponent(record.region)}`,
      ownerId: "local",
      targetDate: payload.target_date,
      region: payload.region,
      latitude: payload.latitude,
      longitude: payload.longitude,
      tempMaxC: payload.temp_max_c,
      tempMinC: payload.temp_min_c,
      humidityPercent: payload.humidity_percent,
      pressureHpa: payload.pressure_hpa,
      precipitationMm: payload.precipitation_mm,
      weatherCondition: payload.weather_condition,
      heatIndexC: payload.heat_index_c,
      sunriseTime: payload.sunrise_time,
      sunsetTime: payload.sunset_time,
      source: payload.source,
      fetchedAt: payload.fetched_at,
      createdAt: index >= 0 ? rows[index]?.createdAt : now,
      updatedAt: now,
    };
    if (index >= 0) rows[index] = next;
    else rows.push(next);
    writeLocalWeather(rows);
    return next;
  }

  const { data, error } = await auth.supabase
    .from("weather_records")
    .upsert(
      {
        owner_id: auth.userId,
        ...payload,
      },
      { onConflict: "owner_id,target_date,region" },
    )
    .select("*")
    .single();

  if (error) {
    throw formatSupabaseError(error, "upsertWeatherRecord");
  }

  return mapDbWeatherRow(data as DbWeatherRow);
}
