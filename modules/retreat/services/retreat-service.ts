import { plannedOverview } from "@/modules/_shared/async-state";

export const retreatService = {
  getOverview() {
    return plannedOverview(
      "retreat",
      "Retreat",
      "リトリートプログラムの企画・参加者・振り返り管理。",
      ["プログラム CRUD","参加者名簿","事後レポート"],
    );
  },
};
