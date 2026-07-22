import { plannedOverview } from "@/modules/_shared/async-state";

export const researchService = {
  getOverview() {
    return plannedOverview(
      "research",
      "Research",
      "研究・エビデンスライブラリ。Community knowledge から独立予定。",
      ["ナレッジ記事モデル","タグ / カテゴリ","引用・参考文献"],
    );
  },
};
