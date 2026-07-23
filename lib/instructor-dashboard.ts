/**
 * 認定講師ダッシュボード V1.0 — 表示用データ契約。
 * Supabase / local の clients・analyses・appointments・programs・homeworks を集約する。
 */

import type { StoredClient } from "@/lib/client-store";
import { analysisSleepScore, loadClients } from "@/lib/repositories/client-repository";
import { getNextClientAppointment } from "@/lib/repositories/client-appointments-repository";
import { listBetaHomeworks } from "@/lib/repositories/beta-homework-repository";
import { getProgramDetail } from "@/lib/repositories/program-repository";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

export type InstructorDashboardData = {
  instructorDisplayName: string;
  todayClients: InstructorTodayClient[];
  recentActivity: InstructorActivityItem[];
  weekPlan: InstructorWeekPlan;
  quickLinks: InstructorQuickLink[];
};

export const INSTRUCTOR_QUICK_LINKS: InstructorQuickLink[] = [
  {
    id: "new-client",
    label: "＋ 新規クライアント登録",
    href: "/clients/new",
    emphasize: true,
  },
  { id: "analysis", label: "Analysis", href: "/analysis" },
  { id: "journey", label: "Journey", href: "/journey" },
  { id: "homework", label: "Homework", href: "/homework" },
  { id: "reports", label: "Report", href: "/reports" },
  { id: "vision", label: "Vision", href: "/vision" },
];

/** 開発・デモ用ダミー（Supabase 未設定かつローカルデータなしのときのみ） */
export const DUMMY_INSTRUCTOR_DASHBOARD: InstructorDashboardData = {
  instructorDisplayName: "山田",
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
  ],
  weekPlan: {
    followUpCount: 5,
    unanalyzedCount: 2,
    homeworkPendingCount: 3,
  },
  quickLinks: INSTRUCTOR_QUICK_LINKS,
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

async function resolveDisplayName(): Promise<string> {
  if (!isSupabaseConfigured()) return "";
  const supabase = createBrowserClient();
  if (!supabase) return "";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    data && typeof (data as { display_name?: string | null }).display_name === "string"
      ? (data as { display_name: string }).display_name.trim()
      : "";
  return name;
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

  return {
    instructorDisplayName: displayName,
    todayClients,
    recentActivity,
    weekPlan: {
      followUpCount,
      unanalyzedCount,
      homeworkPendingCount,
    },
    quickLinks: INSTRUCTOR_QUICK_LINKS,
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
