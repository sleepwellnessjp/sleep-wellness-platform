import { plannedOverview } from "@/modules/_shared/async-state";

export const billingService = {
  getOverview() {
    return plannedOverview(
      "billing",
      "Billing",
      "クレジット消費・請求・プラン管理。",
      ["プラン定義","請求書","クレジット残高 UI"],
    );
  },
};
