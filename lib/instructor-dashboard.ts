/**
 * 認定講師ダッシュボード V1.0 — 表示用データ契約。
 * Supabase / local の clients・analyses・appointments・programs・homeworks を集約する。
 */

import type { StoredClient } from "@/lib/client-store";
import { analysisSleepScore, loadClients } from "@/lib/repositories/client-repository";
import {
  getNextClientAppointment,
  listTodayOwnerAppointments,
} from "@/lib/repositories/client-appointments-repository";
import { listBetaHomeworks } from "@/lib/repositories/beta-homework-repository";
import { getProgramDetail } from "@/lib/repositories/program-repository";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isMissingTableError } from "@/lib/supabase/errors";
import {
  computeRecoveryIndex,
  type RecoveryIndexResult,
} from "@/lib/recovery-index";

export type InstructorTodayClient = {
  id: string;
  name: string;
  sleepScore: number | null;
  /** 前回分析からのスコア変化（ポイント）。null は初回など比較不可 */
  scoreDelta: number | null;
  /** ISO date (YYYY-MM-DD) */
  nextFollowUpDate: string | null;
};

export type InstructorActivityItem = {
  id: string;
  /** 表示用の相対日・時刻ラベル（例: 昨日） */
  whenLabel: string;
  /** 本文（例: ○○さん分析完了） */
  summary: string;
};

export type InstructorWeekPlan = {
  followUpCount: number;
  unanalyzedCount: number;
  homeworkPendingCount: number;
};

export type InstructorQuickLink = {
  id: string;
  label: string;
  href: string;
  emphasize?: boolean;
};

export type InstructorTodayTodoKind =
  | "counseling"
  | "unread_feedback"
  | "homework_pending"
  | "new_analysis";

export type InstructorTodayTodoItem = {
  id: string;
  kind: InstructorTodayTodoKind;
  title: string;
  detail: string;
  href: string;
};

export type InstructorTodayTodos = {
  counseling: InstructorTodayTodoItem[];
  unreadFeedback: InstructorTodayTodoItem[];
  homeworkPending: InstructorTodayTodoItem[];
  newAnalyses: InstructorTodayTodoItem[];
};

export type InstructorDashboardData = {
  instructorDisplayName: string;
  todayTodos: InstructorTodayTodos;
  todayClients: InstructorTodayClient[];
  recentActivity: InstructorActivityItem[];
  weekPlan: InstructorWeekPlan;
  quickLinks: InstructorQuickLink[];
  /** 直近分析から算出した回復指数（HRV×安静時心拍）。無い場合は null */
  latestRecovery: {
    clientId: string;
    clientName: string;
    analysisDate: string;
    recovery: RecoveryIndexResult;
  } | null;
};

export const INSTRUCTOR_QUICK_LINKS: InstructorQuickLink[] = [
  {
    id: "new-client",
    label: "＋ 新規クライアント登録",
    href: "/clients/new",
    emphasize: true,
  },
  { id: "analysis", label: "Analysis", href: "/analysis/new" },
  { id: "journey", label: "Journey", href: "/journey" },
  { id: "homework", label: "Homework", href: "/homework" },
  { id: "reports", label: "Report", href: "/reports" },
  { id: "vision", label: "Vision", href: "/vision" },
];

/** 開発・デモ用ダミー（Supabase 未設定かつローカルデータなしのときのみ） */
export const DUMMY_INSTRUCTOR_DASHBOARD: InstructorDashboardData = {
  instructorDisplayName: "山田",
  todayTodos: {
    counseling: [
      {
        id: "todo-counsel-1",
        kind: "counseling",
        title: "佐藤 美咲",
        detail: "10:00 · オンライン面談",
        href: "/clients/client-demo-1",
      },
      {
        id: "todo-counsel-2",
        kind: "counseling",
        title: "鈴木 健太",
        detail: "14:30 · 対面カウンセリング",
        href: "/clients/client-demo-2",
      },
    ],
    unreadFeedback: [
      {
        id: "todo-feedback-1",
        kind: "unread_feedback",
        title: "田中 あかり",
        detail: "メラトニンヨガを続けています…",
        href: "/clients/client-demo-3",
      },
    ],
    homeworkPending: [
      {
        id: "todo-hw-1",
        kind: "homework_pending",
        title: "伊藤 翔",
        detail: "就寝前ルーティン（提出待ち）",
        href: "/homework",
      },
      {
        id: "todo-hw-2",
        kind: "homework_pending",
        title: "加藤 里奈",
        detail: "呼吸エクササイズ（期限超過）",
        href: "/homework",
      },
    ],
    newAnalyses: [
      {
        id: "todo-analysis-1",
        kind: "new_analysis",
        title: "吉田 拓也",
        detail: "本日の睡眠分析 · スコア 58",
        href: "/clients/client-demo-10",
      },
    ],
  },
  todayClients: [
    {
      id: "client-demo-1",
      name: "佐藤 美咲",
      sleepScore: 72,
      scoreDelta: 4,
      nextFollowUpDate: "2026-07-25",
    },
    {
      id: "client-demo-2",
      name: "鈴木 健太",
      sleepScore: 61,
      scoreDelta: -3,
      nextFollowUpDate: "2026-07-24",
    },
    {
      id: "client-demo-3",
      name: "田中 あかり",
      sleepScore: 78,
      scoreDelta: 1,
      nextFollowUpDate: "2026-07-28",
    },
    {
      id: "client-demo-4",
      name: "伊藤 翔",
      sleepScore: null,
      scoreDelta: null,
      nextFollowUpDate: "2026-07-26",
    },
    {
      id: "client-demo-9",
      name: "加藤 里奈",
      sleepScore: 70,
      scoreDelta: 2,
      nextFollowUpDate: "2026-07-31",
    },
    {
      id: "client-demo-10",
      name: "吉田 拓也",
      sleepScore: 58,
      scoreDelta: -2,
      nextFollowUpDate: "2026-07-29",
    },
  ],
  recentActivity: [
    {
      id: "act-1",
      whenLabel: "昨日",
      summary: "佐藤さん分析完了",
    },
    {
      id: "act-2",
      whenLabel: "昨日",
      summary: "PDFレポート作成",
    },
    {
      id: "act-3",
      whenLabel: "2日前",
      summary: "Journey更新",
    },
    {
      id: "act-4",
      whenLabel: "3日前",
      summary: "松本さん Homework 確認",
    },
  ],
  weekPlan: {
    followUpCount: 5,
    unanalyzedCount: 2,
    homeworkPendingCount: 8,
  },
  quickLinks: INSTRUCTOR_QUICK_LINKS,
  latestRecovery: {
    clientId: "client-demo-1",
    clientName: "佐藤 美咲",
    analysisDate: "2026-07-24",
    recovery: computeRecoveryIndex({
      hrv: "48 ms",
      restingHeartRate: "56 bpm",
    }),
  },
};

function todayTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysTokyo(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function shortFamilyName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts[0] || fullName.trim() || "クライアント";
}

function scoreOf(client: StoredClient): number | null {
  const latest = client.analyses[0];
  if (latest) {
    const fromAnalysis = analysisSleepScore(latest);
    if (fromAnalysis != null) return fromAnalysis;
  }
  return typeof client.currentSleepScore === "number"
    ? client.currentSleepScore
    : null;
}

function scoreDeltaOf(client: StoredClient): number | null {
  const latest = client.analyses[0];
  const prev = client.analyses[1];
  if (!latest || !prev) return null;
  const a = analysisSleepScore(latest);
  const b = analysisSleepScore(prev);
  if (a == null || b == null) return null;
  return a - b;
}

function relativeWhenLabel(iso: string): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return iso.slice(0, 10);
  const now = new Date();
  const today = todayTokyo();
  const targetDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(target);
  if (targetDay === today) return "今日";
  if (targetDay === addDaysTokyo(today, -1)) return "昨日";
  const diffMs = now.getTime() - target.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days >= 2 && days < 7) return `${days}日前`;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
  }).format(target);
}

function firstNonEmptyName(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const trimmed = String(candidate ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function emailLocalPart(email: string | null | undefined): string {
  const value = String(email ?? "").trim();
  if (!value || !value.includes("@")) return "";
  return value.split("@")[0]?.trim() ?? "";
}

/**
 * ダッシュボード挨拶用の認定講師名。
 * 優先: certified_instructors.display_name → profiles.display_name → メール@前
 * （auth user_metadata / app_metadata には依存しない）
 */
async function resolveDisplayName(): Promise<string> {
  if (!isSupabaseConfigured()) return "";
  const supabase = createBrowserClient();
  if (!supabase) return "";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";

  const emailPrefix = emailLocalPart(user.email);

  // 1. certified_instructors.display_name（運営レコードの正式表示名）
  const { data: certifiedRow, error: certifiedError } = await supabase
    .from("certified_instructors")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (certifiedError) {
    console.warn(
      "[instructor-dashboard] certified_instructors display_name:",
      certifiedError.message,
    );
  }
  const fromCertified = firstNonEmptyName(
    typeof certifiedRow?.display_name === "string"
      ? certifiedRow.display_name
      : null,
  );
  if (fromCertified) return fromCertified;

  // 2. profiles.display_name
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.warn(
      "[instructor-dashboard] profiles display_name:",
      profileError.message,
    );
  }
  const fromProfile = firstNonEmptyName(
    typeof profileRow?.display_name === "string"
      ? profileRow.display_name
      : null,
  );
  if (fromProfile) return fromProfile;

  // 3. auth.users.email の @ より前
  return emailPrefix;
}

async function nextFollowUpFor(client: StoredClient): Promise<string | null> {
  if (client.nextFollowUpDate) return client.nextFollowUpDate;
  try {
    const next = await getNextClientAppointment(client.id);
    if (next?.startDate) return next.startDate;
  } catch {
    // appointments 未適用環境は無視
  }
  try {
    const program = await getProgramDetail(client.id);
    return program?.nextFollowUpDate ?? null;
  } catch {
    return null;
  }
}

function clientNameById(clients: StoredClient[]): Map<string, string> {
  return new Map(clients.map((client) => [client.id, client.name]));
}

async function loadUnreadFeedbackTodos(
  clients: StoredClient[],
): Promise<InstructorTodayTodoItem[]> {
  const names = clientNameById(clients);
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createBrowserClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("client_messages")
      .select("id, client_id, body, created_at")
      .eq("instructor_id", user.id)
      .eq("sender_role", "client")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      if (!isMissingTableError(error)) {
        console.warn("[instructor-dashboard] unread messages:", error.message);
      }
      return [];
    }

    const rows = (data ?? []) as Array<{
      id: string;
      client_id: string;
      body: string | null;
      created_at: string;
    }>;

    return rows.map((row) => {
      const clientName = names.get(row.client_id) ?? "クライアント";
      const body = (row.body ?? "").trim();
      return {
        id: `feedback-${row.id}`,
        kind: "unread_feedback" as const,
        title: clientName,
        detail: body
          ? body.length > 40
            ? `${body.slice(0, 40)}…`
            : body
          : "未読フィードバック",
        href: `/clients/${encodeURIComponent(row.client_id)}`,
      };
    });
  } catch (error) {
    console.warn("[instructor-dashboard] unread feedback failed:", error);
    return [];
  }
}

async function buildTodayTodos(
  clients: StoredClient[],
): Promise<InstructorTodayTodos> {
  const names = clientNameById(clients);
  const today = todayTokyo();

  let counseling: InstructorTodayTodoItem[] = [];
  try {
    const appointments = await listTodayOwnerAppointments();
    counseling = appointments.map((appointment) => {
      const clientName = names.get(appointment.clientId) ?? "クライアント";
      const timeLabel = appointment.startTime
        ? appointment.startTime.slice(0, 5)
        : "時間未設定";
      const place =
        appointment.locationType === "online"
          ? "オンライン"
          : appointment.locationType === "in_person"
            ? "対面"
            : appointment.locationType === "phone"
              ? "電話"
              : appointment.title || "カウンセリング";
      return {
        id: `counsel-${appointment.id}`,
        kind: "counseling" as const,
        title: clientName,
        detail: `${timeLabel} · ${place}`,
        href: `/clients/${encodeURIComponent(appointment.clientId)}`,
      };
    });
  } catch (error) {
    console.warn("[instructor-dashboard] today appointments:", error);
  }

  const unreadFeedback = await loadUnreadFeedbackTodos(clients);

  const homeworkPending: InstructorTodayTodoItem[] = [];
  await Promise.all(
    clients.map(async (client) => {
      try {
        const homeworks = await listBetaHomeworks(client.id);
        for (const hw of homeworks) {
          if (hw.status === "completed") continue;
          const statusLabel =
            hw.status === "overdue"
              ? "期限超過"
              : hw.status === "not_started"
                ? "未実施"
                : "提出待ち";
          homeworkPending.push({
            id: `hw-${hw.id}`,
            kind: "homework_pending",
            title: client.name,
            detail: `${hw.title}（${statusLabel}）`,
            href: "/homework",
          });
        }
      } catch {
        // homework 未適用環境は無視
      }
    }),
  );

  const newAnalyses: InstructorTodayTodoItem[] = [];
  for (const client of clients) {
    for (const analysis of client.analyses) {
      const day =
        analysis.analysisDate?.trim() ||
        (analysis.createdAt ? analysis.createdAt.slice(0, 10) : "");
      if (day !== today) continue;
      const score = analysisSleepScore(analysis);
      newAnalyses.push({
        id: `analysis-${analysis.id}`,
        kind: "new_analysis",
        title: client.name,
        detail:
          score != null
            ? `本日の睡眠分析 · スコア ${score}`
            : "本日の睡眠分析",
        href: `/clients/${encodeURIComponent(client.id)}`,
      });
    }
  }

  return {
    counseling,
    unreadFeedback,
    homeworkPending: homeworkPending.slice(0, 12),
    newAnalyses: newAnalyses.slice(0, 12),
  };
}

/**
 * 講師ダッシュボード取得。
 * clients / analyses / appointments / programs / homeworks を集約する。
 */
export async function getInstructorDashboard(): Promise<InstructorDashboardData> {
  let clients: StoredClient[] = [];
  try {
    clients = await loadClients();
  } catch (error) {
    console.error("[instructor-dashboard] loadClients failed:", error);
  }

  if (!isSupabaseConfigured() && clients.length === 0) {
    return DUMMY_INSTRUCTOR_DASHBOARD;
  }

  const displayName = await resolveDisplayName();
  const today = todayTokyo();
  const weekEnd = addDaysTokyo(today, 7);
  const todayTodos = await buildTodayTodos(clients);

  const followUpDates = await Promise.all(
    clients.map(async (client) => ({
      client,
      nextFollowUpDate: await nextFollowUpFor(client),
    })),
  );

  const todayClients: InstructorTodayClient[] = followUpDates
    .map(({ client, nextFollowUpDate }) => ({
      id: client.id,
      name: client.name,
      sleepScore: scoreOf(client),
      scoreDelta: scoreDeltaOf(client),
      nextFollowUpDate,
    }))
    .sort((a, b) => {
      const aDate = a.nextFollowUpDate ?? "9999-99-99";
      const bDate = b.nextFollowUpDate ?? "9999-99-99";
      return aDate.localeCompare(bDate);
    })
    .slice(0, 8);

  const activityCandidates: Array<{ at: string; item: InstructorActivityItem }> =
    [];
  for (const client of clients) {
    for (const analysis of client.analyses.slice(0, 3)) {
      activityCandidates.push({
        at: analysis.createdAt || `${analysis.analysisDate}T12:00:00+09:00`,
        item: {
          id: `analysis-${analysis.id}`,
          whenLabel: relativeWhenLabel(
            analysis.createdAt || `${analysis.analysisDate}T12:00:00+09:00`,
          ),
          summary: `${shortFamilyName(client.name)}さん分析完了`,
        },
      });
    }
    for (const analysis of client.analyses.slice(0, 2)) {
      for (const pdf of analysis.pdfHistory.slice(0, 1)) {
        activityCandidates.push({
          at: pdf.createdAt,
          item: {
            id: `pdf-${pdf.id}`,
            whenLabel: relativeWhenLabel(pdf.createdAt),
            summary: `${shortFamilyName(client.name)}さんPDFレポート作成`,
          },
        });
      }
    }
  }
  const recentActivity = activityCandidates
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)
    .map((entry) => entry.item);

  let homeworkPendingCount = 0;
  await Promise.all(
    clients.map(async (client) => {
      try {
        const homeworks = await listBetaHomeworks(client.id);
        homeworkPendingCount += homeworks.filter(
          (hw) => hw.status !== "completed",
        ).length;
      } catch {
        // homework 未適用環境は無視
      }
    }),
  );

  const followUpCount = followUpDates.filter(({ nextFollowUpDate }) => {
    if (!nextFollowUpDate) return false;
    return nextFollowUpDate >= today && nextFollowUpDate <= weekEnd;
  }).length;
  const unanalyzedCount = clients.filter((client) => client.analyses.length === 0)
    .length;

  let latestRecovery: InstructorDashboardData["latestRecovery"] = null;
  let latestAt = "";
  for (const client of clients) {
    for (const analysis of client.analyses) {
      const at = analysis.createdAt || `${analysis.analysisDate}T12:00:00+09:00`;
      if (latestAt && at <= latestAt) continue;
      const recovery = computeRecoveryIndex({
        hrv: analysis.metrics?.hrv,
        restingHeartRate: analysis.metrics?.restingHeartRate,
      });
      if (!recovery.available) continue;
      latestAt = at;
      latestRecovery = {
        clientId: client.id,
        clientName: client.name,
        analysisDate: analysis.analysisDate,
        recovery,
      };
    }
  }

  return {
    instructorDisplayName: displayName,
    todayTodos,
    todayClients,
    recentActivity,
    weekPlan: {
      followUpCount,
      unanalyzedCount,
      homeworkPendingCount,
    },
    quickLinks: INSTRUCTOR_QUICK_LINKS,
    latestRecovery,
  };
}

export function formatSenseiName(displayName: string): string {
  const cleaned = displayName.trim();
  if (!cleaned) return "認定講師先生";
  if (cleaned.endsWith("先生")) return cleaned;
  return `${cleaned}先生`;
}

export function formatFollowUpDate(isoDate: string | null): string {
  if (!isoDate) return "未設定";
  const d = new Date(`${isoDate}T12:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

export function formatScoreDelta(delta: number | null): string {
  if (delta == null || !Number.isFinite(delta)) return "—";
  if (delta > 0) return `+${delta}`;
  return String(delta);
}
