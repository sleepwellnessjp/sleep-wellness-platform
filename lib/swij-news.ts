export type SwijNewsItem = {
  date: string;
  category: string;
  title: string;
  description: string;
  href: string;
};

export const SWIJ_NEWS_ITEMS: SwijNewsItem[] = [
  {
    date: "2026.10.01",
    category: "EVENT",
    title: "ヨガフェスタ横浜2026登壇",
    description:
      "睡眠科学とヨガを融合した「メラトニンヨガ™」をテーマに登壇予定。実践とデータから、眠りを整えるヒントをお届けします。",
    href: "/#contact",
  },
  {
    date: "2026.08.01",
    category: "ACADEMY",
    title: "メラトニンヨガ™養成講座",
    description:
      "睡眠ウェルネスを実践・指導できるインストラクター育成プログラムを開講。科学と身体知を学べる講座です。",
    href: "/#services",
  },
  {
    date: "2026.06.15",
    category: "PROJECT",
    title: "SOXAI共同プロジェクト",
    description:
      "ウェアラブルデータを活用した睡眠ウェルネス分析・実証プロジェクトを推進。個人と組織の眠りを可視化します。",
    href: "/#analysis",
  },
  {
    date: "2026.04.01",
    category: "PLATFORM",
    title: "Sleep Wellness Platform公開予定",
    description:
      "睡眠分析・学習・実践を統合するSleep Wellness Platformを公開予定。エコシステム全体をつなぐ基盤です。",
    href: "/vision",
  },
];
