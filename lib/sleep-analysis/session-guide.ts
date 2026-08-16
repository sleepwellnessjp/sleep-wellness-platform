/**
 * 90分カウンセリング進行用の会話ガイド・宿題・テーマ。
 * Score / Insight / Priority エンジン本体は変更しない。
 */

import type { SleepWellnessPriorityItemKey } from "@/lib/sleep-analysis/sleep-wellness-priority-config";
import { SLEEP_WELLNESS_PRIORITY_LABELS } from "@/lib/sleep-analysis/sleep-wellness-priority-config";
import type { SleepWellnessPriorityPlan } from "@/lib/sleep-analysis/sleep-wellness-priority";
import type { SleepWellnessInsight } from "@/lib/sleep-analysis/sleep-wellness-insight";
import type { CounselingActionItem } from "@/lib/sleep-analysis/counseling-view-model";

export type ConversationGuideBlock = {
  title: string;
  checks: string[];
};

export type SessionProgressStep = {
  id: string;
  label: string;
  active: boolean;
};

export type TodayTheme = {
  label: string;
  sentence: string;
};

export type HomeworkItem = {
  id: string;
  label: string;
};

export function buildTodayTheme(
  priority: SleepWellnessPriorityPlan,
): TodayTheme {
  const top = priority.items[0];
  if (!top) {
    return {
      label: "睡眠リズムの維持",
      sentence: "今日は「睡眠リズムの維持」を中心に進めます。",
    };
  }
  return {
    label: top.label,
    sentence: `今日は「${top.label}」を中心に進めます。`,
  };
}

export function buildSessionProgress(): SessionProgressStep[] {
  return [
    { id: "step1", label: "Step 1", active: true },
    { id: "step2", label: "Step 2", active: false },
    { id: "step3", label: "Step 3", active: false },
  ];
}

export function buildHomeworkItems(
  actions: CounselingActionItem[],
  priority: SleepWellnessPriorityPlan,
): HomeworkItem[] {
  const fromActions = actions
    .filter((a) => a.kind !== "melatonin_yoga")
    .map((a) => ({ id: a.id, label: a.name }));

  const extras: HomeworkItem[] = [];
  const keys = new Set(priority.items.map((i) => i.key));
  if (keys.has("sleepLatency") || keys.has("deepSleep")) {
    extras.push({ id: "hw_bath", label: "就寝90分前入浴" });
  }
  if (keys.has("sleepDuration") || keys.has("sleepEfficiency")) {
    extras.push({ id: "hw_sun", label: "朝日を浴びる" });
  }
  if (keys.has("stress") || keys.has("hrv") || keys.has("sleepLatency")) {
    extras.push({ id: "hw_breath", label: "3:6呼吸 5分" });
  }

  const merged: HomeworkItem[] = [];
  const seen = new Set<string>();
  for (const item of [...fromActions, ...extras]) {
    const key = item.label;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= 3) break;
  }
  if (merged.length === 0) {
    return [
      { id: "hw_wake", label: "起床時刻を固定する" },
      { id: "hw_sun", label: "朝日を浴びる" },
      { id: "hw_breath", label: "3:6呼吸 5分" },
    ];
  }
  return merged;
}

export function buildFollowUpItems(
  priority: SleepWellnessPriorityPlan,
  insight: SleepWellnessInsight,
): string[] {
  const items: string[] = [];
  for (const p of priority.items) {
    if (p.key === "deepSleep") items.push("深睡眠は増えたか");
    else if (p.key === "sleepEfficiency") items.push("途中覚醒は減ったか");
    else if (p.key === "hrv") items.push("HRVは改善したか");
    else if (p.key === "sleepDuration") items.push("睡眠時間は確保できたか");
    else if (p.key === "sleepLatency") items.push("入眠はスムーズになったか");
    else if (p.key === "stress") items.push("日中の緊張は和らいだか");
    else if (p.key === "recovery") items.push("回復感は増えたか");
    else items.push(`${p.label}は整ってきたか`);
  }
  if (insight.matchedRuleIds.includes("autonomic_stress_load")) {
    items.push("HRVは改善したか");
  }
  items.push("疲労感は減ったか");
  return [...new Set(items)].slice(0, 4);
}

const GUIDE_BY_SECTION: Record<string, ConversationGuideBlock> = {
  score: {
    title: "確認してください",
    checks: [
      "今朝の目覚めはどうでしたか？",
      "数字を見て、気になる項目はありますか？",
      "前回と比べて体感の変化はありますか？",
    ],
  },
  summary: {
    title: "確認してください",
    checks: [
      "朝の目覚めはどうでしたか？",
      "夜中に目が覚めましたか？",
      "最近疲れは残っていますか？",
    ],
  },
  priority: {
    title: "確認してください",
    checks: [
      "この順番は実感と合いますか？",
      "いちばん気になっているのはどれですか？",
      "今すぐ変えられそうなことはありますか？",
    ],
  },
  actions: {
    title: "確認してください",
    checks: [
      "今夜から試せそうなものはどれですか？",
      "難しそうなものはありますか？",
      "生活リズムの中でどこに入れられそうですか？",
    ],
  },
  metrics: {
    title: "確認してください",
    checks: [
      "この数値で気になるものはありますか？",
      "体感と数字は一致していますか？",
      "未取得の項目は次回どう測りましょうか？",
    ],
  },
};

const GUIDE_BY_PRIORITY: Partial<
  Record<SleepWellnessPriorityItemKey, string[]>
> = {
  sleepEfficiency: [
    "夜中に目が覚めましたか？",
    "ベッドに入ってすぐ眠れましたか？",
    "起きている時間が長いと感じますか？",
  ],
  deepSleep: [
    "朝のだるさはありますか？",
    "就寝前の飲酒はありましたか？",
    "寝室の温度はどうでしたか？",
  ],
  sleepDuration: [
    "最近の就寝・起床時刻は安定していますか？",
    "眠いのに早く起きていませんか？",
    "休日の寝だめはありますか？",
  ],
  sleepLatency: [
    "布団に入って何分くらいで眠れそうですか？",
    "頭が冴えて眠れないことはありますか？",
    "就寝前のスマホはいつまで見ていますか？",
  ],
  hrv: [
    "日中の緊張は強いですか？",
    "トレーニングや残業は続きましたか？",
    "回復できた感覚はありますか？",
  ],
  stress: [
    "最近いちばん負荷が大きいことは何ですか？",
    "就寝前に落ち着ける時間はありますか？",
    "疲れは体と心のどちらに出やすいですか？",
  ],
};

export function guideForSection(
  section: keyof typeof GUIDE_BY_SECTION,
): ConversationGuideBlock {
  return GUIDE_BY_SECTION[section];
}

export function guideChecksForPriority(
  key: SleepWellnessPriorityItemKey,
): string[] {
  return (
    GUIDE_BY_PRIORITY[key] ?? [
      `${SLEEP_WELLNESS_PRIORITY_LABELS[key]}について、実感はどうですか？`,
      "改善できそうだと感じますか？",
      "妨げになっていることはありますか？",
    ]
  );
}
