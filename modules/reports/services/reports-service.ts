import { plannedOverview } from "@/modules/_shared/async-state";

export const reportsService = {
  getOverview() {
    return plannedOverview(
      "reports",
      "Reports",
      "PDF / 分析レポートの生成・配布履歴。",
      ["レポートテンプレート","一括出力","配信ログ"],
    );
  },
};
