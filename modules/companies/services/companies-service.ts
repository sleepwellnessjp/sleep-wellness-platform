import { plannedOverview } from "@/modules/_shared/async-state";

export const companiesService = {
  getOverview() {
    return plannedOverview(
      "companies",
      "Companies",
      "企業テナント・部署・メンバーシップ管理。",
      ["org モデル","部署マスタ","企業 Home KPI 接続"],
    );
  },
};
