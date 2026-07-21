import type { AnalysisMetrics, AnalysisResult } from "@/lib/analysis-session";
import {
  createClient as createLocalClient,
  getClientById as getLocalClientById,
  getClientListItems as getLocalClientListItems,
  getComparableClients as getLocalComparableClients,
  loadClients as loadLocalClients,
  recordPdfDownload as recordLocalPdfDownload,
  rememberLastSavedAnalysisRef,
  saveAnalysisToClientStore as saveLocalAnalysis,
  type ClientListItem,
  type CreateClientInput,
  type PdfHistoryEntry,
  type SavedAnalysisRef,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/client-store";
import {
  normalizeMetrics,
  normalizeAnalysisResult,
} from "@/lib/analysis-session";
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

type DbClientRow = {
  id: string;
  owner_id: string;
  name: string;
  name_kana: string | null;
  birth_date: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  registered_at: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type DbAnalysisRow = {
  id: string;
  client_id: string;
  owner_id: string;
  analyzed_at: string;
  sleep_score: number | null;
  sleep_duration: number | null;
  sleep_efficiency: number | null;
  deep_sleep: number | null;
  awakenings: number | null;
  sleep_latency: number | null;
  spo2: number | null;
  hrv: number | null;
  resting_heart_rate: number | null;
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
        sleepCharacteristics: "",
        improvements: [],
        actionPlan: [],
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
    analysisDate: row.analyzed_at.slice(0, 10),
    createdAt: row.created_at,
    sleepScore,
    wellnessScore: result.score,
    metrics,
    result,
    pdfHistory: [],
  };
}

function mapDbClient(row: DbClientRow, analyses: StoredAnalysis[]): StoredClient {
  return {
    id: row.id,
    name: row.name,
    registeredAt: row.registered_at ?? row.created_at.slice(0, 10),
    nameKana: row.name_kana ?? undefined,
    birthDate: row.birth_date ?? undefined,
    gender: row.gender ?? undefined,
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

  const analysesByClient = new Map<string, StoredAnalysis[]>();
  for (const row of (analysisRows ?? []) as DbAnalysisRow[]) {
    const list = analysesByClient.get(row.client_id) ?? [];
    list.push(mapDbAnalysis(row));
    analysesByClient.set(row.client_id, list);
  }

  return ((clientRows ?? []) as DbClientRow[]).map((row) =>
    mapDbClient(row, analysesByClient.get(row.id) ?? []),
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

  const analysis = mapDbAnalysis(row);
  const client = mapDbClient(clientRow as DbClientRow, [analysis]);
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
  if (!auth) return createLocalClient(input);

  const name = input.name.trim();
  if (!name) throw new Error("氏名は必須です。");

  const { supabase, userId } = auth;

  const { data: existingRows, error: existingError } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_id", userId)
    .ilike("name", name);

  if (existingError) {
    throw formatSupabaseError(existingError, "createClient:select");
  }

  const existing = ((existingRows ?? []) as DbClientRow[]).find(
    (row) =>
      row.name.trim().replace(/\s+/g, " ").toLowerCase() ===
      name.replace(/\s+/g, " ").toLowerCase(),
  );

  if (existing) {
    return mapDbClient(existing, []);
  }

  const registeredAt =
    input.registeredAt?.trim() || new Date().toISOString().slice(0, 10);

  const payload = {
    owner_id: userId,
    name,
    name_kana: input.nameKana?.trim() || null,
    birth_date: input.birthDate?.trim() || null,
    gender: input.gender?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    registered_at: registeredAt,
    memo: input.memo?.trim() || null,
  };

  console.info("[client-repository] createClient insert payload:", payload);

  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw formatSupabaseError(error, "createClient:insert");
  }

  if (!data) {
    console.error("[client-repository] createClient: insert returned no data");
    throw new Error("登録結果を取得できませんでした。");
  }

  notifyClientsUpdated();
  return mapDbClient(data as DbClientRow, []);
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
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          owner_id: userId,
          name,
          registered_at: analysisDate,
        })
        .select("id")
        .single();

      if (clientError) {
        throw formatSupabaseError(clientError, "saveAnalysis:insertClient");
      }
      clientId = (newClient as { id: string }).id;
    }
  }

  const reportPayload = {
    medical: {
      summary: result.summary,
      sleepCharacteristics: result.sleepCharacteristics,
      improvements: result.improvements,
      actionPlan: result.actionPlan,
      melatoninYoga: result.melatoninYoga,
      score: result.score,
      scoreBreakdown: result.scoreBreakdown,
      metrics,
      caution: result.caution,
      disclaimer: result.disclaimer,
    },
    visual: {
      metrics,
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

  const insertPayload = {
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
