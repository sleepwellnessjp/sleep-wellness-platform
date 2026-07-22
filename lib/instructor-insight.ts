/**
 * Sleep Wellness Instructor AI — 認定講師向けカウンセリング準備インサイト。
 *
 * 現時点はルールベース。将来 GPT に差し替える場合は
 * `InstructorInsightGenerator` を実装して `generateInstructorInsight` に渡す。
 */

import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  parseDurationMinutes,
  parseHHMM,
  parseLeadingNumber,
} from "@/lib/soxai-graphs";
import { generateRuleBasedSleepWellnessJourney } from "@/lib/sleep-wellness-journey";

export type InstructorInsightSource = "rules" | "gpt";

export type InstructorChallenge = {
  /** 1始まりの優先度 */
  priority: number;
  label: string;
  /** 内部シグナル（デバッグ / 将来 AI プロンプト用） */
  signal: InstructorSignal;
};

/** UI / API 共通契約 */
export type InstructorInsight = {
  /** ① 今回もっとも改善した点 */
  improvedPoints: string[];
  /** ② 現在の課題（優先順位付き・最大3） */
  challenges: InstructorChallenge[];
  /** ③ 次回カウンセリングで確認したい質問 */
  counselingQuestions: string[];
  /** ④ 推奨する介入 */
  interventions: string[];
  /** ⑤ AI総評（150〜250文字） */
  summary: string;
  source: InstructorInsightSource;
};

export type InstructorInsightContext = {
  /** 新しい順の分析履歴 */
  analyses: StoredAnalysis[];
  latest: StoredAnalysis | null;
  previous: StoredAnalysis | null;
  /** 宿題の継続日数 */
  streakDays: number;
  /** 宿題達成率 0–100（対象なしは null） */
  homeworkRate: number | null;
};

export type InstructorInsightGenerator = (
  ctx: InstructorInsightContext,
) => InstructorInsight | Promise<InstructorInsight>;

export type InstructorSignal =
  | "sleep_debt"
  | "short_sleep"
  | "low_efficiency"
  | "low_deep_sleep"
  | "high_stress"
  | "low_hrv"
  | "bedtime_variance"
  | "homework"
  | "maintain";

type MetricSnap = {
  wellnessScore: number | null;
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
const BEDTIME_VARIANCE_MIN = 45;
const SUMMARY_MIN = 150;
const SUMMARY_MAX = 250;

const SIGNAL_LABEL: Record<InstructorSignal, string> = {
  sleep_debt: "睡眠負債",
  short_sleep: "睡眠時間不足",
  low_efficiency: "睡眠効率の低下",
  low_deep_sleep: "深睡眠不足",
  high_stress: "ストレス偏高",
  low_hrv: "HRV低下",
  bedtime_variance: "就寝時刻のばらつき",
  homework: "宿題達成の停滞",
  maintain: "現状維持の確認",
};

const QUESTIONS_BY_SIGNAL: Record<InstructorSignal, string[]> = {
  sleep_debt: [
    "平日と休日で睡眠時間に差はありますか？",
    "最近、睡眠を削って仕事や家事を優先した日はありましたか？",
  ],
  short_sleep: [
    "就寝時刻を前倒しできそうな余白はありますか？",
    "休日も同じ時間に起きられていますか？",
  ],
  low_efficiency: [
    "夜間覚醒の原因に心当たりはありますか？",
    "就寝前のスマホ・光刺激は減らせていますか？",
  ],
  low_deep_sleep: [
    "夕食時間は変わりましたか？",
    "就寝90分前の入浴は実践できていますか？",
  ],
  high_stress: [
    "日中の緊張が夜まで残りやすい場面はありますか？",
    "就寝前にリラックスできる時間は取れていますか？",
  ],
  low_hrv: [
    "最近、負荷の高い運動や長時間のデスクワークは増えていますか？",
    "短い呼吸法を日常に入れられていますか？",
  ],
  bedtime_variance: [
    "休日も同じ時間に起きられていますか？",
    "就寝時刻が遅くなるきっかけは何が多いですか？",
  ],
  homework: [
    "宿題が進みにくい時間帯や理由はありますか？",
    "続けやすさの観点で、宿題の難易度は適切でしたか？",
  ],
  maintain: [
    "良い流れを支えている習慣は何だと感じますか？",
    "次回までに崩したくないルーティンはありますか？",
  ],
};

type InterventionCandidate = {
  id: string;
  label: string;
  signals: InstructorSignal[];
};

const INTERVENTION_LIBRARY: InterventionCandidate[] = [
  {
    id: "yoga-p2",
    label: "メラトニンヨガ™ Phase2",
    signals: ["low_deep_sleep", "high_stress", "low_efficiency", "maintain"],
  },
  {
    id: "breath36",
    label: "3:6呼吸",
    signals: ["high_stress", "low_hrv", "low_efficiency", "maintain"],
  },
  {
    id: "sun",
    label: "朝日10分",
    signals: ["bedtime_variance", "short_sleep", "sleep_debt", "maintain"],
  },
  {
    id: "bath",
    label: "入浴タイミング",
    signals: ["low_deep_sleep", "low_efficiency", "sleep_debt"],
  },
  {
    id: "routine90",
    label: "就寝90分前ルーティン",
    signals: ["low_efficiency", "bedtime_variance", "short_sleep", "homework"],
  },
  {
    id: "caffeine",
    label: "午後カフェインオフ",
    signals: ["low_deep_sleep", "sleep_debt", "low_efficiency"],
  },
  {
    id: "phone",
    label: "就寝1時間前スマホオフ",
    signals: ["low_efficiency", "bedtime_variance", "short_sleep"],
  },
  {
    id: "walk",
    label: "夕方の軽い散歩",
    signals: ["low_hrv", "high_stress", "homework"],
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

/** 就寝時刻の差（分）。日付跨ぎを考慮して最短差。 */
function bedtimeDeltaMinutes(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 1440 - raw);
}

function bedtimeVarianceMinutes(analyses: StoredAnalysis[]): number | null {
  const times = analyses
    .slice(0, 4)
    .map((a) => bedtimeOf(a))
    .filter((v): v is number => v != null);
  if (times.length < 2) return null;
  let max = 0;
  for (let i = 0; i < times.length; i += 1) {
    for (let j = i + 1; j < times.length; j += 1) {
      max = Math.max(max, bedtimeDeltaMinutes(times[i]!, times[j]!));
    }
  }
  return max;
}

function formatMinutesDelta(delta: number): string {
  const abs = Math.abs(Math.round(delta));
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`;
  if (hours > 0) return `${hours}時間`;
  return `${minutes}分`;
}

type ImprovementCandidate = {
  score: number;
  text: string;
};

function buildImprovedPoints(
  latest: MetricSnap,
  previous: MetricSnap,
  bedtimeVariance: number | null,
  previousBedtimeVariance: number | null,
  streakDays: number,
  homeworkRate: number | null,
): string[] {
  const candidates: ImprovementCandidate[] = [];

  if (latest.wellnessScore != null && previous.wellnessScore != null) {
    const delta = latest.wellnessScore - previous.wellnessScore;
    if (delta >= 2) {
      candidates.push({
        score: delta * 2,
        text: `Sleep Wellness Scoreが${Math.round(delta)}ポイント改善`,
      });
    }
  }

  if (latest.sleepEfficiency != null && previous.sleepEfficiency != null) {
    const delta = latest.sleepEfficiency - previous.sleepEfficiency;
    if (delta >= 2) {
      candidates.push({
        score: delta * 1.5,
        text: `睡眠効率が${Math.round(delta)}％改善`,
      });
    }
  }

  if (latest.sleepDurationMin != null && previous.sleepDurationMin != null) {
    const delta = latest.sleepDurationMin - previous.sleepDurationMin;
    if (delta >= 15) {
      candidates.push({
        score: delta / 10,
        text: `睡眠時間が${formatMinutesDelta(delta)}増加`,
      });
    }
  }

  if (latest.deepSleepMin != null && previous.deepSleepMin != null) {
    const delta = latest.deepSleepMin - previous.deepSleepMin;
    if (delta >= 10) {
      candidates.push({
        score: delta / 8,
        text: `深睡眠が${formatMinutesDelta(delta)}増加`,
      });
    }
  }

  if (latest.hrv != null && previous.hrv != null) {
    const delta = latest.hrv - previous.hrv;
    if (delta >= 2) {
      candidates.push({
        score: delta * 1.2,
        text: "HRVが上昇",
      });
    }
  }

  if (latest.stress != null && previous.stress != null) {
    const delta = previous.stress - latest.stress;
    if (delta >= 3) {
      candidates.push({
        score: delta,
        text: `ストレス指標が${Math.round(delta)}低下`,
      });
    }
  }

  if (latest.sleepDebtMin != null && previous.sleepDebtMin != null) {
    const latestAbs = Math.abs(latest.sleepDebtMin);
    const previousAbs = Math.abs(previous.sleepDebtMin);
    const delta = previousAbs - latestAbs;
    if (delta >= 15) {
      candidates.push({
        score: delta / 10,
        text: `睡眠負債が${formatMinutesDelta(delta)}減少`,
      });
    }
  }

  if (
    bedtimeVariance != null &&
    previousBedtimeVariance != null &&
    previousBedtimeVariance - bedtimeVariance >= 20
  ) {
    candidates.push({
      score: (previousBedtimeVariance - bedtimeVariance) / 10,
      text: "就寝時刻が安定",
    });
  } else if (
    latest.bedtimeMin != null &&
    previous.bedtimeMin != null &&
    bedtimeDeltaMinutes(latest.bedtimeMin, previous.bedtimeMin) <= 20 &&
    bedtimeVariance != null &&
    bedtimeVariance <= 30
  ) {
    candidates.push({
      score: 3,
      text: "就寝時刻が安定",
    });
  }

  if (streakDays >= 3) {
    candidates.push({
      score: Math.min(streakDays, 7),
      text: `宿題を${streakDays}日連続で継続`,
    });
  }

  if (homeworkRate != null && homeworkRate >= 70) {
    candidates.push({
      score: homeworkRate / 20,
      text: `宿題達成率${Math.round(homeworkRate)}％を維持`,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const unique: string[] = [];
  for (const item of candidates) {
    if (unique.includes(item.text)) continue;
    unique.push(item.text);
    if (unique.length >= 3) break;
  }

  if (unique.length === 0) {
    if (latest.wellnessScore != null && latest.wellnessScore >= 70) {
      return ["良好なスコア帯を維持"];
    }
    if (latest.sleepEfficiency != null && latest.sleepEfficiency >= 85) {
      return ["睡眠効率は基準圏を維持"];
    }
    return ["比較できる改善ポイントはまだ限定的"];
  }

  return unique;
}

type ChallengeCandidate = {
  signal: InstructorSignal;
  weight: number;
};

function buildChallenges(
  latest: MetricSnap,
  bedtimeVariance: number | null,
  homeworkRate: number | null,
): InstructorChallenge[] {
  const candidates: ChallengeCandidate[] = [];
  const debtAbs =
    latest.sleepDebtMin == null ? null : Math.abs(latest.sleepDebtMin);

  if (debtAbs != null && debtAbs >= DEBT_THRESHOLD_MIN) {
    candidates.push({
      signal: "sleep_debt",
      weight: 100 + Math.min(debtAbs / 5, 40),
    });
  }
  if (
    latest.sleepDurationMin != null &&
    latest.sleepDurationMin < SHORT_SLEEP_MIN
  ) {
    candidates.push({
      signal: "short_sleep",
      weight: 95 + (SHORT_SLEEP_MIN - latest.sleepDurationMin) / 10,
    });
  }
  if (
    latest.sleepEfficiency != null &&
    latest.sleepEfficiency < LOW_EFFICIENCY
  ) {
    candidates.push({
      signal: "low_efficiency",
      weight: 90 + (LOW_EFFICIENCY - latest.sleepEfficiency),
    });
  }
  if (
    latest.deepSleepMin != null &&
    latest.deepSleepMin < LOW_DEEP_SLEEP_MIN
  ) {
    candidates.push({
      signal: "low_deep_sleep",
      weight: 85 + (LOW_DEEP_SLEEP_MIN - latest.deepSleepMin) / 5,
    });
  }
  if (latest.stress != null && latest.stress >= HIGH_STRESS) {
    candidates.push({
      signal: "high_stress",
      weight: 80 + (latest.stress - HIGH_STRESS) / 2,
    });
  }
  if (latest.hrv != null && latest.hrv > 0 && latest.hrv < LOW_HRV) {
    candidates.push({
      signal: "low_hrv",
      weight: 75 + (LOW_HRV - latest.hrv),
    });
  }
  if (bedtimeVariance != null && bedtimeVariance >= BEDTIME_VARIANCE_MIN) {
    candidates.push({
      signal: "bedtime_variance",
      weight: 70 + Math.min(bedtimeVariance / 5, 25),
    });
  }
  if (homeworkRate != null && homeworkRate < 50) {
    candidates.push({
      signal: "homework",
      weight: 55 + (50 - homeworkRate) / 2,
    });
  }

  candidates.sort((a, b) => b.weight - a.weight);

  const top = candidates.slice(0, 3);
  if (top.length === 0) {
    return [
      {
        priority: 1,
        label: SIGNAL_LABEL.maintain,
        signal: "maintain",
      },
    ];
  }

  return top.map((item, index) => ({
    priority: index + 1,
    label: SIGNAL_LABEL[item.signal],
    signal: item.signal,
  }));
}

function buildCounselingQuestions(
  challenges: InstructorChallenge[],
): string[] {
  const questions: string[] = [];
  const used = new Set<string>();

  for (const challenge of challenges) {
    for (const q of QUESTIONS_BY_SIGNAL[challenge.signal]) {
      if (used.has(q)) continue;
      used.add(q);
      questions.push(q);
      break;
    }
    if (questions.length >= 3) break;
  }

  // 不足時は maintain / 汎用で補完
  for (const q of [
    ...QUESTIONS_BY_SIGNAL.maintain,
    "夕食時間は変わりましたか？",
    "夜間覚醒の原因に心当たりはありますか？",
  ]) {
    if (questions.length >= 3) break;
    if (used.has(q)) continue;
    used.add(q);
    questions.push(q);
  }

  return questions;
}

function buildInterventions(
  challenges: InstructorChallenge[],
): string[] {
  const signalSet = new Set(challenges.map((c) => c.signal));
  const preferred = INTERVENTION_LIBRARY.filter((item) =>
    item.signals.some((s) => signalSet.has(s)),
  );
  const pool = preferred.length >= 3 ? preferred : INTERVENTION_LIBRARY;
  const picked: string[] = [];
  const used = new Set<string>();

  for (const item of pool) {
    if (picked.length >= 5) break;
    if (used.has(item.id)) continue;
    used.add(item.id);
    picked.push(item.label);
  }

  for (const item of INTERVENTION_LIBRARY) {
    if (picked.length >= 5) break;
    if (used.has(item.id)) continue;
    used.add(item.id);
    picked.push(item.label);
  }

  return picked;
}

function clampSummary(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= SUMMARY_MAX) {
    if (normalized.length >= SUMMARY_MIN) return normalized;
    const pad =
      "次回カウンセリングでは優先課題を一つに絞り、実践可能な介入から確認すると効果的です。";
    const merged = `${normalized} ${pad}`.trim();
    return merged.length > SUMMARY_MAX
      ? merged.slice(0, SUMMARY_MAX)
      : merged;
  }
  return normalized.slice(0, SUMMARY_MAX);
}

function buildSummary(
  ctx: InstructorInsightContext,
  latest: MetricSnap,
  improvedPoints: string[],
  challenges: InstructorChallenge[],
): string {
  const journey = generateRuleBasedSleepWellnessJourney({
    analyses: ctx.analyses,
    streakDays: ctx.streakDays,
    homeworkRate: ctx.homeworkRate,
  });

  const scorePart =
    latest.wellnessScore != null
      ? `最新の Sleep Wellness Score は ${Math.round(latest.wellnessScore)}。`
      : "最新スコアは未確定です。";

  const improvePart =
    improvedPoints.length > 0 &&
    !improvedPoints[0]!.includes("まだ限定的")
      ? `改善面では${improvedPoints.slice(0, 2).join("、")}が見られます。`
      : "前回比で明確な改善指標はまだ少ない状況です。";

  const challengeLabels = challenges
    .filter((c) => c.signal !== "maintain")
    .map((c) => c.label);
  const challengePart =
    challengeLabels.length > 0
      ? `一方で課題は${challengeLabels.join("、")}が優先です。`
      : "大きな崩れはなく、現状維持の確認が中心になります。";

  const homeworkPart =
    ctx.homeworkRate != null
      ? `宿題達成率は${Math.round(ctx.homeworkRate)}％`
      : "宿題達成率は未計測";
  const streakPart =
    ctx.streakDays > 0
      ? `、継続は${ctx.streakDays}日です。`
      : "です。";

  const analysisPart =
    ctx.analyses.length >= 2
      ? `分析履歴は${ctx.analyses.length}回あり、推移を踏まえた介入設計が可能です。`
      : "初回〜少数回の分析のため、次回も同じ指標の確認が重要です。";

  const journeyHint = journey.badges
    .slice(0, 2)
    .map((b) => b.label)
    .join("・");
  const journeyPart = journeyHint
    ? `Journey上は${journeyHint}の兆しも確認できます。`
    : "";

  return clampSummary(
    `${scorePart}${improvePart}${challengePart}${homeworkPart}${streakPart}${analysisPart}${journeyPart}`,
  );
}

/**
 * ルールベースの Instructor Insight 生成。
 * 既存メトリクス・宿題・Journey から ①〜⑤ を組み立てる。
 */
export function generateRuleBasedInstructorInsight(
  ctx: InstructorInsightContext,
): InstructorInsight {
  const latest = snapOf(ctx.latest);
  const previous = snapOf(ctx.previous);
  const bedtimeVariance = bedtimeVarianceMinutes(ctx.analyses);
  const previousBedtimeVariance = bedtimeVarianceMinutes(
    ctx.analyses.slice(1),
  );

  const improvedPoints = buildImprovedPoints(
    latest,
    previous,
    bedtimeVariance,
    previousBedtimeVariance,
    ctx.streakDays,
    ctx.homeworkRate,
  );
  const challenges = buildChallenges(
    latest,
    bedtimeVariance,
    ctx.homeworkRate,
  );
  const counselingQuestions = buildCounselingQuestions(challenges);
  const interventions = buildInterventions(challenges);
  const summary = buildSummary(ctx, latest, improvedPoints, challenges);

  return {
    improvedPoints,
    challenges,
    counselingQuestions,
    interventions,
    summary,
    source: "rules",
  };
}

/**
 * Instructor Insight の統一エントリ。
 * 将来 GPT 実装を渡すだけで差し替え可能。
 */
export async function generateInstructorInsight(
  ctx: InstructorInsightContext,
  generator: InstructorInsightGenerator = generateRuleBasedInstructorInsight,
): Promise<InstructorInsight> {
  return generator(ctx);
}
