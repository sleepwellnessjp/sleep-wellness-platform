/**
 * Sleep Wellness Prescription™ の時間帯カード（UI専用）。
 * 解析エンジンは変更せず、Priority / Action / Melatonin Phase から組み立てる。
 */

import type { CounselingActionItem } from "@/lib/sleep-analysis/counseling-view-model";
import type { MelatoninYogaPhaseResult } from "@/lib/sleep-analysis/melatonin-yoga-phase";
import type { HomeworkItem } from "@/lib/sleep-analysis/session-guide";
import type { SleepWellnessPriorityItemKey } from "@/lib/sleep-analysis/sleep-wellness-priority-config";

export type PrescriptionSlotId =
  | "morning"
  | "day"
  | "evening"
  | "night"
  | "homework";

export type PrescriptionSlot = {
  id: PrescriptionSlotId;
  title: string;
  subtitle: string;
  items: string[];
  note?: string;
};

function pickActionNames(
  actions: CounselingActionItem[],
  ids: string[],
): string[] {
  return actions
    .filter((a) => ids.includes(a.id) || ids.some((id) => a.id.includes(id)))
    .map((a) => a.name);
}

export function buildPrescriptionSlots(input: {
  actions: CounselingActionItem[];
  homework: HomeworkItem[];
  priorityKeys: SleepWellnessPriorityItemKey[];
  melatonin: MelatoninYogaPhaseResult | null;
}): PrescriptionSlot[] {
  const { actions, homework, priorityKeys, melatonin } = input;
  const keys = new Set(priorityKeys);

  const morning: string[] = [];
  if (keys.has("sleepDuration") || keys.has("sleepEfficiency") || keys.has("rem")) {
    morning.push("起床時刻を固定する");
    morning.push("朝日を5〜10分浴びる");
  } else {
    morning.push("決まった時刻に起きる");
  }
  morning.push(
    ...pickActionNames(actions, ["wake_fixed", "earlier_bed"]).filter(
      (n) => !morning.includes(n),
    ),
  );

  const day: string[] = ["間のヨガ™（短時間）"];
  if (keys.has("stress") || keys.has("hrv") || keys.has("recovery")) {
    day.push("昼に3〜5分の呼吸リセット");
    day.push("午後のカフェインを控える");
  } else {
    day.push("昼休みに軽いストレッチ");
  }
  if (keys.has("recovery") || keys.has("stress")) {
    day.push("高負荷なら強度を一段下げる");
  }

  const evening: string[] = [];
  if (
    keys.has("sleepLatency") ||
    keys.has("deepSleep") ||
    keys.has("temperatureDeviation")
  ) {
    evening.push("就寝90分前の入浴（38〜40℃ / 10〜15分）");
  }
  evening.push("就寝60分前にスクリーンを終える");
  if (keys.has("stress") || keys.has("sleepLatency") || keys.has("hrv")) {
    evening.push("3:6呼吸を3〜5分");
  }
  evening.push(
    ...pickActionNames(actions, ["bath_90", "screen_off", "breath_36"]).filter(
      (n) => !evening.includes(n),
    ),
  );

  const nightItems: string[] = [];
  if (melatonin) {
    nightItems.push(`メラトニンヨガ™ ${melatonin.label}`);
    nightItems.push(melatonin.focus);
    nightItems.push(
      melatonin.phase === 1
        ? "入眠前にゆったり呼吸 5〜10分"
        : melatonin.phase === 2
          ? "自律神経を整える緩やかな動き 5〜10分"
          : "深い休息へ向かう鎮静ポーズ 5〜10分",
    );
  } else {
    nightItems.push("メラトニンヨガ™（就寝前）");
    nightItems.push("部屋を暗くして横になる");
  }

  const hw = homework.map((h) => h.label).slice(0, 3);

  return [
    {
      id: "morning",
      title: "Morning",
      subtitle: "朝",
      items: [...new Set(morning)].slice(0, 3),
      note: "体内時計をリセットする時間帯",
    },
    {
      id: "day",
      title: "Day",
      subtitle: "間のヨガ™",
      items: [...new Set(day)].slice(0, 3),
      note: "日中の緊張を溜めすぎない",
    },
    {
      id: "evening",
      title: "Evening",
      subtitle: "夜の準備",
      items: [...new Set(evening)].slice(0, 3),
      note: "入眠に向けて刺激を下げる",
    },
    {
      id: "night",
      title: "Night",
      subtitle: "メラトニンヨガ™",
      items: [...new Set(nightItems)].slice(0, 3),
      note: melatonin?.reason,
    },
    {
      id: "homework",
      title: "Homework",
      subtitle: "次回まで",
      items: hw.length > 0 ? hw : ["起床固定", "朝日を浴びる", "3:6呼吸 5分"],
      note: "週の中心に据える3つ",
    },
  ];
}
