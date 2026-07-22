/**
 * クライアント管理一覧 — 表示用データ契約。
 * 現状はダミー。Supabase 接続時は getClientManagementList 内を差し替える。
 *
 * 想定テーブル:
 * - clients / client_profiles（氏名・年齢・性別・avatar）
 * - analyses（sleep_score・analyzed_at）
 * - appointments / programs（担当日・次回フォロー・Journey進捗）
 */

export type ClientGender = "female" | "male" | "other" | "unspecified";

export type ClientManagementItem = {
  id: string;
  name: string;
  age: number | null;
  gender: ClientGender;
  /** ダミー画像 URL。null のときはイニシャルアバター */
  avatarUrl: string | null;
  sleepScore: number | null;
  /** ISO date YYYY-MM-DD */
  lastAnalysisDate: string | null;
  /** ISO date YYYY-MM-DD */
  nextFollowUpDate: string | null;
  /** 担当日（次回セッション等）ISO date YYYY-MM-DD */
  assignedDay: string | null;
  /** Sleep Journey 進捗 0–100 */
  journeyProgress: number;
};

export type ClientManagementListResult = {
  clients: ClientManagementItem[];
  totalCount: number;
};

export const GENDER_LABELS: Record<ClientGender, string> = {
  female: "女性",
  male: "男性",
  other: "その他",
  unspecified: "未設定",
};

/** 1ページあたり件数（ダミーページネーション用） */
export const CLIENT_MANAGEMENT_PAGE_SIZE = 6;

/** 開発・デモ用ダミー。本番は Supabase クエリ結果に置換する。 */
export const DUMMY_CLIENT_MANAGEMENT_LIST: ClientManagementItem[] = [
  {
    id: "client-demo-1",
    name: "佐藤 美咲",
    age: 42,
    gender: "female",
    avatarUrl: null,
    sleepScore: 72,
    lastAnalysisDate: "2026-07-18",
    nextFollowUpDate: "2026-07-25",
    assignedDay: "2026-07-25",
    journeyProgress: 68,
  },
  {
    id: "client-demo-2",
    name: "鈴木 健太",
    age: 38,
    gender: "male",
    avatarUrl: null,
    sleepScore: 61,
    lastAnalysisDate: "2026-07-15",
    nextFollowUpDate: "2026-07-24",
    assignedDay: "2026-07-24",
    journeyProgress: 42,
  },
  {
    id: "client-demo-3",
    name: "田中 あかり",
    age: 35,
    gender: "female",
    avatarUrl: null,
    sleepScore: 78,
    lastAnalysisDate: "2026-07-20",
    nextFollowUpDate: "2026-07-28",
    assignedDay: "2026-07-28",
    journeyProgress: 85,
  },
  {
    id: "client-demo-4",
    name: "伊藤 翔",
    age: 29,
    gender: "male",
    avatarUrl: null,
    sleepScore: null,
    lastAnalysisDate: null,
    nextFollowUpDate: "2026-07-26",
    assignedDay: "2026-07-26",
    journeyProgress: 12,
  },
  {
    id: "client-demo-5",
    name: "高橋 恵",
    age: 51,
    gender: "female",
    avatarUrl: null,
    sleepScore: 55,
    lastAnalysisDate: "2026-07-10",
    nextFollowUpDate: "2026-07-30",
    assignedDay: "2026-07-23",
    journeyProgress: 34,
  },
  {
    id: "client-demo-6",
    name: "渡辺 涼",
    age: 44,
    gender: "male",
    avatarUrl: null,
    sleepScore: 69,
    lastAnalysisDate: "2026-07-19",
    nextFollowUpDate: "2026-08-02",
    assignedDay: "2026-07-23",
    journeyProgress: 57,
  },
  {
    id: "client-demo-7",
    name: "中村 結衣",
    age: 33,
    gender: "female",
    avatarUrl: null,
    sleepScore: 81,
    lastAnalysisDate: "2026-07-21",
    nextFollowUpDate: "2026-08-05",
    assignedDay: "2026-07-29",
    journeyProgress: 91,
  },
  {
    id: "client-demo-8",
    name: "小林 大輔",
    age: 47,
    gender: "male",
    avatarUrl: null,
    sleepScore: 64,
    lastAnalysisDate: "2026-07-12",
    nextFollowUpDate: "2026-07-27",
    assignedDay: "2026-07-27",
    journeyProgress: 48,
  },
];

/**
 * クライアント管理一覧取得。
 * TODO(Supabase): auth.uid() に紐づく clients を client_profiles /
 * analyses / appointments / programs と結合して返す。
 */
export async function getClientManagementList(): Promise<ClientManagementListResult> {
  const clients = DUMMY_CLIENT_MANAGEMENT_LIST;
  return {
    clients,
    totalCount: clients.length,
  };
}

export function formatManagementDate(isoDate: string | null): string {
  if (!isoDate) return "未設定";
  const d = new Date(`${isoDate}T12:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1);
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`;
}

export type ClientManagementFilters = {
  nameQuery: string;
  sleepScoreQuery: string;
  assignedDayQuery: string;
};

export function filterClientManagementItems(
  clients: ClientManagementItem[],
  filters: ClientManagementFilters,
): ClientManagementItem[] {
  const nameQ = filters.nameQuery.trim().toLowerCase();
  const scoreQ = filters.sleepScoreQuery.trim();
  const dayQ = filters.assignedDayQuery.trim();

  return clients.filter((client) => {
    if (nameQ && !client.name.toLowerCase().includes(nameQ)) {
      return false;
    }

    if (scoreQ) {
      if (client.sleepScore == null) return false;
      const scoreStr = String(client.sleepScore);
      if (!scoreStr.includes(scoreQ)) return false;
    }

    if (dayQ) {
      if (!client.assignedDay) return false;
      if (!client.assignedDay.includes(dayQ)) return false;
    }

    return true;
  });
}
