import type {
  AnalysisMetrics,
  AnalysisResult,
  NextActionGoal,
} from "@/lib/analysis-session";
import {
  computeHomeworkAchievement,
  normalizeAnalysisResult,
  normalizeMetrics,
  normalizeRecommendationsUntilNext,
} from "@/lib/analysis-session";
import {
  getClientById as getLocalClientById,
  loadClients as loadLocalClients,
  updateAnalysisRecommendationsUntilNext as updateLocalAnalysisRecommendationsUntilNext,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/client-store";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatSupabaseError } from "@/lib/supabase/errors";
import {
  buildStructuredMetrics,
  parseStructuredFromStorage,
} from "@/lib/soxai-structured-metrics";

export type ClientInstructorInfo = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  message: string;
};

export type ClientMypageData = {
  client: StoredClient;
  instructor: ClientInstructorInfo | null;
};

type DbClientRow = {
  id: string;
  instructor_id: string;
  name: string;
  name_kana: string | null;
  birth_date?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  registered_at?: string | null;
  memo: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at?: string;
  auth_user_id?: string | null;
};

type DbAnalysisRow = {
  id: string;
  client_id: string;
  owner_id: string;
  analyzed_at: string;
  analysis_date?: string | null;
  sleep_score: number | null;
  ocr_data: unknown;
  confirmed_metrics?: AnalysisMetrics | null;
  report_payload?: unknown;
  ai_result: AnalysisResult | null;
  created_at: string;
  sleep_onset_time?: string | null;
  wake_time?: string | null;
  skin_temperature_value?: string | null;
  skin_temperature_type?: string | null;
  skin_temperature_unit?: string | null;
  stress_average?: string | null;
  stress_level?: string | null;
  stress_series?: unknown;
};

type DbProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  client_message: string | null;
};

function notifyClientsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("swij-clients-updated"));
  }
}

function parseOcrPayload(ocr: unknown): {
  extracted?: AnalysisMetrics;
  confirmed?: AnalysisMetrics;
} {
  if (!ocr || typeof ocr !== "object" || Array.isArray(ocr)) return {};
  const record = ocr as Record<string, unknown>;
  return {
    extracted: record.extracted as AnalysisMetrics | undefined,
    confirmed: record.confirmed as AnalysisMetrics | undefined,
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
        karteSummary: "",
        goodPoints: [],
        improvements: [],
        profileRelation: "",
        scoreComment: "",
        todaysRecommendations: [],
        nextComparisonPoints: [],
        recommendationsUntilNext: [],
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
    analysisDate: row.analysis_date?.trim() || row.analyzed_at.slice(0, 10),
    createdAt: row.created_at,
    sleepScore,
    wellnessScore: result.score,
    metrics,
    structured: structured ?? buildStructuredMetrics(metrics, graphs),
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
    tags: Array.isArray(row.tags) ? row.tags : undefined,
    analyses: [...analyses].sort((a, b) => {
      const byCreated = b.createdAt.localeCompare(a.createdAt);
      if (byCreated !== 0) return byCreated;
      return b.analysisDate.localeCompare(a.analysisDate);
    }),
  };
}

async function getAuth() {
  if (!isSupabaseConfigured()) return null;
  const supabase = createBrowserClient();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, userId: user.id, email: user.email ?? null };
}

/**
 * メール一致で clients.auth_user_id を自分に紐付ける（未紐付け時）。
 */
export async function claimMyClientPortal(): Promise<boolean> {
  const auth = await getAuth();
  if (!auth) return false;

  const { error } = await auth.supabase.rpc("claim_my_client_portal");
  if (error) {
    // 関数未適用環境では黙ってスキップ
    if (/claim_my_client_portal|Could not find the function/i.test(error.message)) {
      return false;
    }
    console.error("[client-mypage] claim_my_client_portal failed:", error);
    return false;
  }
  return true;
}

async function fetchLinkedClientRow(
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>,
  userId: string,
): Promise<DbClientRow | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    throw formatSupabaseError(error, "getMyClientMypage:client");
  }
  return (data as DbClientRow | null) ?? null;
}

/**
 * ログイン中クライアント本人のマイページデータを取得。
 * 紐付けが無い場合は email claim を試行する。
 */
export async function getMyClientMypage(): Promise<ClientMypageData | null> {
  const auth = await getAuth();

  // デモ / ローカル: 先頭クライアントを表示（開発用）
  if (!auth) {
    const local = loadLocalClients();
    const client = local[0] ?? null;
    if (!client) return null;
    return {
      client,
      instructor: {
        id: "demo-instructor",
        displayName: "認定講師（デモ）",
        avatarUrl: null,
        message:
          "デモモードです。Supabase 連携後は担当認定講師のメッセージが表示されます。",
      },
    };
  }

  const { supabase, userId } = auth;

  let clientRow = await fetchLinkedClientRow(supabase, userId);
  if (!clientRow) {
    await claimMyClientPortal();
    clientRow = await fetchLinkedClientRow(supabase, userId);
  }
  if (!clientRow) return null;

  const { data: analysisRows, error: analysisError } = await supabase
    .from("analyses")
    .select("*")
    .eq("client_id", clientRow.id)
    .order("created_at", { ascending: false });

  if (analysisError) {
    throw formatSupabaseError(analysisError, "getMyClientMypage:analyses");
  }

  const analyses = ((analysisRows ?? []) as DbAnalysisRow[]).map(mapDbAnalysis);
  const client = mapDbClient(clientRow, analyses);

  let instructor: ClientInstructorInfo | null = null;
  const instructorId = clientRow.instructor_id;
  if (instructorId) {
    let profileRow: DbProfileRow | null = null;
    const profileQuery = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, client_message")
      .eq("id", instructorId)
      .maybeSingle();

    if (profileQuery.error) {
      // マイグレーション未適用時は display_name のみ
      const fallback = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", instructorId)
        .maybeSingle();
      if (fallback.data) {
        profileRow = {
          id: String(fallback.data.id),
          display_name: fallback.data.display_name,
          avatar_url: null,
          client_message: null,
        };
      }
    } else {
      profileRow = profileQuery.data as DbProfileRow | null;
    }

    let message = profileRow?.client_message?.trim() ?? "";

    if (!message) {
      const { data: notes } = await supabase
        .from("client_guidance_notes")
        .select("content")
        .eq("client_id", clientRow.id)
        .order("note_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      const latest = Array.isArray(notes) ? notes[0] : null;
      if (latest && typeof latest.content === "string") {
        message = latest.content.trim();
      }
    }

    instructor = {
      id: instructorId,
      displayName: profileRow?.display_name?.trim() || "担当認定講師",
      avatarUrl: profileRow?.avatar_url?.trim() || null,
      message,
    };
  }

  return { client, instructor };
}

/**
 * 本人の分析詳細（マイページ履歴用）。
 */
export async function getMyAnalysisById(
  analysisId: string,
): Promise<{ client: StoredClient; analysis: StoredAnalysis } | null> {
  const auth = await getAuth();
  if (!auth) {
    const clients = loadLocalClients();
    for (const client of clients) {
      const analysis = client.analyses.find((item) => item.id === analysisId);
      if (analysis) return { client, analysis };
    }
    return null;
  }

  const mypage = await getMyClientMypage();
  if (!mypage) return null;
  const analysis = mypage.client.analyses.find((item) => item.id === analysisId);
  if (!analysis) return null;
  return { client: mypage.client, analysis };
}

/**
 * クライアント本人による宿題チェック更新。
 * 講師経路が失敗した場合のフォールバックとしても使う。
 */
export async function updateOwnHomeworkChecks(
  analysisId: string,
  goals: NextActionGoal[],
): Promise<boolean> {
  const normalized = normalizeRecommendationsUntilNext(goals);
  const auth = await getAuth();
  if (!auth) {
    return updateLocalAnalysisRecommendationsUntilNext(analysisId, normalized);
  }

  const { data, error } = await auth.supabase.rpc("update_own_homework_checks", {
    p_analysis_id: analysisId,
    p_goals: normalized,
  });

  if (error) {
    console.error("[client-mypage] update_own_homework_checks failed:", error);
    return false;
  }

  if (data && typeof data === "object") {
    // ローカルキャッシュ同期（存在するクライアントのみ）
    updateLocalAnalysisRecommendationsUntilNext(analysisId, normalized);
    void computeHomeworkAchievement(normalized);
  }

  notifyClientsUpdated();
  return true;
}

/**
 * 認定講師がクライアントのマイページ連携メール / auth を設定。
 */
export async function linkClientPortalUser(input: {
  clientId: string;
  email?: string;
  authUserId?: string;
}): Promise<boolean> {
  const auth = await getAuth();
  if (!auth) {
    // ローカルは email だけ保存
    const client = getLocalClientById(input.clientId);
    if (!client || !input.email?.trim()) return false;
    const { updateClientProfile } = await import(
      "@/lib/repositories/client-repository"
    );
    await updateClientProfile(input.clientId, { email: input.email.trim() });
    return true;
  }

  const { error } = await auth.supabase.rpc("link_client_portal_user", {
    p_client_id: input.clientId,
    p_email: input.email?.trim() || null,
    p_auth_user_id: input.authUserId ?? null,
  });

  if (error) {
    console.error("[client-mypage] link_client_portal_user failed:", error);
    return false;
  }

  notifyClientsUpdated();
  return true;
}
