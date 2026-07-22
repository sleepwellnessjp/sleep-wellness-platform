import type { AnalysisMetrics, AnalysisResult } from "@/lib/analysis-session";
import {
  normalizeAnalysisResult,
  normalizeMetrics,
} from "@/lib/analysis-session";
import {
  createClient as createLocalClient,
  getClientById as getLocalClientById,
  loadClients as loadLocalClients,
  recordPdfDownload as recordLocalPdfDownload,
  rememberLastSavedAnalysisRef,
  saveAnalysisToClientStore as saveLocalAnalysis,
  updateClientProfile as updateLocalClientProfile,
  type ClientListItem,
  type CreateClientInput,
  type SavedAnalysisRef,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/client-store";
import {
  buildStructuredMetrics,
  parseStructuredFromStorage,
} from "@/lib/soxai-structured-metrics";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatSupabaseError } from "@/lib/supabase/errors";

export type {
  ClientListItem,
  CreateClientInput,
  PdfHistoryEntry,
  SavedAnalysisRef,
  StoredAnalysis,
  StoredClient,
} from "@/lib/client-store";

export {
  analysisSleepScore,
  formatDisplayDate,
} from "@/lib/client-store";

type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
};

/**
 * clients テーブルの最小情報
 * 書き込み対象: id / owner_id / name / name_kana(furigana) / memo / created_at
 * 年齢・身長・体重・性別・職業・健康情報は client_profiles へ。
 * birth_date / gender / email 等はレガシー列（読み取り互換のみ）。
 */
type DbClientRow = {
  id: string;
  owner_id: string;
  name: string;
  name_kana: string | null;
  birth_date?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  registered_at?: string | null;
  memo: string | null;
  created_at: string;
  updated_at?: string;
};

type ProfileBasicsOverlay = {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  snoringNasal?: string;
  medicalHistory?: string;
  birthDate?: string;
  gender?: string;
};

type DbAnalysisRow = {
  id: string;
  client_id: string;
  owner_id: string;
  analyzed_at: string;
  analysis_date?: string | null;
  sleep_score: number | null;
  sleep_duration: number | null;
  sleep_efficiency: number | null;
  deep_sleep: number | null;
  awakenings: number | null;
  sleep_latency: number | null;
  spo2: number | null;
  hrv: number | null;
  resting_heart_rate: number | null;
  sleep_onset_time?: string | null;
  wake_time?: string | null;
  skin_temperature_value?: string | null;
  skin_temperature_type?: string | null;
  skin_temperature_unit?: string | null;
  stress_average?: string | null;
  stress_level?: string | null;
  stress_series?: unknown;
  ocr_source_images?: unknown;
  ocr_confidence?: unknown;
  ocr_data: unknown;
  confirmed_metrics?: AnalysisMetrics | null;
  report_payload?: unknown;
  ai_result: AnalysisResult | null;
  credits_consumed?: number | null;
  created_at: string;
  updated_at?: string;
};

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

function notifyClientsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("swij-clients-updated"));
  }
}

function parseNumeric(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parseOcrPayload(ocrData: unknown): {
  extracted: AnalysisMetrics;
  confirmed: AnalysisMetrics | null;
} {
  if (!ocrData || typeof ocrData !== "object" || Array.isArray(ocrData)) {
    return { extracted: normalizeMetrics(undefined), confirmed: null };
  }

  const record = ocrData as Record<string, unknown>;
  if ("confirmed" in record || "extracted" in record) {
    return {
      extracted: normalizeMetrics(
        (record.extracted as Partial<AnalysisMetrics> | undefined) ?? undefined,
      ),
      confirmed: record.confirmed
        ? normalizeMetrics(record.confirmed as Partial<AnalysisMetrics>)
        : null,
    };
  }

  return {
    extracted: normalizeMetrics(ocrData as Partial<AnalysisMetrics>),
    confirmed: null,
  };
}

function mapDbAnalysis(row: DbAnalysisRow): StoredAnalysis {
  const ocr = parseOcrPayload(row.ocr_data);
  const metrics = normalizeMetrics(
    row.confirmed_metrics ?? ocr.confirmed ?? ocr.extracted,
  );
  const resultRaw = row.ai_result;
  const graphs = resultRaw?.graphs;
  const structured = parseStructuredFromStorage(
    row as unknown as Record<string, unknown>,
    metrics,
    graphs,
  );
  const result = resultRaw
    ? normalizeAnalysisResult({
        ...resultRaw,
        metrics: normalizeMetrics(resultRaw.metrics ?? metrics),
        extractedMetrics: resultRaw.extractedMetrics ?? ocr.extracted,
        analysisId: row.id,
        clientId: row.client_id,
      })
    : normalizeAnalysisResult({
        summary: "",
        sleepAnalysis: "",
        autonomicAssessment: "",
        recoveryAssessment: "",
        improvements: [],
        melatoninYoga: "",
        score: 0,
        scoreBreakdown: {
          sleepDuration: 3,
          sleepEfficiency: 3,
          deepSleep: 3,
          hrv: 3,
          stress: 3,
          spo2: 3,
          recovery: 3,
        },
        metrics,
        extractedMetrics: ocr.extracted,
        caution: "",
        disclaimer: "",
        analysisId: row.id,
        clientId: row.client_id,
      });

  const sleepScore =
    typeof row.sleep_score === "number" && Number.isFinite(row.sleep_score)
      ? row.sleep_score
      : metrics.sleepScore;

  return {
    id: row.id,
    analysisDate:
      row.analysis_date?.trim() ||
      row.analyzed_at.slice(0, 10),
    createdAt: row.created_at,
    sleepScore,
    wellnessScore: result.score,
    metrics,
    structured,
    result,
    pdfHistory: [],
  };
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** client_profiles.basic / health / lifestyle / exercise から表示用オーバーレイを作る */
function profileOverlayFromRow(row: {
  basic?: unknown;
  health?: unknown;
  lifestyle?: unknown;
  exercise?: unknown;
}): ProfileBasicsOverlay {
  const basic =
    row.basic && typeof row.basic === "object" && !Array.isArray(row.basic)
      ? (row.basic as Record<string, unknown>)
      : {};
  const health =
    row.health && typeof row.health === "object" && !Array.isArray(row.health)
      ? (row.health as Record<string, unknown>)
      : {};
  const lifestyle =
    row.lifestyle &&
    typeof row.lifestyle === "object" &&
    !Array.isArray(row.lifestyle)
      ? (row.lifestyle as Record<string, unknown>)
      : {};
  const exercise =
    row.exercise &&
    typeof row.exercise === "object" &&
    !Array.isArray(row.exercise)
      ? (row.exercise as Record<string, unknown>)
      : {};

  const age = asFiniteNumber(basic.ageYears);
  const heightCm = asFiniteNumber(basic.heightCm);
  const weightKg = asFiniteNumber(basic.weightKg);

  const medications =
    asNonEmptyString(health.medicationsNote) ??
    (Array.isArray(health.medications)
      ? health.medications
          .map((item) =>
            item && typeof item === "object" && "name" in item
              ? String((item as { name?: unknown }).name ?? "")
              : "",
          )
          .filter(Boolean)
          .join("、") || undefined
      : undefined);

  const snoringParts = [health.snoring, health.nasalCongestionHabitual]
    .map((v) => asNonEmptyString(v))
    .filter((v): v is string => Boolean(v));
  const snoringNasal =
    asNonEmptyString(health.snoringNasalNote) ??
    (snoringParts.length > 0 ? snoringParts.join(" / ") : undefined);

  return {
    age: age != null ? Math.round(age) : undefined,
    heightCm,
    weightKg,
    birthDate: asNonEmptyString(basic.birthDate),
    gender: asNonEmptyString(basic.gender),
    medications,
    drinkingHabit:
      asNonEmptyString(lifestyle.drinkingHabitNote) ??
      asNonEmptyString(lifestyle.drinkingFrequency),
    exerciseHabit:
      asNonEmptyString(exercise.exerciseHabitNote) ??
      asNonEmptyString(exercise.frequency),
    snoringNasal,
    medicalHistory:
      asNonEmptyString(health.medicalHistoryNote) ??
      asNonEmptyString(health.otherConditions),
  };
}

function mapDbClient(
  row: DbClientRow,
  analyses: StoredAnalysis[],
  profile?: ProfileBasicsOverlay,
): StoredClient {
  return {
    id: row.id,
    name: row.name,
    registeredAt: row.registered_at ?? row.created_at.slice(0, 10),
    nameKana: row.name_kana ?? undefined,
    // 詳細は client_profiles 優先（clients のレガシー列はフォールバック）
    birthDate: profile?.birthDate ?? row.birth_date ?? undefined,
    gender: profile?.gender ?? row.gender ?? undefined,
    age: profile?.age,
    heightCm: profile?.heightCm,
    weightKg: profile?.weightKg,
    medications: profile?.medications,
    drinkingHabit: profile?.drinkingHabit,
    exerciseHabit: profile?.exerciseHabit,
    snoringNasal: profile?.snoringNasal,
    medicalHistory: profile?.medicalHistory,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    memo: row.memo ?? undefined,
    analyses: [...analyses].sort((a, b) => {
      const byCreated = b.createdAt.localeCompare(a.createdAt);
      if (byCreated !== 0) return byCreated;
      return b.analysisDate.localeCompare(a.analysisDate);
    }),
  };
}

/** clients へ書いてよい最小カラムのみ（name / furigana / memo） */
function clientsCorePatchFromInput(input: Partial<CreateClientInput>): {
  name?: string;
  name_kana?: string | null;
  memo?: string | null;
} {
  const patch: {
    name?: string;
    name_kana?: string | null;
    memo?: string | null;
  } = {};

  if (input.name !== undefined) {
    const nextName = input.name.trim();
    if (nextName) patch.name = nextName;
  }
  if (input.nameKana !== undefined) {
    patch.name_kana = input.nameKana.trim() || null;
  }
  if (input.memo !== undefined) {
    patch.memo = input.memo.trim() || null;
  }

  return patch;
}

function parseOptionalProfileNumber(
  value: string | number | undefined,
): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

/** 入力の詳細項目を client_profiles 用セクションへ変換（undefined は含めない） */
function profileSectionsFromClientInput(
  input: Partial<CreateClientInput>,
  options?: { ensureFullName?: string },
) {
  const basic: Record<string, unknown> = {};
  const health: Record<string, unknown> = {};
  const lifestyle: Record<string, unknown> = {};
  const exercise: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const fullName = input.name.trim();
    if (fullName) basic.fullName = fullName;
  } else if (options?.ensureFullName?.trim()) {
    basic.fullName = options.ensureFullName.trim();
  }

  if (input.birthDate !== undefined) {
    const v = input.birthDate.trim();
    if (v) basic.birthDate = v;
  }
  if (input.gender !== undefined) {
    const v = input.gender.trim();
    if (v) basic.gender = v;
  }
  if (input.age !== undefined) {
    const n = parseOptionalProfileNumber(input.age);
    if (n != null) basic.ageYears = n;
  }
  if (input.heightCm !== undefined) {
    const n = parseOptionalProfileNumber(input.heightCm);
    if (n != null) basic.heightCm = n;
  }
  if (input.weightKg !== undefined) {
    const n = parseOptionalProfileNumber(input.weightKg);
    if (n != null) basic.weightKg = n;
  }

  if (input.medications !== undefined && input.medications.trim()) {
    health.medicationsNote = input.medications.trim();
  }
  if (input.snoringNasal !== undefined && input.snoringNasal.trim()) {
    health.snoringNasalNote = input.snoringNasal.trim();
  }
  if (input.medicalHistory !== undefined && input.medicalHistory.trim()) {
    health.medicalHistoryNote = input.medicalHistory.trim();
  }
  if (input.drinkingHabit !== undefined && input.drinkingHabit.trim()) {
    lifestyle.drinkingHabitNote = input.drinkingHabit.trim();
  }
  if (input.exerciseHabit !== undefined && input.exerciseHabit.trim()) {
    exercise.exerciseHabitNote = input.exerciseHabit.trim();
  }

  return {
    ...(Object.keys(basic).length > 0 ? { basic } : {}),
    ...(Object.keys(health).length > 0 ? { health } : {}),
    ...(Object.keys(lifestyle).length > 0 ? { lifestyle } : {}),
    ...(Object.keys(exercise).length > 0 ? { exercise } : {}),
  };
}

function hasProfileSectionPayload(
  sections: ReturnType<typeof profileSectionsFromClientInput>,
): boolean {
  return Object.keys(sections).length > 0;
}

/** client_profiles が無ければ空行を作成（失敗時は呼び出し側で扱う） */
async function ensureClientProfileRow(
  auth: SupabaseAuth,
  clientId: string,
  clientName?: string,
): Promise<void> {
  const { supabase, userId } = auth;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "ensure_client_profile",
    { p_client_id: clientId },
  );

  if (!rpcError && rpcData) return;

  // RPC 未適用環境向けフォールバック
  if (rpcError) {
    console.warn(
      "[client-repository] ensure_client_profile RPC unavailable:",
      rpcError.message,
    );
  }

  const { data: existing, error: selectError } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("owner_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (selectError) {
    throw formatSupabaseError(selectError, "ensureClientProfile:select");
  }
  if (existing) return;

  const { error: insertError } = await supabase.from("client_profiles").insert({
    client_id: clientId,
    owner_id: userId,
    basic: clientName ? { fullName: clientName } : {},
  });

  if (insertError) {
    throw formatSupabaseError(insertError, "ensureClientProfile:insert");
  }
}

export type AnalysisHistoryListItem = {
  analysisId: string;
  clientId: string;
  clientName: string;
  measurementDate: string | null;
  sleepScore: number | null;
  createdAt: string;
  creditsConsumed: number;
};

/** 保存済み分析を新しい順（created_at desc）で一覧取得 */
export async function listAnalysisHistory(
  limit = 50,
): Promise<AnalysisHistoryListItem[]> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    const clients = loadLocalClients();
    const flat: AnalysisHistoryListItem[] = [];
    for (const client of clients) {
      for (const analysis of client.analyses) {
        flat.push({
          analysisId: analysis.id,
          clientId: client.id,
          clientName: client.name,
          measurementDate: analysis.analysisDate,
          sleepScore: analysis.sleepScore,
          createdAt: analysis.createdAt,
          creditsConsumed: 1,
        });
      }
    }
    return flat
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  const { supabase, userId } = auth;
  const { data: analysisRows, error: analysisError } = await supabase
    .from("analyses")
    .select(
      "id, client_id, sleep_score, created_at, analyzed_at, credits_consumed, ai_result",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (analysisError) {
    throw formatSupabaseError(analysisError, "listAnalysisHistory:analyses");
  }

  const rows = (analysisRows ?? []) as Array<{
    id: string;
    client_id: string;
    sleep_score: number | null;
    created_at: string;
    analyzed_at: string;
    credits_consumed: number | null;
    ai_result: AnalysisResult | null;
  }>;

  if (rows.length === 0) return [];

  const clientIds = [...new Set(rows.map((row) => row.client_id))];
  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("owner_id", userId)
    .in("id", clientIds);

  if (clientError) {
    throw formatSupabaseError(clientError, "listAnalysisHistory:clients");
  }

  const nameById = new Map(
    ((clientRows ?? []) as Array<{ id: string; name: string }>).map((row) => [
      row.id,
      row.name,
    ]),
  );

  return rows.map((row) => {
    const aiResult = row.ai_result;
    const measurementDate =
      (typeof aiResult?.measurementDate === "string" &&
      aiResult.measurementDate.trim()
        ? aiResult.measurementDate.trim()
        : null) ?? row.analyzed_at.slice(0, 10);

    const sleepScore =
      typeof row.sleep_score === "number" && Number.isFinite(row.sleep_score)
        ? row.sleep_score
        : typeof aiResult?.metrics?.sleepScore === "number"
          ? aiResult.metrics.sleepScore
          : null;

    return {
      analysisId: row.id,
      clientId: row.client_id,
      clientName:
        nameById.get(row.client_id) ??
        aiResult?.clientName?.trim() ??
        "未設定",
      measurementDate,
      sleepScore,
      createdAt: row.created_at,
      creditsConsumed: Number(row.credits_consumed ?? 0),
    };
  });
}

async function fetchClientsFromSupabase(auth: SupabaseAuth): Promise<StoredClient[]> {
  const { supabase, userId } = auth;

  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (clientError) {
    throw formatSupabaseError(clientError, "fetchClients:clients");
  }

  const { data: analysisRows, error: analysisError } = await supabase
    .from("analyses")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (analysisError) {
    throw formatSupabaseError(analysisError, "fetchClients:analyses");
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("client_profiles")
    .select("client_id, basic, health, lifestyle, exercise")
    .eq("owner_id", userId);

  if (profileError) {
    // client_profiles 未適用環境でも clients 一覧は返す
    console.error("[client-repository] fetchClients:profiles failed:", profileError);
  }

  const profileByClientId = new Map<string, ProfileBasicsOverlay>();
  for (const row of profileRows ?? []) {
    const clientId = (row as { client_id?: string }).client_id;
    if (!clientId) continue;
    profileByClientId.set(
      clientId,
      profileOverlayFromRow(row as {
        basic?: unknown;
        health?: unknown;
        lifestyle?: unknown;
        exercise?: unknown;
      }),
    );
  }

  const analysesByClient = new Map<string, StoredAnalysis[]>();
  for (const row of (analysisRows ?? []) as DbAnalysisRow[]) {
    const list = analysesByClient.get(row.client_id) ?? [];
    list.push(mapDbAnalysis(row));
    analysesByClient.set(row.client_id, list);
  }

  return ((clientRows ?? []) as DbClientRow[]).map((row) =>
    mapDbClient(
      row,
      analysesByClient.get(row.id) ?? [],
      profileByClientId.get(row.id),
    ),
  );
}

function toClientListItems(clients: StoredClient[]): ClientListItem[] {
  return clients
    .map((client) => {
      const latest = client.analyses[0];
      return {
        id: client.id,
        name: client.name,
        registeredAt: client.registeredAt,
        latestSleepScore: latest?.sleepScore ?? latest?.wellnessScore ?? null,
        latestAnalysisDate: latest?.analysisDate ?? null,
      };
    })
    .sort((a, b) => {
      const aDate = a.latestAnalysisDate ?? a.registeredAt;
      const bDate = b.latestAnalysisDate ?? b.registeredAt;
      return bDate.localeCompare(aDate);
    });
}

/** 同期版（localStorage）。Supabase 利用時もキャッシュとして使用可。 */
export function loadClientsSync(): StoredClient[] {
  return loadLocalClients();
}

export async function loadClients(): Promise<StoredClient[]> {
  const auth = await getSupabaseAuth();
  if (!auth) return loadLocalClients();
  return fetchClientsFromSupabase(auth);
}

export async function getClientById(id: string): Promise<StoredClient | null> {
  const auth = await getSupabaseAuth();
  if (!auth) return getLocalClientById(id);

  const clients = await fetchClientsFromSupabase(auth);
  return clients.find((client) => client.id === id) ?? null;
}

export async function getAnalysisById(
  analysisId: string,
): Promise<{ client: StoredClient; analysis: StoredAnalysis } | null> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    const clients = loadLocalClients();
    for (const client of clients) {
      const analysis = client.analyses.find((item) => item.id === analysisId);
      if (analysis) return { client, analysis };
    }
    return null;
  }

  const { supabase, userId } = auth;
  const { data: analysisRow, error: analysisError } = await supabase
    .from("analyses")
    .select("*")
    .eq("owner_id", userId)
    .eq("id", analysisId)
    .maybeSingle();

  if (analysisError) {
    throw formatSupabaseError(analysisError, "getAnalysisById:analysis");
  }
  if (!analysisRow) return null;

  const row = analysisRow as DbAnalysisRow;
  const { data: clientRow, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_id", userId)
    .eq("id", row.client_id)
    .maybeSingle();

  if (clientError) {
    throw formatSupabaseError(clientError, "getAnalysisById:client");
  }
  if (!clientRow) return null;

  const { data: profileRow } = await supabase
    .from("client_profiles")
    .select("basic, health, lifestyle, exercise")
    .eq("owner_id", userId)
    .eq("client_id", row.client_id)
    .maybeSingle();

  const analysis = mapDbAnalysis(row);
  const client = mapDbClient(
    clientRow as DbClientRow,
    [analysis],
    profileRow
      ? profileOverlayFromRow(
          profileRow as {
            basic?: unknown;
            health?: unknown;
            lifestyle?: unknown;
            exercise?: unknown;
          },
        )
      : undefined,
  );
  return { client, analysis };
}

export async function getClientListItems(): Promise<ClientListItem[]> {
  const clients = await loadClients();
  return toClientListItems(clients);
}

export async function getComparableClients(): Promise<StoredClient[]> {
  const clients = await loadClients();
  return clients
    .filter((client) => client.analyses.length >= 2)
    .sort((a, b) => {
      const aDate = a.analyses[0]?.analysisDate ?? a.registeredAt;
      const bDate = b.analyses[0]?.analysisDate ?? b.registeredAt;
      return bDate.localeCompare(aDate);
    });
}

export async function createClient(input: CreateClientInput): Promise<StoredClient> {
  const auth = await getSupabaseAuth();
  const name = input.name.trim();
  if (!name) throw new Error("氏名は必須です。");

  if (!auth) {
    const client = createLocalClient({
      name,
      nameKana: input.nameKana,
      memo: input.memo,
      registeredAt: input.registeredAt,
    });
    const { upsertClientProfile } = await import(
      "@/lib/repositories/client-profile-repository"
    );
    await upsertClientProfile(
      client.id,
      profileSectionsFromClientInput(input, {
        ensureFullName: name,
      }) as Parameters<typeof upsertClientProfile>[1],
    );
    return client;
  }

  const { supabase, userId } = auth;
  const nameKana = input.nameKana?.trim() || null;
  const memo = input.memo?.trim() || null;

  // トランザクション RPC: clients + client_profiles を同時作成（失敗時ロールバック）
  const { data: rpcClient, error: rpcError } = await supabase.rpc(
    "create_client_with_profile",
    {
      p_name: name,
      p_name_kana: nameKana,
      p_memo: memo,
    },
  );

  let row: DbClientRow | null = null;

  if (!rpcError && rpcClient) {
    row = (
      Array.isArray(rpcClient) ? rpcClient[0] : rpcClient
    ) as DbClientRow;
  } else {
    if (rpcError) {
      console.warn(
        "[client-repository] create_client_with_profile RPC unavailable:",
        rpcError.message,
      );
    }

    // RPC 未適用環境: 手動で clients → profiles。profiles 失敗時は clients を削除してロールバック相当。
    const { data: existingRows, error: existingError } = await supabase
      .from("clients")
      .select("*")
      .eq("owner_id", userId)
      .ilike("name", name);

    if (existingError) {
      throw formatSupabaseError(existingError, "createClient:select");
    }

    const existing = ((existingRows ?? []) as DbClientRow[]).find(
      (item) =>
        item.name.trim().replace(/\s+/g, " ").toLowerCase() ===
        name.replace(/\s+/g, " ").toLowerCase(),
    );

    if (existing) {
      row = existing;
      await ensureClientProfileRow(auth, existing.id, existing.name);
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          owner_id: userId,
          name,
          name_kana: nameKana,
          memo,
        })
        .select("*")
        .single();

      if (error) {
        throw formatSupabaseError(error, "createClient:insert");
      }
      if (!data) {
        throw new Error("登録結果を取得できませんでした。");
      }

      row = data as DbClientRow;

      try {
        await ensureClientProfileRow(auth, row.id, row.name);
      } catch (profileError) {
        await supabase
          .from("clients")
          .delete()
          .eq("owner_id", userId)
          .eq("id", row.id);
        throw profileError;
      }
    }
  }

  if (!row) {
    throw new Error("登録結果を取得できませんでした。");
  }

  // 詳細（年齢・身長等）は client_profiles のみへ
  try {
    const { upsertClientProfile } = await import(
      "@/lib/repositories/client-profile-repository"
    );
    await upsertClientProfile(
      row.id,
      profileSectionsFromClientInput(input, {
        ensureFullName: row.name,
      }) as Parameters<typeof upsertClientProfile>[1],
    );
  } catch (profileError) {
    console.error(
      "[client-repository] createClient: profile details upsert failed:",
      profileError,
    );
  }

  notifyClientsUpdated();
  return mapDbClient(row, []);
}

export async function updateClientProfile(
  clientId: string,
  input: Partial<CreateClientInput>,
): Promise<StoredClient | null> {
  const auth = await getSupabaseAuth();
  if (!auth) return updateLocalClientProfile(clientId, input);

  const { supabase, userId } = auth;

  // clients には最小情報のみ。詳細は client_profiles。
  const patch = clientsCorePatchFromInput(input);
  let data: DbClientRow | null = null;

  if (Object.keys(patch).length > 0) {
    const { data: updated, error } = await supabase
      .from("clients")
      .update(patch)
      .eq("owner_id", userId)
      .eq("id", clientId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[client-repository] updateClientProfile failed:", error);
      return null;
    }
    data = (updated as DbClientRow | null) ?? null;
    if (!data) return null;
  } else {
    const { data: existing, error } = await supabase
      .from("clients")
      .select("*")
      .eq("owner_id", userId)
      .eq("id", clientId)
      .maybeSingle();
    if (error || !existing) return null;
    data = existing as DbClientRow;
  }

  try {
    await ensureClientProfileRow(auth, clientId, data.name);
    const sections = profileSectionsFromClientInput(input);
    if (hasProfileSectionPayload(sections)) {
      const { upsertClientProfile } = await import(
        "@/lib/repositories/client-profile-repository"
      );
      await upsertClientProfile(
        clientId,
        sections as Parameters<typeof upsertClientProfile>[1],
      );
    }
  } catch (profileError) {
    console.error(
      "[client-repository] updateClientProfile: profile upsert failed:",
      profileError,
    );
  }

  notifyClientsUpdated();

  const { data: profileRow } = await supabase
    .from("client_profiles")
    .select("basic, health, lifestyle, exercise")
    .eq("owner_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();

  return mapDbClient(
    data,
    [],
    profileRow
      ? profileOverlayFromRow(
          profileRow as {
            basic?: unknown;
            health?: unknown;
            lifestyle?: unknown;
            exercise?: unknown;
          },
        )
      : undefined,
  );
}

export async function saveAnalysisToRepository(
  result: AnalysisResult,
): Promise<SavedAnalysisRef | null> {
  const auth = await getSupabaseAuth();
  if (!auth) return saveLocalAnalysis(result);

  const { supabase, userId } = auth;

  // 同一結果の再保存を防ぐ（Strict Mode / 二重呼び出し対策）
  const existingAnalysisId = result.analysisId?.trim();
  if (existingAnalysisId) {
    const { data: existingAnalysis, error: existingError } = await supabase
      .from("analyses")
      .select("id, client_id")
      .eq("owner_id", userId)
      .eq("id", existingAnalysisId)
      .maybeSingle();

    if (existingError) {
      throw formatSupabaseError(
        existingError,
        "saveAnalysis:selectExistingAnalysis",
      );
    }

    if (existingAnalysis) {
      const existingRef = {
        clientId: String((existingAnalysis as { client_id: string }).client_id),
        analysisId: String((existingAnalysis as { id: string }).id),
      };
      rememberLastSavedAnalysisRef(existingRef);
      return existingRef;
    }
  }

  const name = result.clientName?.trim() || "未設定";
  const analysisDate =
    result.measurementDate?.trim() || new Date().toISOString().slice(0, 10);
  const metrics = normalizeMetrics(result.metrics);
  const extractedMetrics = normalizeMetrics(
    result.extractedMetrics ?? result.metrics,
  );
  const structured = buildStructuredMetrics(metrics, result.graphs);
  const sleepScore =
    typeof metrics.sleepScore === "number" && Number.isFinite(metrics.sleepScore)
      ? metrics.sleepScore
      : null;

  let clientId: string | null = null;

  const preferredClientId = result.clientId?.trim();
  if (preferredClientId) {
    const { data: ownedClient, error: ownedLookupError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("owner_id", userId)
      .eq("id", preferredClientId)
      .maybeSingle();

    if (ownedLookupError) {
      throw formatSupabaseError(ownedLookupError, "saveAnalysis:selectClientById");
    }

    if (ownedClient && typeof (ownedClient as { id?: string }).id === "string") {
      clientId = (ownedClient as { id: string }).id;
    }
  }

  if (!clientId) {
    const { data: existingRows, error: existingLookupError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("owner_id", userId);

    if (existingLookupError) {
      throw formatSupabaseError(existingLookupError, "saveAnalysis:selectClients");
    }

    const matched = ((existingRows ?? []) as { id: string; name: string }[]).find(
      (row) =>
        row.name.trim().replace(/\s+/g, " ").toLowerCase() ===
        name.replace(/\s+/g, " ").toLowerCase(),
    );

    if (matched) {
      clientId = matched.id;
      await ensureClientProfileRow(auth, clientId, name);
    } else {
      // clients は最小情報のみ。詳細は直後の client_profiles へ。
      // profile 作成失敗時は client を削除してロールバック相当にする。
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          owner_id: userId,
          name,
        })
        .select("id")
        .single();

      if (clientError) {
        throw formatSupabaseError(clientError, "saveAnalysis:insertClient");
      }
      clientId = (newClient as { id: string }).id;

      try {
        await ensureClientProfileRow(auth, clientId, name);
      } catch (profileError) {
        await supabase
          .from("clients")
          .delete()
          .eq("owner_id", userId)
          .eq("id", clientId);
        throw profileError;
      }
    }
  }

  if (clientId) {
    try {
      const { upsertClientProfile } = await import(
        "@/lib/repositories/client-profile-repository"
      );
      const parseOptionalNumber = (value: string | undefined) => {
        if (!value?.trim()) return undefined;
        const n = Number(value);
        return Number.isFinite(n) && n > 0 ? n : undefined;
      };
      await upsertClientProfile(clientId, {
        basic: {
          fullName: name,
          gender: result.gender?.trim() || undefined,
          ageYears: parseOptionalNumber(result.age),
          heightCm: parseOptionalNumber(result.heightCm),
          weightKg: parseOptionalNumber(result.weightKg),
        },
        health: {
          medicationsNote: result.medications?.trim() || undefined,
          snoringNasalNote: result.snoringNasal?.trim() || undefined,
          medicalHistoryNote: result.medicalHistory?.trim() || undefined,
        },
        lifestyle: {
          drinkingHabitNote: result.drinkingHabit?.trim() || undefined,
        },
        exercise: {
          exerciseHabitNote: result.exerciseHabit?.trim() || undefined,
        },
      });
    } catch (profileError) {
      console.error(
        "[client-repository] saveAnalysis: upsertClientProfile failed:",
        profileError,
      );
    }
  }

  const reportPayload = {
    medical: {
      summary: result.summary,
      sleepAnalysis: result.sleepAnalysis,
      autonomicAssessment: result.autonomicAssessment,
      recoveryAssessment: result.recoveryAssessment,
      improvements: result.improvements,
      melatoninYoga: result.melatoninYoga,
      score: result.score,
      scoreBreakdown: result.scoreBreakdown,
      metrics,
      structured,
      caution: result.caution,
      disclaimer: result.disclaimer,
    },
    visual: {
      metrics,
      structured,
      graphs: result.graphs ?? null,
    },
    clientName: name,
    measurementDate: analysisDate,
  };

  const aiResultPayload: AnalysisResult = {
    ...result,
    metrics,
    extractedMetrics,
    graphs: result.graphs,
    clientId,
    clientName: name,
    measurementDate: analysisDate,
  };

  const ocrConfidence: Record<string, number> = {};
  if (result.ocrConfidence) {
    for (const [key, value] of Object.entries(result.ocrConfidence)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        ocrConfidence[key] = value;
      }
    }
  }
  if (Object.keys(ocrConfidence).length === 0) {
    for (const key of Object.keys(metrics)) {
      const value = metrics[key as keyof AnalysisMetrics];
      const present =
        key === "sleepScore"
          ? typeof value === "number" && Number.isFinite(value)
          : typeof value === "string" && value.trim().length > 0;
      if (present) ocrConfidence[key] = 0.85;
    }
  }

  const ocrSourceImages = (() => {
    const indexes = new Set<number>();
    if (result.graphs) {
      for (const panel of Object.values(result.graphs)) {
        if (
          panel &&
          typeof panel.sourceImageIndex === "number" &&
          panel.sourceImageIndex >= 0
        ) {
          indexes.add(panel.sourceImageIndex);
        }
      }
    }
    // グラフが無くても、信頼度キーが存在するなら少なくとも index 0 を記録
    if (indexes.size === 0 && Object.keys(ocrConfidence).length > 0) {
      indexes.add(0);
    }
    return [...indexes].sort((a, b) => a - b);
  })();

  const insertPayload = {
    client_id: clientId,
    owner_id: userId,
    analyzed_at: new Date(`${analysisDate}T12:00:00`).toISOString(),
    analysis_date: analysisDate,
    sleep_score: sleepScore,
    sleep_duration: parseNumeric(metrics.sleepDuration),
    sleep_efficiency: parseNumeric(metrics.sleepEfficiency),
    deep_sleep: parseNumeric(metrics.deepSleep),
    awakenings: parseNumeric(metrics.awakenings),
    sleep_latency: parseNumeric(metrics.sleepLatency),
    spo2: parseNumeric(metrics.spo2),
    hrv: parseNumeric(metrics.hrv),
    resting_heart_rate: parseNumeric(metrics.restingHeartRate),
    sleep_onset_time: structured.sleepOnsetTime || null,
    wake_time: structured.wakeTime || null,
    skin_temperature_value: structured.skinTemperatureValue || null,
    skin_temperature_type: structured.skinTemperatureType || null,
    skin_temperature_unit: structured.skinTemperatureUnit || "℃",
    stress_average: structured.stressAverage || null,
    stress_level: structured.stressLevel || null,
    stress_series: structured.stressSeries,
    ocr_source_images: ocrSourceImages,
    ocr_confidence: ocrConfidence,
    ocr_data: {
      extracted: extractedMetrics,
      confirmed: metrics,
      structured,
    },
    confirmed_metrics: metrics,
    report_payload: reportPayload,
    ai_result: aiResultPayload,
    credits_consumed: 0,
  };

  const { data: analysisRow, error: analysisError } = await supabase
    .from("analyses")
    .insert(insertPayload as never)
    .select("id")
    .single();

  if (analysisError) {
    // confirmed_metrics / report_payload 未適用環境向けフォールバック
    const message = analysisError.message ?? "";
    if (
      message.includes("confirmed_metrics") ||
      message.includes("report_payload") ||
      message.includes("credits_consumed")
    ) {
      const { data: fallbackRow, error: fallbackError } = await supabase
        .from("analyses")
        .insert({
          client_id: clientId,
          owner_id: userId,
          analyzed_at: new Date(`${analysisDate}T12:00:00`).toISOString(),
          sleep_score: sleepScore,
          sleep_duration: parseNumeric(metrics.sleepDuration),
          sleep_efficiency: parseNumeric(metrics.sleepEfficiency),
          deep_sleep: parseNumeric(metrics.deepSleep),
          awakenings: parseNumeric(metrics.awakenings),
          sleep_latency: parseNumeric(metrics.sleepLatency),
          spo2: parseNumeric(metrics.spo2),
          hrv: parseNumeric(metrics.hrv),
          resting_heart_rate: parseNumeric(metrics.restingHeartRate),
          ocr_data: {
            extracted: extractedMetrics,
            confirmed: metrics,
          },
          ai_result: aiResultPayload,
        })
        .select("id")
        .single();

      if (fallbackError) {
        throw formatSupabaseError(fallbackError, "saveAnalysis:insertAnalysisFallback");
      }

      notifyClientsUpdated();
      const fallbackRef = {
        clientId,
        analysisId: (fallbackRow as { id: string }).id,
      };
      rememberLastSavedAnalysisRef(fallbackRef);
      return fallbackRef;
    }

    throw formatSupabaseError(analysisError, "saveAnalysis:insertAnalysis");
  }

  notifyClientsUpdated();
  const savedRef = {
    clientId,
    analysisId: (analysisRow as { id: string }).id,
  };
  rememberLastSavedAnalysisRef(savedRef);
  return savedRef;
}

export async function recordPdfDownload(
  clientId: string,
  analysisId: string,
  label = "PDFダウンロード",
): Promise<void> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    recordLocalPdfDownload(clientId, analysisId, label);
    return;
  }
  // PDF 履歴は Supabase 初版では localStorage 互換のためスキップ（将来拡張）
}
