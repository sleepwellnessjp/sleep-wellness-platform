import type { AnalysisMetrics, AnalysisResult } from "@/lib/analysis-session";
import {
  createClient as createLocalClient,
  getClientById as getLocalClientById,
  getClientListItems as getLocalClientListItems,
  getComparableClients as getLocalComparableClients,
  loadClients as loadLocalClients,
  recordPdfDownload as recordLocalPdfDownload,
  saveAnalysisToClientStore as saveLocalAnalysis,
  type ClientListItem,
  type CreateClientInput,
  type PdfHistoryEntry,
  type SavedAnalysisRef,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/client-store";
import { normalizeMetrics } from "@/lib/analysis-session";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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
  ocr_data: AnalysisMetrics | null;
  ai_result: AnalysisResult | null;
  created_at: string;
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

function mapDbAnalysis(row: DbAnalysisRow): StoredAnalysis {
  const metrics = normalizeMetrics(row.ocr_data ?? undefined);
  const resultRaw = row.ai_result;
  const result: AnalysisResult = resultRaw
    ? {
        ...resultRaw,
        metrics: normalizeMetrics(resultRaw.metrics ?? metrics),
      }
    : {
        summary: "",
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
        goodPoints: [],
        improvements: [],
        dataInsight: "",
        lifestyleRelation: "",
        tomorrowPlan: [],
        caution: "",
        disclaimer: "",
      };

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
      const byDate = b.analysisDate.localeCompare(a.analysisDate);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    }),
  };
}

async function fetchClientsFromSupabase(auth: SupabaseAuth): Promise<StoredClient[]> {
  const { supabase, userId } = auth;

  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (clientError) throw clientError;

  const { data: analysisRows, error: analysisError } = await supabase
    .from("analyses")
    .select("*")
    .eq("owner_id", userId)
    .order("analyzed_at", { ascending: false });

  if (analysisError) throw analysisError;

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

  const { data: existingRows } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_id", userId)
    .ilike("name", name);

  const existing = ((existingRows ?? []) as DbClientRow[]).find(
    (row) => row.name.trim().replace(/\s+/g, " ").toLowerCase() === name.replace(/\s+/g, " ").toLowerCase(),
  );

  if (existing) {
    return mapDbClient(existing, []);
  }

  const registeredAt =
    input.registeredAt?.trim() || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("clients")
    .insert({
      owner_id: userId,
      name,
      name_kana: input.nameKana?.trim() || null,
      birth_date: input.birthDate?.trim() || null,
      gender: input.gender?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      registered_at: registeredAt,
      memo: input.memo?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw error;

  notifyClientsUpdated();
  return mapDbClient(data as DbClientRow, []);
}

export async function saveAnalysisToRepository(
  result: AnalysisResult,
): Promise<SavedAnalysisRef | null> {
  const auth = await getSupabaseAuth();
  if (!auth) return saveLocalAnalysis(result);

  const { supabase, userId } = auth;
  const name = result.clientName?.trim() || "未設定";
  const analysisDate =
    result.measurementDate?.trim() || new Date().toISOString().slice(0, 10);
  const metrics = normalizeMetrics(result.metrics);
  const sleepScore =
    typeof metrics.sleepScore === "number" && Number.isFinite(metrics.sleepScore)
      ? metrics.sleepScore
      : null;

  let clientId: string;

  const { data: existingRows } = await supabase
    .from("clients")
    .select("id, name")
    .eq("owner_id", userId);

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

    if (clientError) throw clientError;
    clientId = (newClient as { id: string }).id;
  }

  const { data: analysisRow, error: analysisError } = await supabase
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
      ocr_data: metrics,
      ai_result: { ...result, metrics },
    })
    .select("id")
    .single();

  if (analysisError) throw analysisError;

  notifyClientsUpdated();
  return {
    clientId,
    analysisId: (analysisRow as { id: string }).id,
  };
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
