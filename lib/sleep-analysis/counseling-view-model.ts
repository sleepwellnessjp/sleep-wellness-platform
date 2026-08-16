/**
 * カウンセリング画面用の表示モデル。
 * Score / Insight / Priority / Report Builder は変更せず、出力を整形する。
 */

import type { SleepAnalysisData } from "@/lib/sleep-analysis/sleep-analysis-model";
import { getPriorityCounselingCopy } from "@/lib/sleep-analysis/sleep-wellness-counseling-copy";
import type { SleepWellnessInsight } from "@/lib/sleep-analysis/sleep-wellness-insight";
import type { SleepWellnessPriorityItemKey } from "@/lib/sleep-analysis/sleep-wellness-priority-config";
import { SLEEP_WELLNESS_PRIORITY_LABELS } from "@/lib/sleep-analysis/sleep-wellness-priority-config";
import type { SleepWellnessPriorityPlan } from "@/lib/sleep-analysis/sleep-wellness-priority";
import type { SleepWellnessReport } from "@/lib/sleep-analysis/sleep-wellness-report";
import type { SleepWellnessScore } from "@/lib/sleep-analysis/sleep-wellness-score";
import {
  scoreDeepSleep,
  scoreHrvMs,
  scoreRecoveryMinutes,
  scoreRem,
  scoreRespiratoryRate,
  scoreRestingHeartRateBpm,
  scoreSleepDurationMinutes,
  scoreSleepEfficiencyPercent,
  scoreStressMinutes,
  scoreTemperatureDeviation,
} from "@/lib/sleep-analysis/sleep-wellness-factor-scores";
import {
  resolveMelatoninYogaPhase,
  type MelatoninYogaPhaseResult,
} from "@/lib/sleep-analysis/melatonin-yoga-phase";
import {
  buildFollowUpItems,
  buildHomeworkItems,
  buildSessionProgress,
  buildTodayTheme,
} from "@/lib/sleep-analysis/session-guide";

export type PriorityLevel = "高" | "中" | "低";

export type CounselingTodaySummary = {
  currentState: string;
  goodPoints: string[];
  cautionPoints: string[];
  weeklyTheme: string;
  narrative: string;
};

export type CounselingPriorityCard = {
  rank: 1 | 2 | 3;
  rankLabel: string;
  key: SleepWellnessPriorityItemKey;
  label: string;
  level: PriorityLevel;
  levelStars: string;
  reason: string;
  relatedValue: string;
  shortPolicy: string;
};

export type CounselingActionItem = {
  id: string;
  name: string;
  purpose: string;
  timing: string;
  guide: string;
  targetLabel: string;
  kind: "habit" | "melatonin_yoga";
  melatoninPhase?: MelatoninYogaPhaseResult;
};

export type CounselingMetricCard = {
  key: string;
  label: string;
  displayValue: string;
  evaluation: string | null;
  note: string;
  available: boolean;
};

export type CounselingViewModel = {
  todaySummary: CounselingTodaySummary;
  priorityCards: CounselingPriorityCard[];
  actionPlan: CounselingActionItem[];
  keyMetrics: CounselingMetricCard[];
  nextCheckpoints: string[];
  melatoninPhase: MelatoninYogaPhaseResult | null;
  todayTheme: {
    label: string;
    sentence: string;
  };
  progressSteps: Array<{ id: string; label: string; active: boolean }>;
  homework: Array<{ id: string; label: string }>;
  followUp: string[];
};

function levelFromScore(score: number | null): PriorityLevel {
  if (score == null) return "中";
  if (score < 50) return "高";
  if (score < 70) return "中";
  return "低";
}

function starsFromLevel(level: PriorityLevel): string {
  if (level === "高") return "★★★";
  if (level === "中") return "★★☆";
  return "★☆☆";
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h <= 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function evalLabel(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 85) return "良好";
  if (score >= 70) return "おおむね良好";
  if (score >= 55) return "改善余地あり";
  return "優先して整えたい";
}

function factorOf(score: SleepWellnessScore, key: string) {
  return score.factors.find((f) => f.key === key) ?? null;
}

function buildTodaySummary(
  report: SleepWellnessReport,
  score: SleepWellnessScore,
  insight: SleepWellnessInsight,
  priority: SleepWellnessPriorityPlan,
): CounselingTodaySummary {
  const total = score.total;
  const strong = score.factors
    .filter((f) => f.available && f.score != null && f.score >= 75)
    .map((f) => f.label);
  const weak = score.factors
    .filter((f) => f.available && f.score != null && f.score < 60)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .map((f) => f.label);

  let currentState: string;
  if (total == null) {
    currentState =
      "今回は評価に使える指標が限られるため、総合的な状態は参考値としてご覧ください。";
  } else if (total >= 80) {
    currentState = "現在の睡眠状態は概ね安定しています。";
  } else if (total >= 65) {
    currentState =
      "現在の睡眠状態は大きな崩れはない一方で、いくつかの指標に改善余地があります。";
  } else if (total >= 50) {
    currentState =
      "現在の睡眠状態には改善余地があり、優先順位をつけて整える段階です。";
  } else {
    currentState =
      "現在の睡眠状態は負荷が高めに見えます。回復を優先しながら、無理のない範囲で整えましょう。";
  }

  const goodPoints =
    strong.length > 0
      ? strong.slice(0, 3).map((l) => `${l}は比較的保たれています。`)
      : insight.causes.length === 0
        ? ["強い複合悪化パターンは検出されていません。"]
        : ["総合点だけで判断せず、強みとなる指標を継続して観察します。"];

  const cautionPoints =
    weak.length > 0
      ? weak
          .slice(0, 3)
          .map((l) => `${l}に改善余地が見られます。`)
      : priority.items.length > 0
        ? priority.items
            .slice(0, 2)
            .map((i) => `${i.label}を中心に整える余地があります。`)
        : ["大きな注意点は目立たないため、リズムの維持を中心に観察します。"];

  const top = priority.items[0];
  const weeklyTheme = top
    ? `今週の最優先テーマは「${top.label}」を整えることです。`
    : "今週の最優先テーマは、睡眠リズムの維持と計測の継続です。";

  const second = priority.items[1];
  const narrativeParts = [currentState];
  if (weak.length >= 2) {
    narrativeParts.push(
      `一方で、${weak.slice(0, 2).join("と")}に改善余地があります。`,
    );
  } else if (second) {
    narrativeParts.push(
      `あわせて${second.label}にも目を向けておくと良いでしょう。`,
    );
  }
  if (strong.length > 0 && top) {
    narrativeParts.push(
      `${strong[0]}は保たれている傾向があるため、やみくもに睡眠時間だけを増やすより、「${top.label}」に効く生活習慣を優先しましょう。`,
    );
  } else {
    narrativeParts.push(weeklyTheme);
  }

  return {
    currentState,
    goodPoints,
    cautionPoints,
    weeklyTheme,
    narrative: narrativeParts.join("\n"),
  };
}

function relatedValueText(
  item: CounselingPriorityCard["key"],
  data: SleepAnalysisData,
  score: SleepWellnessScore,
): string {
  if (item === "sleepLatency") {
    if (data.sleepLatencyMinutes == null) return "入眠潜時：未取得";
    return `入眠潜時：${Math.round(data.sleepLatencyMinutes)}分`;
  }
  if (item === "sleepEfficiency" && data.sleepEfficiency != null) {
    return `睡眠効率：${Math.round(data.sleepEfficiency * 10) / 10}%`;
  }
  if (item === "sleepDuration" && data.totalSleepMinutes != null) {
    return `合計睡眠：${formatMinutes(data.totalSleepMinutes)}`;
  }
  if (item === "deepSleep" && data.deepMinutes != null) {
    return `深睡眠：${formatMinutes(data.deepMinutes)}`;
  }
  if (item === "rem" && data.remMinutes != null) {
    return `REM：${formatMinutes(data.remMinutes)}`;
  }
  if (item === "hrv" && data.hrv != null) {
    return `HRV：${Math.round(data.hrv)} ms`;
  }
  if (item === "restingHeartRate") {
    const v = data.restingHeartRate ?? data.lowestHeartRate;
    if (v == null) return "安静時心拍：未取得";
    return `安静時心拍：${Math.round(v)} bpm`;
  }
  if (item === "stress" && data.stressMinutes != null) {
    return `ストレス時間：${Math.round(data.stressMinutes)}分`;
  }
  if (item === "recovery" && data.recoveryMinutes != null) {
    return `回復時間：${Math.round(data.recoveryMinutes)}分`;
  }
  if (item === "respiratoryRate" && data.respiratoryRate != null) {
    return `呼吸数：${Math.round(data.respiratoryRate * 10) / 10} 回/分`;
  }
  if (item === "temperatureDeviation" && data.temperatureDeviation != null) {
    return `体温変化：${Math.round(data.temperatureDeviation * 100) / 100} ℃`;
  }
  const f = factorOf(score, item);
  if (f?.inputValue != null) {
    return `${f.label}：${f.inputValue}${f.unit ? ` ${f.unit}` : ""}`;
  }
  return `${SLEEP_WELLNESS_PRIORITY_LABELS[item]}：未取得`;
}

type ActionTemplate = {
  id: string;
  name: string;
  purpose: string;
  timing: string;
  guide: string;
  keys: SleepWellnessPriorityItemKey[];
};

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: "wake_fixed",
    name: "起床時刻の固定",
    purpose: "体内時計を安定させ、睡眠のリズムを整える",
    timing: "毎朝（休日含む）",
    guide: "起床差は1時間以内を目安にする",
    keys: ["sleepDuration", "sleepEfficiency", "sleepLatency", "rem"],
  },
  {
    id: "sleep_pressure",
    name: "眠気が高まってから就床する",
    purpose: "ベッド滞在に対する実睡眠を増やし、睡眠効率を高める",
    timing: "就床直前",
    guide: "眠れないまま長く横にならない",
    keys: ["sleepEfficiency", "sleepLatency"],
  },
  {
    id: "bath_90",
    name: "就寝90分前の入浴",
    purpose: "深部体温の低下を促し、入眠を整える",
    timing: "就寝の60〜90分前",
    guide: "38〜40℃で10〜15分",
    keys: ["sleepLatency", "deepSleep", "temperatureDeviation", "sleepEfficiency"],
  },
  {
    id: "breath_36",
    name: "3:6呼吸",
    purpose: "就寝前の緊張を落ち着かせる",
    timing: "就寝前",
    guide: "3秒吸って6秒吐く呼吸を3〜5分",
    keys: ["stress", "hrv", "sleepLatency", "restingHeartRate"],
  },
  {
    id: "screen_off",
    name: "就寝前のスクリーン終了",
    purpose: "覚醒刺激を減らし、入眠と連続性を助ける",
    timing: "就寝60〜90分前",
    guide: "強い光・仕事・ニュースを切り上げる",
    keys: ["sleepLatency", "sleepEfficiency", "stress", "rem"],
  },
  {
    id: "cool_room",
    name: "寝室をやや涼しく保つ",
    purpose: "熱放散を助け、深い休息の条件を整える",
    timing: "就寝〜起床",
    guide: "厚着・掛け過ぎを避け、風通しを確保する",
    keys: ["temperatureDeviation", "deepSleep", "recovery"],
  },
  {
    id: "alcohol_earlier",
    name: "就寝前の飲酒を見直す",
    purpose: "REMや深い睡眠が削られにくい条件をつくる",
    timing: "夕方〜就寝前",
    guide: "飲む場合は終了時刻を早め、量を控える",
    keys: ["rem", "deepSleep", "sleepEfficiency"],
  },
  {
    id: "load_recovery_day",
    name: "高負荷日の翌日を回復日にする",
    purpose: "ストレスと回復のバランスを戻す",
    timing: "高負荷の翌日",
    guide: "運動・残業の強度を意図的に一段下げる",
    keys: ["stress", "recovery", "hrv", "restingHeartRate"],
  },
  {
    id: "nasal_env",
    name: "鼻呼吸しやすい環境づくり",
    purpose: "呼吸の負担を減らし、睡眠の連続性を助ける",
    timing: "就寝前〜夜間",
    guide: "湿度を整え、必要なら横向きを試す",
    keys: ["respiratoryRate", "sleepEfficiency"],
  },
  {
    id: "earlier_bed",
    name: "就寝を15〜30分前倒しする",
    purpose: "睡眠機会を増やし、後半に多い睡眠段階を確保する",
    timing: "平日の就寝",
    guide: "起床時刻は変えず、寝る枠だけ前へ出す",
    keys: ["sleepDuration", "rem", "deepSleep"],
  },
];

function buildActionPlan(
  priority: SleepWellnessPriorityPlan,
  melatonin: MelatoninYogaPhaseResult,
): CounselingActionItem[] {
  const topKeys = priority.items.map((i) => i.key);
  const selected: CounselingActionItem[] = [];
  const used = new Set<string>();

  for (const key of topKeys) {
    for (const t of ACTION_TEMPLATES) {
      if (used.has(t.id)) continue;
      if (!t.keys.includes(key)) continue;
      used.add(t.id);
      selected.push({
        id: t.id,
        name: t.name,
        purpose: t.purpose,
        timing: t.timing,
        guide: t.guide,
        targetLabel: SLEEP_WELLNESS_PRIORITY_LABELS[key],
        kind: "habit",
      });
      if (selected.length >= 4) break;
    }
    if (selected.length >= 4) break;
  }

  // メラトニンヨガ（Priority がある場合に1件）
  if (topKeys.length > 0) {
    const phaseGuide =
      melatonin.phase === 1
        ? "ゆったりした動きと長い呼気を中心に5〜10分"
        : melatonin.phase === 2
          ? "呼吸と緩やかなストレッチで自律神経を整える5〜10分"
          : "静止に近いポーズと鎮静呼吸で深い休息へ5〜10分";
    selected.push({
      id: `melatonin_phase_${melatonin.phase}`,
      name: `メラトニンヨガ ${melatonin.label}`,
      purpose: melatonin.focus,
      timing: "就寝前",
      guide: phaseGuide,
      targetLabel: priority.items[0]?.label ?? "回復",
      kind: "melatonin_yoga",
      melatoninPhase: melatonin,
    });
  }

  return selected.slice(0, 5);
}

function buildKeyMetrics(data: SleepAnalysisData): CounselingMetricCard[] {
  const total = data.totalSleepMinutes;
  const rem = data.remMinutes;
  const deep = data.deepMinutes;
  const rhr = data.restingHeartRate ?? data.lowestHeartRate;
  const rhrLabel =
    data.restingHeartRate != null
      ? "安静時心拍"
      : data.lowestHeartRate != null
        ? "最低心拍"
        : "安静時心拍 / 最低心拍";

  const cards: Array<{
    key: string;
    label: string;
    value: number | null;
    display: string | null;
    score: number | null;
    note: string;
  }> = [
    {
      key: "sleepScore",
      label: "Sleep Score",
      value: data.sleepScore,
      display: data.sleepScore != null ? String(Math.round(data.sleepScore)) : null,
      score: data.sleepScore,
      note: "デバイスが算出した睡眠スコアです。",
    },
    {
      key: "readiness",
      label: "Readiness",
      value: data.readinessScore,
      display:
        data.readinessScore != null
          ? String(Math.round(data.readinessScore))
          : null,
      score: data.readinessScore,
      note: "日中の準備状態の目安です。",
    },
    {
      key: "recovery",
      label: "Recovery",
      value: data.recoveryMinutes,
      display:
        data.recoveryMinutes != null
          ? formatMinutes(data.recoveryMinutes)
          : null,
      score:
        data.recoveryMinutes != null
          ? scoreRecoveryMinutes(data.recoveryMinutes)
          : null,
      note: "回復に充てられた時間の目安です。",
    },
    {
      key: "totalSleep",
      label: "合計睡眠時間",
      value: total,
      display: total != null ? formatMinutes(total) : null,
      score: total != null ? scoreSleepDurationMinutes(total) : null,
      note: "成人の目安はおおよそ7〜9時間です。",
    },
    {
      key: "efficiency",
      label: "睡眠効率",
      value: data.sleepEfficiency,
      display:
        data.sleepEfficiency != null
          ? `${Math.round(data.sleepEfficiency * 10) / 10}%`
          : null,
      score:
        data.sleepEfficiency != null
          ? scoreSleepEfficiencyPercent(data.sleepEfficiency)
          : null,
      note: "ベッド滞在に対する実睡眠の割合です。",
    },
    {
      key: "deep",
      label: "深睡眠",
      value: deep,
      display: deep != null ? formatMinutes(deep) : null,
      score: deep != null ? scoreDeepSleep(deep, total) : null,
      note: "身体的な回復と関わりやすい睡眠段階です。",
    },
    {
      key: "rem",
      label: "REM睡眠",
      value: rem,
      display: rem != null ? formatMinutes(rem) : null,
      score: rem != null ? scoreRem(rem, total) : null,
      note: "記憶や情動の整理と関連が指摘されます。",
    },
    {
      key: "hrv",
      label: "HRV",
      value: data.hrv,
      display: data.hrv != null ? `${Math.round(data.hrv)} ms` : null,
      score: data.hrv != null ? scoreHrvMs(data.hrv) : null,
      note: "回復寄りの傾向を見る目安です。単日より変化を見ます。",
    },
    {
      key: "rhr",
      label: rhrLabel,
      value: rhr,
      display: rhr != null ? `${Math.round(rhr)} bpm` : null,
      score: rhr != null ? scoreRestingHeartRateBpm(rhr) : null,
      note: "個人差が大きいため、本人の平常との比較が大切です。",
    },
    {
      key: "resp",
      label: "呼吸数",
      value: data.respiratoryRate,
      display:
        data.respiratoryRate != null
          ? `${Math.round(data.respiratoryRate * 10) / 10} 回/分`
          : null,
      score:
        data.respiratoryRate != null
          ? scoreRespiratoryRate(data.respiratoryRate)
          : null,
      note: "睡眠中の呼吸の安定感を見る参考指標です。",
    },
    {
      key: "temp",
      label: "体温変化",
      value: data.temperatureDeviation,
      display:
        data.temperatureDeviation != null
          ? `${data.temperatureDeviation > 0 ? "+" : ""}${Math.round(data.temperatureDeviation * 100) / 100} ℃`
          : null,
      score:
        data.temperatureDeviation != null
          ? scoreTemperatureDeviation(data.temperatureDeviation)
          : null,
      note: "入眠や深い休息の条件と関わりやすい指標です。",
    },
    {
      key: "spo2",
      label: "血中酸素",
      value: data.spo2,
      display: data.spo2 != null ? `${Math.round(data.spo2 * 10) / 10}%` : null,
      score:
        data.spo2 == null
          ? null
          : data.spo2 >= 96
            ? 90
            : data.spo2 >= 94
              ? 70
              : 45,
      note: "低い傾向が続く場合は、必要に応じて医療機関へ相談してください。",
    },
    {
      key: "stress_recovery",
      label: "ストレス / 回復時間",
      value:
        data.stressMinutes != null || data.recoveryMinutes != null ? 1 : null,
      display:
        data.stressMinutes == null && data.recoveryMinutes == null
          ? null
          : [
              data.stressMinutes != null
                ? `ストレス ${Math.round(data.stressMinutes)}分`
                : null,
              data.recoveryMinutes != null
                ? `回復 ${Math.round(data.recoveryMinutes)}分`
                : null,
            ]
              .filter(Boolean)
              .join(" / "),
      score: (() => {
        const s =
          data.stressMinutes != null
            ? scoreStressMinutes(data.stressMinutes)
            : null;
        const r =
          data.recoveryMinutes != null
            ? scoreRecoveryMinutes(data.recoveryMinutes)
            : null;
        if (s != null && r != null) return Math.round((s + r) / 2);
        return s ?? r;
      })(),
      note: "負荷と回復のバランスを見る目安です。",
    },
  ];

  return cards.map((c) => ({
    key: c.key,
    label: c.label,
    displayValue: c.display ?? "未取得",
    evaluation: c.display != null ? evalLabel(c.score) : null,
    note: c.note,
    available: c.display != null,
  }));
}

function buildNextCheckpoints(
  priority: SleepWellnessPriorityPlan,
  insight: SleepWellnessInsight,
): string[] {
  const items: string[] = [];
  for (const p of priority.items) {
    items.push(`${p.label}が前回より整ったか`);
  }
  if (insight.matchedRuleIds.includes("autonomic_stress_load")) {
    items.push("HRVが本人の基準へ戻ってきたか");
  }
  if (priority.items.some((p) => p.key === "deepSleep")) {
    items.push("深睡眠の割合に改善の傾向があるか");
  }
  if (priority.items.some((p) => p.key === "sleepEfficiency")) {
    items.push("睡眠効率が上がったか");
  }
  items.push("日中の眠気や疲労感が軽減したか");
  items.push("就寝・起床リズムを一定に保てているか");

  return [...new Set(items)].slice(0, 5);
}

/**
 * Report + SleepAnalysisData からカウンセリング表示モデルを構築する。
 */
export function buildCounselingViewModel(input: {
  data: SleepAnalysisData;
  report: SleepWellnessReport;
}): CounselingViewModel {
  const { data, report } = input;
  const { score, insight, priority } = report.sources;

  const melatoninPhase = resolveMelatoninYogaPhase({
    data,
    score,
    insight,
    priority,
  });

  const priorityCards: CounselingPriorityCard[] = priority.items.map((item) => {
    const copy = getPriorityCounselingCopy(item.key);
    const level = levelFromScore(item.metricScore);
    return {
      rank: item.rank,
      rankLabel: item.rankLabel,
      key: item.key,
      label: item.label,
      level,
      levelStars: starsFromLevel(level),
      reason: item.reason,
      relatedValue: relatedValueText(item.key, data, score),
      shortPolicy: copy.concreteActions[0]
        ? `まずは「${copy.concreteActions[0]}」を優先します。`
        : copy.counselingTip,
    };
  });

  const actionPlan = buildActionPlan(priority, melatoninPhase);

  return {
    todaySummary: buildTodaySummary(report, score, insight, priority),
    priorityCards,
    actionPlan,
    keyMetrics: buildKeyMetrics(data),
    nextCheckpoints: buildNextCheckpoints(priority, insight),
    melatoninPhase,
    todayTheme: buildTodayTheme(priority),
    progressSteps: buildSessionProgress(),
    homework: buildHomeworkItems(actionPlan, priority),
    followUp: buildFollowUpItems(priority, insight),
  };
}
