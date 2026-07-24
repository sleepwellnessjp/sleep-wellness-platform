/**
 * AI Counseling Assistant — 認定講師向けカウンセリング準備提案。
 *
 * 現時点はルールベース。将来 LLM に差し替える場合は
 * `AiCounselingAssistantGenerator` を実装して `generateAiCounselingAssistant` に渡す。
 */

import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import { getClientById } from "@/lib/repositories/client-repository";
import {
  computeAssignedHomeworkAchievement,
  computeHomeworkStreakDays,
  listClientHomeworks,
} from "@/lib/repositories/client-homeworks-repository";
import { homeworkRateOf } from "@/lib/client-daily-content";
import {
  parseDurationMinutes,
  parseHHMM,
  parseLeadingNumber,
} from "@/lib/soxai-graphs";
import { generateRuleBasedSleepWellnessJourney } from "@/lib/sleep-wellness-journey";
import {
  generateRuleBasedInstructorInsight,
  type InstructorSignal,
} from "@/lib/instructor-insight";

export type AiCounselingAssistantSource = "rules" | "gpt";

export type AiCounselingRiskKind =
  | "sleep_score_decline"
  | "short_sleep"
  | "stress_rise"
  | "insufficient_data";

export type AiCounselingRecommendation = {
  /** 1始まりの優先度 */
  priority: number;
  title: string;
  detail: string;
  signal?: InstructorSignal;
};

export type AiCounselingHomeworkCategory =
  | "breathing"
  | "melatonin_yoga"
  | "lifestyle"
  | "bath"
  | "light";

export type AiCounselingHomeworkSuggestion = {
  id: string;
  category: AiCounselingHomeworkCategory;
  label: string;
  reason: string;
};

export type AiCounselingRiskAlert = {
  id: string;
  kind: AiCounselingRiskKind;
  title: string;
  detail: string;
};

export type AiCounselingSummary = {
  /** 現在の睡眠状態の要約 */
  currentState: string;
  /** 前回から改善した点 */
  improved: string[];
  /** 悪化した点 */
  worsened: string[];
  /** 継続している課題 */
  ongoing: string[];
};

/** UI / API 共通契約 */
export type AiCounselingAssistant = {
  summary: AiCounselingSummary;
  /** 次回カウンセリング確認項目（3〜5件・優先順位付き） */
  recommendations: AiCounselingRecommendation[];
  suggestedHomework: AiCounselingHomeworkSuggestion[];
  riskAlerts: AiCounselingRiskAlert[];
  source: AiCounselingAssistantSource;
};

export type AiCounselingAssistantContext = {
  /** 新しい順の分析履歴 */
  analyses: StoredAnalysis[];
  latest: StoredAnalysis | null;
  previous: StoredAnalysis | null;
  streakDays: number;
  homeworkRate: number | null;
};

export type AiCounselingAssistantGenerator = (
  ctx: AiCounselingAssistantContext,
) => AiCounselingAssistant | Promise<AiCounselingAssistant>;

type MetricSnap = {
  wellnessScore: number | null;
  sleepScore: number | null;
  sleepEfficiency: number | null;
  sleepDurationMin: number | null;
  deepSleepMin: number | null;
  sleepDebtMin: number | null;
  stress: number | null;
  hrv: number | null;
  bedtimeMin: number | null;
};

const SHORT_SLEEP_MIN = 6 * 60;
const LOW_EFFICIENCY = 85;
const LOW_DEEP_SLEEP_MIN = 60;
const DEBT_THRESHOLD_MIN = 45;
const HIGH_STRESS = 50;
const LOW_HRV = 30;
const SCORE_DECLINE_POINTS = 3;
const STRESS_RISE_POINTS = 5;
const MIN_ANALYSES_FOR_TREND = 2;

const CATEGORY_LABEL: Record<AiCounselingHomeworkCategory, string> = {
  breathing: "呼吸法",
  melatonin_yoga: "メラトニンヨガ™",
  lifestyle: "生活習慣",
  bath: "入浴",
  light: "光環境",
};

type HomeworkCandidate = {
  id: string;
  category: AiCounselingHomeworkCategory;
  label: string;
  signals: InstructorSignal[];
  reasonBySignal: Partial<Record<InstructorSignal, string>>;
  fallbackReason: string;
};

const HOMEWORK_LIBRARY: HomeworkCandidate[] = [
  {
    id: "breath-36",
    category: "breathing",
    label: "3:6呼吸（就寝前5分）",
    signals: ["high_stress", "low_hrv", "low_efficiency"],
    reasonBySignal: {
      high_stress: "ストレス指標が高めのため、副交感神経を促す呼吸を提案",
      low_hrv: "HRV低下の兆しに対し、短い呼吸法で回復を支援",
      low_efficiency: "睡眠効率の改善に向け、入眠前の緊張緩和を支援",
    },
    fallbackReason: "入眠前の緊張緩和に有効な基本ワーク",
  },
  {
    id: "yoga-p2",
    category: "melatonin_yoga",
    label: "メラトニンヨガ™ Phase2",
    signals: ["low_deep_sleep", "high_stress", "low_efficiency", "maintain"],
    reasonBySignal: {
      low_deep_sleep: "深睡眠不足の傾向に合わせたリカバリー系シークエンス",
      high_stress: "日中の負荷が高いときの夜のリセットに適する",
      low_efficiency: "断片睡眠の改善に向けた就寝前ルーティンとして",
    },
    fallbackReason: "睡眠の質を整える認定プログラムの宿題候補",
  },
  {
    id: "bath-90",
    category: "bath",
    label: "就寝90分前の入浴",
    signals: ["low_deep_sleep", "low_efficiency", "sleep_debt"],
    reasonBySignal: {
      low_deep_sleep: "深睡眠を支える体温リズム調整として",
      low_efficiency: "入眠のしやすさ向上を狙った環境づくり",
      sleep_debt: "睡眠負債があるときの回復を後押し",
    },
    fallbackReason: "体温リズムを整える定番の生活介入",
  },
  {
    id: "morning-light",
    category: "light",
    label: "起床後の朝日10分",
    signals: ["bedtime_variance", "short_sleep", "sleep_debt"],
    reasonBySignal: {
      bedtime_variance: "就寝時刻のばらつき是正に体内時計のリセットが有効",
      short_sleep: "睡眠時間不足時も、起床リズムの安定が次夜に効く",
      sleep_debt: "負債回収と合わせて光刺激でリズムを整える",
    },
    fallbackReason: "体内時計の安定に向けた光環境の基本習慣",
  },
  {
    id: "phone-off",
    category: "lifestyle",
    label: "就寝1時間前スマホオフ",
    signals: ["low_efficiency", "bedtime_variance", "short_sleep"],
    reasonBySignal: {
      low_efficiency: "夜間覚醒・入眠遅延の要因になりやすい光刺激を減らす",
      bedtime_variance: "就寝時刻の安定化に向けた行動境界",
      short_sleep: "就寝時刻の前倒し余白を作る",
    },
    fallbackReason: "光環境・生活習慣の両面から入眠を支える",
  },
  {
    id: "caffeine-pm",
    category: "lifestyle",
    label: "午後のカフェインオフ",
    signals: ["low_deep_sleep", "sleep_debt", "low_efficiency"],
    reasonBySignal: {
      low_deep_sleep: "深睡眠を妨げやすい刺激を減らす",
      sleep_debt: "負債があるときの睡眠圧を守る",
      low_efficiency: "断片睡眠の誘因を減らす生活習慣調整",
    },
    fallbackReason: "睡眠の質を守る生活習慣の調整",
  },
  {
    id: "evening-walk",
    category: "lifestyle",
    label: "夕方の軽い散歩",
    signals: ["low_hrv", "high_stress", "homework"],
    reasonBySignal: {
      low_hrv: "自律神経の回復を促す低強度の活動",
      high_stress: "日中の緊張を夜に持ち越さないためのリセット",
      homework: "続けやすい負荷の宿題として適合しやすい",
    },
    fallbackReason: "ストレス・HRVケアと両立しやすい生活習慣宿題",
  },
];

function wellnessScoreOf(analysis: StoredAnalysis | null): number | null {
  if (!analysis) return null;
  if (
    typeof analysis.wellnessScore === "number" &&
    Number.isFinite(analysis.wellnessScore)
  ) {
    return analysis.wellnessScore;
  }
  if (
    typeof analysis.result?.score === "number" &&
    Number.isFinite(analysis.result.score)
  ) {
    return analysis.result.score;
  }
  return null;
}

function sleepScoreOf(analysis: StoredAnalysis | null): number | null {
  if (!analysis) return null;
  if (
    typeof analysis.sleepScore === "number" &&
    Number.isFinite(analysis.sleepScore)
  ) {
    return analysis.sleepScore;
  }
  const raw = analysis.metrics?.sleepScore;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return parseLeadingNumber(String(raw ?? ""));
}

function bedtimeOf(analysis: StoredAnalysis | null): number | null {
  if (!analysis) return null;
  const structured = analysis.structured?.sleepOnsetTime?.trim();
  if (structured) {
    const parsed = parseHHMM(structured);
    if (parsed != null) return parsed;
  }
  return parseHHMM(String(analysis.metrics.bedtime ?? ""));
}

function snapOf(analysis: StoredAnalysis | null): MetricSnap {
  if (!analysis) {
    return {
      wellnessScore: null,
      sleepScore: null,
      sleepEfficiency: null,
      sleepDurationMin: null,
      deepSleepMin: null,
      sleepDebtMin: null,
      stress: null,
      hrv: null,
      bedtimeMin: null,
    };
  }
  return {
    wellnessScore: wellnessScoreOf(analysis),
    sleepScore: sleepScoreOf(analysis),
    sleepEfficiency: parseLeadingNumber(
      String(analysis.metrics.sleepEfficiency ?? ""),
    ),
    sleepDurationMin: parseDurationMinutes(
      String(analysis.metrics.sleepDuration ?? ""),
    ),
    deepSleepMin: parseDurationMinutes(
      String(analysis.metrics.deepSleep ?? ""),
    ),
    sleepDebtMin: parseDurationMinutes(
      String(analysis.metrics.sleepDebt ?? ""),
    ),
    stress: parseLeadingNumber(
      String(
        analysis.structured?.stressAverage?.trim() ||
          analysis.metrics.stress ||
          "",
      ),
    ),
    hrv: parseLeadingNumber(String(analysis.metrics.hrv ?? "")),
    bedtimeMin: bedtimeOf(analysis),
  };
}

function formatMinutesDelta(delta: number): string {
  const abs = Math.abs(Math.round(delta));
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`;
  if (hours > 0) return `${hours}時間`;
  return `${minutes}分`;
}

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(1)}時間`;
}

function buildCurrentState(
  latest: MetricSnap,
  ctx: AiCounselingAssistantContext,
): string {
  if (!ctx.latest) {
    return "分析データがまだありません。初回の睡眠分析後に、カウンセリング確認ポイントを提案できます。";
  }

  const parts: string[] = [];
  if (latest.wellnessScore != null) {
    parts.push(
      `最新の Sleep Wellness Score は ${Math.round(latest.wellnessScore)}`,
    );
  } else if (latest.sleepScore != null) {
    parts.push(`最新の SOXAI 睡眠スコアは ${Math.round(latest.sleepScore)}`);
  }

  if (latest.sleepDurationMin != null) {
    parts.push(`睡眠時間はおおよそ ${formatHours(latest.sleepDurationMin)}`);
  }
  if (latest.sleepEfficiency != null) {
    parts.push(`睡眠効率は ${Math.round(latest.sleepEfficiency)}％`);
  }
  if (latest.stress != null) {
    parts.push(`ストレス指標は ${Math.round(latest.stress)}`);
  }

  const homeworkPart =
    ctx.homeworkRate != null
      ? `宿題達成率は ${Math.round(ctx.homeworkRate)}％`
      : null;
  if (homeworkPart) parts.push(homeworkPart);

  const journey = generateRuleBasedSleepWellnessJourney({
    analyses: ctx.analyses,
    streakDays: ctx.streakDays,
    homeworkRate: ctx.homeworkRate,
  });
  const journeyHint = journey.badges
    .slice(0, 2)
    .map((b) => b.label)
    .join("・");

  const base =
    parts.length > 0
      ? `${parts.join("。")}。`
      : "最新分析の主要指標は一部未計測です。";
  const journeyPart = journeyHint
    ? ` Journey 上は「${journeyHint}」の兆しも確認できます。`
    : "";

  return `${base}${journeyPart}`.trim();
}

type DeltaCandidate = { score: number; text: string };

function buildImproved(
  latest: MetricSnap,
  previous: MetricSnap,
  streakDays: number,
  homeworkRate: number | null,
): string[] {
  const candidates: DeltaCandidate[] = [];

  if (latest.wellnessScore != null && previous.wellnessScore != null) {
    const delta = latest.wellnessScore - previous.wellnessScore;
    if (delta >= 2) {
      candidates.push({
        score: delta * 2,
        text: `Sleep Wellness Score が ${Math.round(delta)} ポイント改善`,
      });
    }
  }
  if (latest.sleepScore != null && previous.sleepScore != null) {
    const delta = latest.sleepScore - previous.sleepScore;
    if (delta >= 2) {
      candidates.push({
        score: delta * 1.8,
        text: `SOXAI 睡眠スコアが ${Math.round(delta)} ポイント改善`,
      });
    }
  }
  if (latest.sleepEfficiency != null && previous.sleepEfficiency != null) {
    const delta = latest.sleepEfficiency - previous.sleepEfficiency;
    if (delta >= 2) {
      candidates.push({
        score: delta * 1.5,
        text: `睡眠効率が ${Math.round(delta)}％改善`,
      });
    }
  }
  if (latest.sleepDurationMin != null && previous.sleepDurationMin != null) {
    const delta = latest.sleepDurationMin - previous.sleepDurationMin;
    if (delta >= 15) {
      candidates.push({
        score: delta / 10,
        text: `睡眠時間が ${formatMinutesDelta(delta)} 増加`,
      });
    }
  }
  if (latest.deepSleepMin != null && previous.deepSleepMin != null) {
    const delta = latest.deepSleepMin - previous.deepSleepMin;
    if (delta >= 10) {
      candidates.push({
        score: delta / 8,
        text: `深睡眠が ${formatMinutesDelta(delta)} 増加`,
      });
    }
  }
  if (latest.stress != null && previous.stress != null) {
    const delta = previous.stress - latest.stress;
    if (delta >= 3) {
      candidates.push({
        score: delta,
        text: `ストレス指標が ${Math.round(delta)} 低下`,
      });
    }
  }
  if (latest.hrv != null && previous.hrv != null) {
    const delta = latest.hrv - previous.hrv;
    if (delta >= 2) {
      candidates.push({ score: delta * 1.2, text: "HRV が上昇" });
    }
  }
  if (streakDays >= 3) {
    candidates.push({
      score: Math.min(streakDays, 7),
      text: `宿題を ${streakDays} 日連続で継続`,
    });
  }
  if (homeworkRate != null && homeworkRate >= 70) {
    candidates.push({
      score: homeworkRate / 20,
      text: `宿題達成率 ${Math.round(homeworkRate)}％を維持`,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return uniqueTexts(candidates.map((c) => c.text), 3, [
    "比較できる改善ポイントはまだ限定的",
  ]);
}

function buildWorsened(
  latest: MetricSnap,
  previous: MetricSnap,
): string[] {
  const candidates: DeltaCandidate[] = [];

  if (latest.wellnessScore != null && previous.wellnessScore != null) {
    const delta = previous.wellnessScore - latest.wellnessScore;
    if (delta >= 2) {
      candidates.push({
        score: delta * 2,
        text: `Sleep Wellness Score が ${Math.round(delta)} ポイント低下`,
      });
    }
  }
  if (latest.sleepScore != null && previous.sleepScore != null) {
    const delta = previous.sleepScore - latest.sleepScore;
    if (delta >= 2) {
      candidates.push({
        score: delta * 1.8,
        text: `SOXAI 睡眠スコアが ${Math.round(delta)} ポイント低下`,
      });
    }
  }
  if (latest.sleepEfficiency != null && previous.sleepEfficiency != null) {
    const delta = previous.sleepEfficiency - latest.sleepEfficiency;
    if (delta >= 2) {
      candidates.push({
        score: delta * 1.5,
        text: `睡眠効率が ${Math.round(delta)}％低下`,
      });
    }
  }
  if (latest.sleepDurationMin != null && previous.sleepDurationMin != null) {
    const delta = previous.sleepDurationMin - latest.sleepDurationMin;
    if (delta >= 15) {
      candidates.push({
        score: delta / 10,
        text: `睡眠時間が ${formatMinutesDelta(delta)} 減少`,
      });
    }
  }
  if (latest.deepSleepMin != null && previous.deepSleepMin != null) {
    const delta = previous.deepSleepMin - latest.deepSleepMin;
    if (delta >= 10) {
      candidates.push({
        score: delta / 8,
        text: `深睡眠が ${formatMinutesDelta(delta)} 減少`,
      });
    }
  }
  if (latest.stress != null && previous.stress != null) {
    const delta = latest.stress - previous.stress;
    if (delta >= 3) {
      candidates.push({
        score: delta,
        text: `ストレス指標が ${Math.round(delta)} 上昇`,
      });
    }
  }
  if (latest.hrv != null && previous.hrv != null) {
    const delta = previous.hrv - latest.hrv;
    if (delta >= 2) {
      candidates.push({ score: delta * 1.2, text: "HRV が低下" });
    }
  }
  if (latest.sleepDebtMin != null && previous.sleepDebtMin != null) {
    const latestAbs = Math.abs(latest.sleepDebtMin);
    const previousAbs = Math.abs(previous.sleepDebtMin);
    const delta = latestAbs - previousAbs;
    if (delta >= 15) {
      candidates.push({
        score: delta / 10,
        text: `睡眠負債が ${formatMinutesDelta(delta)} 増加`,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return uniqueTexts(candidates.map((c) => c.text), 3, [
    "前回比で明確な悪化ポイントは見当たりません",
  ]);
}

function isSignalActive(signal: InstructorSignal, snap: MetricSnap): boolean {
  const debtAbs =
    snap.sleepDebtMin == null ? null : Math.abs(snap.sleepDebtMin);
  switch (signal) {
    case "sleep_debt":
      return debtAbs != null && debtAbs >= DEBT_THRESHOLD_MIN;
    case "short_sleep":
      return (
        snap.sleepDurationMin != null && snap.sleepDurationMin < SHORT_SLEEP_MIN
      );
    case "low_efficiency":
      return (
        snap.sleepEfficiency != null && snap.sleepEfficiency < LOW_EFFICIENCY
      );
    case "low_deep_sleep":
      return (
        snap.deepSleepMin != null && snap.deepSleepMin < LOW_DEEP_SLEEP_MIN
      );
    case "high_stress":
      return snap.stress != null && snap.stress >= HIGH_STRESS;
    case "low_hrv":
      return snap.hrv != null && snap.hrv > 0 && snap.hrv < LOW_HRV;
    case "bedtime_variance":
    case "homework":
    case "maintain":
      return false;
    default:
      return false;
  }
}

function buildOngoing(
  latest: MetricSnap,
  previous: MetricSnap,
  insightSignals: InstructorSignal[],
): string[] {
  const ongoing: string[] = [];
  const signalLabels: Partial<Record<InstructorSignal, string>> = {
    sleep_debt: "睡眠負債が継続",
    short_sleep: "睡眠時間不足が継続",
    low_efficiency: "睡眠効率の低さが継続",
    low_deep_sleep: "深睡眠不足が継続",
    high_stress: "ストレス偏高が継続",
    low_hrv: "HRV 低下が継続",
  };

  for (const signal of insightSignals) {
    if (signal === "maintain" || signal === "homework" || signal === "bedtime_variance") {
      continue;
    }
    if (isSignalActive(signal, latest) && isSignalActive(signal, previous)) {
      const label = signalLabels[signal];
      if (label && !ongoing.includes(label)) ongoing.push(label);
    }
    if (ongoing.length >= 3) break;
  }

  if (ongoing.length === 0) {
    for (const signal of insightSignals) {
      if (signal === "maintain") continue;
      const label = signalLabels[signal];
      if (label && isSignalActive(signal, latest) && !ongoing.includes(label)) {
        ongoing.push(label.replace("が継続", "が課題"));
      }
      if (ongoing.length >= 3) break;
    }
  }

  if (ongoing.length === 0) {
    return ["大きな継続課題は見当たらず、現状維持の確認が中心"];
  }
  return ongoing;
}

function uniqueTexts(
  texts: string[],
  limit: number,
  fallback: string[],
): string[] {
  const unique: string[] = [];
  for (const text of texts) {
    if (unique.includes(text)) continue;
    unique.push(text);
    if (unique.length >= limit) break;
  }
  return unique.length > 0 ? unique : fallback;
}

function buildRecommendations(
  insight: ReturnType<typeof generateRuleBasedInstructorInsight>,
): AiCounselingRecommendation[] {
  const recommendations: AiCounselingRecommendation[] = [];

  for (const challenge of insight.challenges) {
    if (recommendations.length >= 5) break;
    const question =
      insight.counselingQuestions[recommendations.length] ??
      "最近の変化で気になっていることはありますか？";
    recommendations.push({
      priority: recommendations.length + 1,
      title: challenge.label,
      detail: question,
      signal: challenge.signal,
    });
  }

  for (const question of insight.counselingQuestions) {
    if (recommendations.length >= 5) break;
    if (recommendations.some((r) => r.detail === question)) continue;
    recommendations.push({
      priority: recommendations.length + 1,
      title: "カウンセリング確認",
      detail: question,
    });
  }

  while (recommendations.length < 3) {
    const fillers = [
      {
        title: "生活リズムの確認",
        detail: "平日と休日で就寝・起床に差はありますか？",
      },
      {
        title: "宿題の実践状況",
        detail: "前回の宿題で続けにくかった点はありますか？",
      },
      {
        title: "環境要因の確認",
        detail: "寝室の光・温度・音で気になる変化はありますか？",
      },
    ];
    const filler = fillers[recommendations.length]!;
    recommendations.push({
      priority: recommendations.length + 1,
      title: filler.title,
      detail: filler.detail,
    });
  }

  return recommendations.slice(0, 5);
}

function buildSuggestedHomework(
  signals: InstructorSignal[],
): AiCounselingHomeworkSuggestion[] {
  const signalSet = new Set(signals);
  const preferred = HOMEWORK_LIBRARY.filter((item) =>
    item.signals.some((s) => signalSet.has(s)),
  );
  const pool = preferred.length >= 3 ? preferred : HOMEWORK_LIBRARY;
  const picked: AiCounselingHomeworkSuggestion[] = [];
  const used = new Set<string>();

  for (const item of pool) {
    if (picked.length >= 4) break;
    if (used.has(item.id)) continue;
    used.add(item.id);
    const matched =
      item.signals.find((s) => signalSet.has(s)) ?? item.signals[0]!;
    picked.push({
      id: item.id,
      category: item.category,
      label: item.label,
      reason:
        item.reasonBySignal[matched] ??
        `${CATEGORY_LABEL[item.category]}として ${item.fallbackReason}`,
    });
  }

  return picked;
}

function buildRiskAlerts(
  ctx: AiCounselingAssistantContext,
  latest: MetricSnap,
  previous: MetricSnap,
): AiCounselingRiskAlert[] {
  const alerts: AiCounselingRiskAlert[] = [];

  if (ctx.analyses.length < MIN_ANALYSES_FOR_TREND) {
    alerts.push({
      id: "insufficient_data",
      kind: "insufficient_data",
      title: "継続データ不足",
      detail:
        "比較できる分析がまだ少ないため、次回も同じ指標での継続計測を推奨します。",
    });
  }

  const scoreLatest = latest.wellnessScore ?? latest.sleepScore;
  const scorePrevious = previous.wellnessScore ?? previous.sleepScore;
  if (
    scoreLatest != null &&
    scorePrevious != null &&
    scorePrevious - scoreLatest >= SCORE_DECLINE_POINTS
  ) {
    alerts.push({
      id: "sleep_score_decline",
      kind: "sleep_score_decline",
      title: "睡眠スコア低下",
      detail: `前回比で約 ${Math.round(scorePrevious - scoreLatest)} ポイント低下しています。要因の聞き取りを優先してください。`,
    });
  }

  if (
    latest.sleepDurationMin != null &&
    latest.sleepDurationMin < SHORT_SLEEP_MIN
  ) {
    alerts.push({
      id: "short_sleep",
      kind: "short_sleep",
      title: "睡眠時間不足",
      detail: `直近の睡眠時間はおおよそ ${formatHours(latest.sleepDurationMin)} です。就寝余白の確認を推奨します。`,
    });
  }

  if (
    latest.stress != null &&
    previous.stress != null &&
    latest.stress - previous.stress >= STRESS_RISE_POINTS
  ) {
    alerts.push({
      id: "stress_rise",
      kind: "stress_rise",
      title: "ストレス上昇",
      detail: `ストレス指標が前回比で約 ${Math.round(latest.stress - previous.stress)} 上昇しています。日中負荷と就寝前ルーティンを確認してください。`,
    });
  } else if (latest.stress != null && latest.stress >= HIGH_STRESS) {
    alerts.push({
      id: "stress_rise",
      kind: "stress_rise",
      title: "ストレス上昇",
      detail: `ストレス指標が ${Math.round(latest.stress)} と高めです。緊張が夜まで残りやすいかを確認してください。`,
    });
  }

  return alerts;
}

/**
 * ルールベースの AI Counseling Assistant 生成。
 */
export function generateRuleBasedAiCounselingAssistant(
  ctx: AiCounselingAssistantContext,
): AiCounselingAssistant {
  const latest = snapOf(ctx.latest);
  const previous = snapOf(ctx.previous);
  const insight = generateRuleBasedInstructorInsight({
    analyses: ctx.analyses,
    latest: ctx.latest,
    previous: ctx.previous,
    streakDays: ctx.streakDays,
    homeworkRate: ctx.homeworkRate,
  });
  const signals = insight.challenges.map((c) => c.signal);

  return {
    summary: {
      currentState: buildCurrentState(latest, ctx),
      improved: buildImproved(
        latest,
        previous,
        ctx.streakDays,
        ctx.homeworkRate,
      ),
      worsened: buildWorsened(latest, previous),
      ongoing: buildOngoing(latest, previous, signals),
    },
    recommendations: buildRecommendations(insight),
    suggestedHomework: buildSuggestedHomework(signals),
    riskAlerts: buildRiskAlerts(ctx, latest, previous),
    source: "rules",
  };
}

/**
 * AI Counseling Assistant の統一エントリ。
 * 将来 LLM 実装を渡すだけで差し替え可能。
 */
export async function generateAiCounselingAssistant(
  ctx: AiCounselingAssistantContext,
  generator: AiCounselingAssistantGenerator = generateRuleBasedAiCounselingAssistant,
): Promise<AiCounselingAssistant> {
  return generator(ctx);
}

/**
 * クライアント詳細向けにコンテキストを組み立てる。
 * 分析・宿題（client_homeworks）・AI宿題達成率を利用。
 */
export async function loadAiCounselingAssistantContext(
  clientId: string,
): Promise<AiCounselingAssistantContext | null> {
  const client = await getClientById(clientId);
  if (!client) return null;

  const analyses = client.analyses ?? [];
  const latest = analyses[0] ?? null;
  const previous = analyses[1] ?? null;

  let streakDays = 0;
  let homeworkRate: number | null = null;

  try {
    const homeworks = await listClientHomeworks(clientId);
    const achievement = computeAssignedHomeworkAchievement(homeworks);
    streakDays = computeHomeworkStreakDays(homeworks);
    homeworkRate = achievement.rate;
  } catch {
    // client_homeworks 未適用環境は AI宿題達成率にフォールバック
  }

  if (homeworkRate == null && latest?.result) {
    const fromAi = homeworkRateOf(latest.result);
    homeworkRate = fromAi > 0 ? fromAi : null;
  }

  return {
    analyses,
    latest,
    previous,
    streakDays,
    homeworkRate,
  };
}

export { CATEGORY_LABEL as AI_COUNSELING_HOMEWORK_CATEGORY_LABEL };
