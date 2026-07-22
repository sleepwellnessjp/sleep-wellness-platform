import type { StoredAnalysis } from "@/lib/client-store";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import {
  improvementPriorityLabel,
  type ImprovementPriorityLabel,
  type ImprovementPriorityStars,
} from "@/lib/improvement-priority";

export type SuggestionMetricKey =
  | "sleepScore"
  | "sleepDuration"
  | "deepSleep"
  | "sleepEfficiency"
  | "awakenings"
  | "hrv"
  | "spo2";

export type ImprovementPriority = ImprovementPriorityLabel;

export type ImprovementSuggestion = {
  id: SuggestionMetricKey;
  metricKey: SuggestionMetricKey;
  title: string;
  currentValue: string;
  reason: string;
  recommendedMethods: string[];
  priority: ImprovementPriority;
  stars: ImprovementPriorityStars;
  priorityRank: number;
  expectedImprovement: string;
  menuLabels: string[];
};

const MAX_SUGGESTIONS = 5;

function parseNumber(value: string): number | null {
  const match = value.trim().match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parsePercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("%")) return parseNumber(trimmed);
  const n = parseNumber(trimmed);
  if (n == null) return null;
  return n <= 1 ? n * 100 : n;
}

function parseDurationMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hourMinJa = trimmed.match(/(\d+)\s*時間\s*(\d+)\s*分/);
  if (hourMinJa) {
    return Number(hourMinJa[1]) * 60 + Number(hourMinJa[2]);
  }

  const hourOnlyJa = trimmed.match(/(\d+)\s*時間/);
  if (hourOnlyJa && !trimmed.includes("分")) {
    return Number(hourOnlyJa[1]) * 60;
  }

  const minOnlyJa = trimmed.match(/(\d+)\s*分/);
  if (minOnlyJa) {
    return Number(minOnlyJa[1]);
  }

  return null;
}

function displayOrDash(value: string | number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "—";
}

function fromStars(stars: ImprovementPriorityStars): {
  priority: ImprovementPriority;
  priorityRank: number;
  stars: ImprovementPriorityStars;
} {
  const priority = improvementPriorityLabel(stars);
  return {
    stars,
    priority,
    // 高い星ほど先（rank 小）
    priorityRank: 5 - stars,
  };
}

function buildSleepScoreSuggestion(
  score: number | null,
): ImprovementSuggestion | null {
  if (score == null) return null;
  if (score >= 80) return null;

  const { priority, priorityRank, stars } = fromStars(
    score < 60 ? 5 : score < 70 ? 4 : 3,
  );

  return {
    id: "sleepScore",
    metricKey: "sleepScore",
    title: "睡眠スコア",
    currentValue: String(score),
    reason:
      score < 60
        ? "総合睡眠スコアが低く、睡眠の質・量・回復のバランスに改善余地があります。"
        : score < 70
          ? "睡眠スコアがやや低めで、生活リズムと就寝前の切り替えを整えると改善が期待できます。"
          : "睡眠スコアは許容範囲ですが、さらに安定させる余地があります。",
    recommendedMethods: [
      "就寝90分前からスマホ・強い照明を控える",
      "メラトニンヨガ™で入眠前の副交感神経を高める",
      "就寝前の入浴で体温降下を促す",
    ],
    priority,
    stars,
    priorityRank,
    expectedImprovement: "2〜4週間でスコア5〜10点の改善が期待できます。",
    menuLabels: ["メラトニンヨガ™", "入浴", "スマホ制限", "呼吸法"],
  };
}

function buildSleepDurationSuggestion(
  metrics: AnalysisMetrics,
): ImprovementSuggestion | null {
  const minutes = parseDurationMinutes(metrics.sleepDuration);
  if (minutes == null) return null;
  if (minutes >= 420) return null;

  const { priority, priorityRank, stars } = fromStars(
    minutes < 300 ? 5 : minutes < 360 ? 4 : 3,
  );

  return {
    id: "sleepDuration",
    metricKey: "sleepDuration",
    title: "睡眠時間",
    currentValue: displayOrDash(metrics.sleepDuration),
    reason:
      minutes < 360
        ? "睡眠時間が推奨量（7時間前後）を下回っており、回復不足の可能性があります。"
        : "睡眠時間はやや不足気味です。就寝時刻の前倒しで改善余地があります。",
    recommendedMethods: [
      "就寝時刻を15〜30分早める",
      "朝日を浴びて体内時計を整える",
      "午後以降のカフェイン摂取を控える",
    ],
    priority,
    stars,
    priorityRank,
    expectedImprovement: "睡眠時間30〜60分の増加とスコアの安定が期待できます。",
    menuLabels: ["朝日を浴びる", "カフェイン制限", "スマホ制限"],
  };
}

function buildDeepSleepSuggestion(
  metrics: AnalysisMetrics,
): ImprovementSuggestion | null {
  const rate = parsePercent(metrics.deepSleepRate);
  const minutes = parseDurationMinutes(metrics.deepSleep);
  const deepValue =
    metrics.deepSleepRate?.trim() || metrics.deepSleep?.trim() || "";

  if (rate == null && minutes == null) return null;

  const lowRate = rate != null && rate < 15;
  const lowMinutes = minutes != null && minutes < 60;
  if (!lowRate && !lowMinutes) return null;

  const { priority, priorityRank, stars } = fromStars(
    (rate != null && rate < 12) || (minutes != null && minutes < 45) ? 4 : 3,
  );

  return {
    id: "deepSleep",
    metricKey: "deepSleep",
    title: "深睡眠",
    currentValue: displayOrDash(deepValue),
    reason:
      "深い睡眠がやや少なく、身体の回復・疲労回復が十分でない可能性があります。",
    recommendedMethods: [
      "就寝前のメラトニンヨガ™で深睡眠を促す",
      "就寝90分前の入浴で深部体温を下げる",
      "就寝前の刺激（スマホ・強い光）を減らす",
    ],
    priority,
    stars,
    priorityRank,
    expectedImprovement: "深睡眠率2〜5%ポイントの改善が期待できます。",
    menuLabels: ["メラトニンヨガ™", "入浴", "スマホ制限"],
  };
}

function buildSleepEfficiencySuggestion(
  metrics: AnalysisMetrics,
): ImprovementSuggestion | null {
  const efficiency = parsePercent(metrics.sleepEfficiency);
  if (efficiency == null) return null;
  if (efficiency >= 88) return null;

  const { priority, priorityRank, stars } = fromStars(
    efficiency < 75 ? 4 : 3,
  );

  return {
    id: "sleepEfficiency",
    metricKey: "sleepEfficiency",
    title: "睡眠効率",
    currentValue: displayOrDash(metrics.sleepEfficiency),
    reason:
      efficiency < 75
        ? "ベッドにいる時間に対して実際の睡眠が少なく、中途覚醒や入眠の遅れが影響している可能性があります。"
        : "睡眠効率に改善余地があり、就寝前の習慣を整えると効率が上がりやすくなります。",
    recommendedMethods: [
      "就寝前のスマホ使用を控え、リラックス時間を設ける",
      "就寝前の呼吸法で覚醒を抑える",
      "就寝・起床時刻を一定に保つ",
    ],
    priority,
    stars,
    priorityRank,
    expectedImprovement: "睡眠効率3〜8%ポイントの改善が期待できます。",
    menuLabels: ["スマホ制限", "呼吸法", "入浴"],
  };
}

function buildAwakeningsSuggestion(
  metrics: AnalysisMetrics,
): ImprovementSuggestion | null {
  const minutes = parseDurationMinutes(metrics.awakenings);
  const rate = parsePercent(metrics.awakeningRate);
  const display =
    metrics.awakenings?.trim() || metrics.awakeningRate?.trim() || "";

  if (minutes == null && rate == null) return null;

  const highMinutes = minutes != null && minutes > 45;
  const highRate = rate != null && rate > 12;
  const moderateMinutes = minutes != null && minutes > 30;
  const moderateRate = rate != null && rate > 8;

  if (!highMinutes && !highRate && !moderateMinutes && !moderateRate) {
    return null;
  }

  const { priority, priorityRank, stars } = fromStars(
    highMinutes || highRate ? 4 : 3,
  );

  return {
    id: "awakenings",
    metricKey: "awakenings",
    title: "中途覚醒",
    currentValue: displayOrDash(display),
    reason:
      "中途覚醒が多く、睡眠の連続性が途切れている可能性があります。",
    recommendedMethods: [
      "就寝前の呼吸法で副交感神経を高める",
      "アルコール摂取の量・タイミングを見直す",
      "寝室環境（温度・湿度・光）を整える",
    ],
    priority,
    stars,
    priorityRank,
    expectedImprovement: "覚醒時間20〜40%の減少が期待できます。",
    menuLabels: ["呼吸法", "アルコール制限", "メラトニンヨガ™"],
  };
}

function buildHrvSuggestion(
  metrics: AnalysisMetrics,
): ImprovementSuggestion | null {
  const hrv = parseNumber(metrics.hrv);
  if (hrv == null) return null;
  if (hrv >= 50) return null;

  const { priority, priorityRank, stars } = fromStars(
    hrv < 30 ? 4 : 3,
  );

  return {
    id: "hrv",
    metricKey: "hrv",
    title: "HRV",
    currentValue: displayOrDash(metrics.hrv),
    reason:
      "HRV（心拍変動）が低めで、自律神経の回復力・ストレス耐性に改善余地がある可能性があります。",
    recommendedMethods: [
      "メラトニンヨガ™や瞑想で副交感神経を活性化",
      "日中の軽いストレッチで血流を促す",
      "規則正しい睡眠リズムを維持する",
    ],
    priority,
    stars,
    priorityRank,
    expectedImprovement: "HRV 5〜15%の改善と回復力の向上が期待できます。",
    menuLabels: ["メラトニンヨガ™", "瞑想", "ストレッチ"],
  };
}

function buildSpo2Suggestion(
  metrics: AnalysisMetrics,
): ImprovementSuggestion | null {
  const spo2 = parsePercent(metrics.spo2);
  if (spo2 == null) return null;
  if (spo2 >= 96) return null;

  const { priority, priorityRank, stars } = fromStars(
    spo2 < 92 ? 5 : spo2 < 94 ? 4 : 3,
  );

  return {
    id: "spo2",
    metricKey: "spo2",
    title: "SpO₂",
    currentValue: displayOrDash(metrics.spo2),
    reason:
      spo2 < 94
        ? "睡眠中の酸素飽和度がやや低く、呼吸の通りやすさや睡眠姿勢の見直しが有効な可能性があります。"
        : "SpO₂は許容範囲ですが、さらに安定させる余地があります。",
    recommendedMethods: [
      "就寝前の呼吸法で呼吸を深く整える",
      "アルコール摂取を控え、就寝前の呼吸を安定させる",
      "横向き寝や枕の高さを調整する",
    ],
    priority,
    stars,
    priorityRank,
    expectedImprovement: "SpO₂ 1〜2%ポイントの改善が期待できます。",
    menuLabels: ["呼吸法", "アルコール制限", "ストレッチ"],
  };
}

/** 最新分析データからルールベースの改善提案を生成（重要度順・最大5件） */
export function buildImprovementSuggestions(
  analysis: StoredAnalysis | null,
): ImprovementSuggestion[] {
  if (!analysis) return [];

  const metrics = analysis.metrics;
  const sleepScore =
    typeof analysis.sleepScore === "number" && Number.isFinite(analysis.sleepScore)
      ? analysis.sleepScore
      : typeof analysis.wellnessScore === "number" &&
          Number.isFinite(analysis.wellnessScore)
        ? analysis.wellnessScore
        : metrics.sleepScore;

  const suggestions = [
    buildSleepScoreSuggestion(
      typeof sleepScore === "number" ? sleepScore : null,
    ),
    buildSleepDurationSuggestion(metrics),
    buildDeepSleepSuggestion(metrics),
    buildSleepEfficiencySuggestion(metrics),
    buildAwakeningsSuggestion(metrics),
    buildHrvSuggestion(metrics),
    buildSpo2Suggestion(metrics),
  ].filter((item): item is ImprovementSuggestion => item !== null);

  return suggestions
    .sort((a, b) => a.priorityRank - b.priorityRank || b.stars - a.stars)
    .slice(0, MAX_SUGGESTIONS);
}

/** 提案のメニュー項目を改善メニューに反映 */
export function applySuggestionToMenuItems<
  T extends { id: string; label: string; checked: boolean; isCustom?: boolean },
>(
  menuItems: T[],
  suggestion: ImprovementSuggestion,
  createCustom: (label: string) => T,
): T[] {
  const next = menuItems.map((item) => ({ ...item }));

  for (const label of suggestion.menuLabels) {
    const existing = next.find((item) => item.label === label);
    if (existing) {
      existing.checked = true;
    } else {
      next.push({ ...createCustom(label), checked: true });
    }
  }

  return next;
}

export function isSuggestionAppliedToMenu<
  T extends { label: string; checked: boolean },
>(menuItems: T[], suggestion: ImprovementSuggestion): boolean {
  return suggestion.menuLabels.every((label) =>
    menuItems.some((item) => item.label === label && item.checked),
  );
}
