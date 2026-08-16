/**
 * カウンセリング画面用コピー（UI専用）。
 * Score / Insight / Priority / Melatonin Phase の結果だけを参照する。
 */

import type { CounselingPriorityCard } from "@/lib/sleep-analysis/counseling-view-model";
import type { CounselingTodaySummary } from "@/lib/sleep-analysis/counseling-view-model";
import type { MelatoninYogaPhaseResult } from "@/lib/sleep-analysis/melatonin-yoga-phase";
import type { SleepWellnessScore } from "@/lib/sleep-analysis/sleep-wellness-score";
import type { TodayTheme } from "@/lib/sleep-analysis/session-guide";

export type YogaPracticeCard = {
  id: "day" | "night";
  brandTitle: string;
  label: string;
  phase: string;
  duration: string;
  purpose: string;
  breathing: string;
  expectedEffect: string;
};

export type CounselingHomeworkItem = {
  id: string;
  label: string;
};

function factorScore(score: SleepWellnessScore, key: string): number | null {
  const f = score.factors.find((x) => x.key === key);
  return f?.available && f.score != null ? f.score : null;
}

/** Today's Focus（短い一言） */
export function buildTodaysFocus(
  theme: TodayTheme,
  priorities: CounselingPriorityCard[],
): string {
  const top = priorities[0];
  if (!top) return "睡眠リズムを安定させ、回復しやすい一日をつくります。";
  if (top.key === "sleepEfficiency") {
    return "ベッド滞在に対する実睡眠を増やし、途中覚醒を減らすことに集中します。";
  }
  if (top.key === "deepSleep") {
    return "深い休息の条件を整え、身体の回復を優先します。";
  }
  if (top.key === "sleepDuration") {
    return "睡眠機会を確保し、夜の後半まで眠れる時間をつくります。";
  }
  if (top.key === "hrv" || top.key === "recovery" || top.key === "stress") {
    return "負荷を抑え、回復の感覚を戻す一日にします。";
  }
  if (top.key === "sleepLatency") {
    return "入眠までの時間を短くし、スムーズに眠れる流れをつくります。";
  }
  return `「${theme.label}」を今日の中心テーマとして進めます。`;
}

/** 認定講師がそのまま読める説明文 */
export function buildConversationScript(input: {
  theme: TodayTheme;
  priorities: CounselingPriorityCard[];
  summary: CounselingTodaySummary;
  score: SleepWellnessScore;
  melatonin: MelatoninYogaPhaseResult | null;
}): string {
  const { theme, priorities, summary, score, melatonin } = input;
  const top = priorities[0];
  const duration = factorScore(score, "sleepDuration");
  const deep = factorScore(score, "deepSleep");
  const efficiency = factorScore(score, "sleepEfficiency");

  const lines: string[] = [];

  if (top) {
    lines.push(`本日は${top.label}の改善を最優先にします。`);
  } else {
    lines.push(`本日は「${theme.label}」を中心に進めます。`);
  }

  if (duration != null && duration >= 75 && deep != null && deep < 60) {
    lines.push("睡眠時間は十分ですが、深睡眠に改善余地があります。");
  } else if (efficiency != null && efficiency < 60) {
    lines.push(
      "睡眠効率に改善余地があるため、眠気が高まってから就床する流れを確認します。",
    );
  } else if (summary.cautionPoints[0]) {
    lines.push(summary.cautionPoints[0]);
  } else if (summary.goodPoints[0]) {
    lines.push(summary.goodPoints[0]);
  }

  if (melatonin) {
    const mins =
      melatonin.phase === 1 ? "10〜15" : melatonin.phase === 2 ? "10〜15" : "15";
    lines.push(
      `夜はメラトニンヨガ™（${melatonin.label}）を${mins}分実施してください。`,
    );
  } else {
    lines.push("夜はメラトニンヨガ™を15分実施してください。");
  }

  return lines.join("\n");
}

/** Day / Night のヨガカード */
export function buildYogaPracticeCards(
  melatonin: MelatoninYogaPhaseResult | null,
  priorities: CounselingPriorityCard[],
): YogaPracticeCard[] {
  const keys = new Set(priorities.map((p) => p.key));
  const phase = melatonin?.phase ?? 1;
  const phaseLabel = melatonin?.label ?? "Phase 1";

  const dayPhase =
    keys.has("stress") || keys.has("hrv") || keys.has("recovery")
      ? "Phase 2"
      : keys.has("sleepLatency") || keys.has("sleepEfficiency")
        ? "Phase 1"
        : phaseLabel;

  const nightPhase = phaseLabel;

  return [
    {
      id: "day",
      brandTitle: "Day",
      label: "間のヨガ™",
      phase: dayPhase,
      duration: "5〜10分",
      purpose:
        dayPhase === "Phase 2"
          ? "日中の緊張を下げ、回復しやすい状態へ戻す"
          : "午後の覚醒水準を整え、夜の入眠準備につなげる",
      breathing:
        dayPhase === "Phase 2"
          ? "4秒吸って6秒吐く呼吸を3分"
          : "3秒吸って6秒吐く呼吸を3分",
      expectedEffect: "日中のだるさ・緊張の蓄積を抑えやすくなります",
    },
    {
      id: "night",
      brandTitle: "Night",
      label: "メラトニンヨガ™",
      phase: nightPhase,
      duration: phase === 3 ? "15分" : "10〜15分",
      purpose:
        melatonin?.focus ??
        (phase === 1
          ? "緊張をほどき、入眠準備を整える"
          : phase === 2
            ? "自律神経と回復のバランスを整える"
            : "深い休息へ向かう鎮静をつくる"),
      breathing:
        phase === 1
          ? "3秒吸って6秒吐く呼吸を中心に"
          : phase === 2
            ? "4秒吸って8秒吐く長い呼気を中心に"
            : "ゆっくり長い呼気で鎮静する呼吸",
      expectedEffect:
        phase === 1
          ? "入眠がスムーズになりやすくなります"
          : phase === 2
            ? "回復感と落ち着きが戻りやすくなります"
            : "深い休息の感覚が高まりやすくなります",
    },
  ];
}

/** 次回までの宿題（固定セット＋優先に応じた並び） */
export function buildCounselingHomework(
  priorities: CounselingPriorityCard[],
): CounselingHomeworkItem[] {
  const keys = new Set(priorities.map((p) => p.key));
  const items: CounselingHomeworkItem[] = [
    { id: "bath", label: "就寝90分前入浴" },
    { id: "phone", label: "夜間スマホ制限" },
    { id: "yoga", label: "メラトニンヨガ実施" },
    { id: "light", label: "朝の光" },
  ];

  // 優先に合わせて先頭を寄せる（中身は指定の4件を維持）
  if (keys.has("sleepLatency") || keys.has("deepSleep")) {
    return [items[0], items[2], items[1], items[3]];
  }
  if (keys.has("sleepDuration") || keys.has("sleepEfficiency")) {
    return [items[3], items[1], items[0], items[2]];
  }
  return items;
}
