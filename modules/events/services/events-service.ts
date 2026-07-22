import { plannedOverview } from "@/modules/_shared/async-state";

export const eventsService = {
  getOverview() {
    return plannedOverview(
      "events",
      "Events",
      "セミナー・イベントの公開・申込・出席管理。",
      ["イベント一覧","申込フロー","リマインド通知"],
    );
  },
};
