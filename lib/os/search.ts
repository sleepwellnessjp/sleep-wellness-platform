export type OsSearchCategory =
  | "client"
  | "instructor"
  | "material"
  | "video"
  | "case"
  | "event";

export type OsSearchResult = {
  id: string;
  category: OsSearchCategory;
  title: string;
  subtitle: string;
  href: string;
};

export const OS_SEARCH_CATEGORY_LABELS: Record<OsSearchCategory, string> = {
  client: "クライアント",
  instructor: "講師",
  material: "資料",
  video: "動画",
  case: "ケース",
  event: "イベント",
};

const DEMO_INDEX: OsSearchResult[] = [
  {
    id: "client-tanaka",
    category: "client",
    title: "田中 美咲",
    subtitle: "担当クライアント · Score 78",
    href: "/clients",
  },
  {
    id: "client-suzuki",
    category: "client",
    title: "鈴木 健太",
    subtitle: "担当クライアント · Score 65",
    href: "/clients",
  },
  {
    id: "instructor-yamada",
    category: "instructor",
    title: "山田 講師",
    subtitle: "メラトニンヨガ™インストラクター",
    href: "/admin/instructors",
  },
  {
    id: "material-protocol",
    category: "material",
    title: "Sleep Wellness Protocol v2",
    subtitle: "資料 · Academy ナレッジ",
    href: "/academy?tab=learn",
  },
  {
    id: "material-guidance",
    category: "material",
    title: "初回カウンセリングガイド",
    subtitle: "資料 · 指導メモテンプレート",
    href: "/community?tab=knowledge",
  },
  {
    id: "video-yoga-intro",
    category: "video",
    title: "メラトニンヨガ™ 入門",
    subtitle: "動画 · Academy レッスン",
    href: "/academy?tab=learn",
  },
  {
    id: "video-breath",
    category: "video",
    title: "就寝前呼吸法デモ",
    subtitle: "動画 · 実践ガイド",
    href: "/academy?tab=learn",
  },
  {
    id: "case-shift-worker",
    category: "case",
    title: "シフト勤務者の改善ケース",
    subtitle: "ケース · Community",
    href: "/community?tab=cases",
  },
  {
    id: "case-anxiety",
    category: "case",
    title: "入眠困難と不安の介入例",
    subtitle: "ケース · Community",
    href: "/community?tab=cases",
  },
  {
    id: "event-study",
    category: "event",
    title: "ケーススタディ勉強会",
    subtitle: "イベント · 今週末",
    href: "/community?tab=events",
  },
  {
    id: "event-renewal",
    category: "event",
    title: "認定更新ワークショップ",
    subtitle: "イベント · Academy",
    href: "/community?tab=events",
  },
];

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim();
}

export function searchOsIndex(
  query: string,
  options?: { limit?: number; categories?: OsSearchCategory[] },
): OsSearchResult[] {
  const q = normalize(query);
  const limit = options?.limit ?? 20;
  const categories = options?.categories;

  if (!q) {
    return DEMO_INDEX.filter(
      (item) => !categories || categories.includes(item.category),
    ).slice(0, limit);
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  return DEMO_INDEX.filter((item) => {
    if (categories && !categories.includes(item.category)) return false;
    const haystack = normalize(
      `${item.title}\u0000${item.subtitle}\u0000${item.category}`,
    );
    return tokens.every((token) => haystack.includes(token));
  }).slice(0, limit);
}
