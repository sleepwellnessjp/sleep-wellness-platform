/**
 * 認定講師ダッシュボード V1.0 — 表示用データ契約。
 * 現状はダミー。Supabase 接続時は getInstructorDashboard 内を差し替える。
 */

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
  { id: "analysis", label: "睡眠分析", href: "/analysis/new" },
  { id: "journey", label: "Sleep Journey", href: "/programs" },
  { id: "reports", label: "レポート一覧", href: "/reports" },
  { id: "academy", label: "Academy", href: "/academy" },
  { id: "settings", label: "設定", href: "/settings" },
];

/** 開発・デモ用ダミー。本番は Supabase クエリ結果に置換する。 */
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

/**
 * 講師ダッシュボード取得。
 * TODO(Supabase): auth.uid() に紐づく clients / analyses / appointments /
 * homeworks を集約して InstructorDashboardData を返す。
 */
export async function getInstructorDashboard(): Promise<InstructorDashboardData> {
  return DUMMY_INSTRUCTOR_DASHBOARD;
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
