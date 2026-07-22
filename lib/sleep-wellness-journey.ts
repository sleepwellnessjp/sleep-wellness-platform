/**
 * Sleep Wellness Journey™ — SWIJ 独自の「改善の物語」。
 *
 * 現時点はルールベース。将来 GPT に差し替える場合は
 * `SleepWellnessJourneyGenerator` を実装して `generateSleepWellnessJourney` に渡す。
 */

import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  parseDurationMinutes,
  parseLeadingNumber,
} from "@/lib/soxai-graphs";

export type JourneySource = "rules" | "gpt";

export type JourneyTimelinePoint = {
  analysisId: string | null;
  date: string;
  /** 表示用（例: 7/1） */
  dateLabel: string;
  score: number | null;
  isCurrent: boolean;
};

export type JourneyBadgeId =
  | "morning_sun"
  | "breathing"
  | "bedtime"
  | "deep_sleep"
  | "score_up"
  | "efficiency"
  | "duration"
  | "hrv"
  | "stress"
  | "homework_streak"
  | "homework_rate";

export type JourneyBadge = {
  id: JourneyBadgeId;
  emoji: string;
  label: string;
};

/** UI / API 共通契約 */
export type SleepWellnessJourney = {
  title: string;
  timeline: JourneyTimelinePoint[];
  /** 100〜250文字程度の物語サマリー */
  summary: string;
  badges: JourneyBadge[];
  source: JourneySource;
};

export type SleepWellnessJourneyContext = {
  /** 新しい順の分析履歴 */
  analyses: StoredAnalysis[];
  /** 宿題の継続日数 */
  streakDays: number;
  /** 宿題達成率 0–100（対象なしは null） */
  homeworkRate: number | null;
};

export type SleepWellnessJourneyGenerator = (
  ctx: SleepWellnessJourneyContext,
) => SleepWellnessJourney | Promise<SleepWellnessJourney>;

type MetricSnap = {
  wellnessScore: number | null;
  sleepEfficiency: number | null;
  sleepDurationMin: number | null;
  deepSleepMin: number | null;
  hrv: number | null;
  stress: number | null;
};

const SUMMARY_MIN = 100;
const SUMMARY_MAX = 250;

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

function snapOf(analysis: StoredAnalysis | null): MetricSnap {
  if (!analysis) {
    return {
      wellnessScore: null,
      sleepEfficiency: null,
      sleepDurationMin: null,
      deepSleepMin: null,
      hrv: null,
      stress: null,
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
    hrv: parseLeadingNumber(String(analysis.metrics.hrv ?? "")),
    stress: parseLeadingNumber(
      String(
        analysis.structured?.stressAverage?.trim() ||
          analysis.metrics.stress ||
          "",
      ),
    ),
  };
}

function formatMonthDay(dateKey: string): string {
  const parts = dateKey.split("-");
  if (parts.length < 3) return dateKey;
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!m || !d) return dateKey;
  return `${m}/${d}`;
}

const TIMELINE_MAX_POINTS = 8;

/** 時系列（古い → 新しい）＋末尾に「現在」ノード */
export function buildJourneyTimeline(
  analyses: StoredAnalysis[],
): JourneyTimelinePoint[] {
  const chronological = analyses.slice().reverse();
  const trimmed =
    chronological.length > TIMELINE_MAX_POINTS
      ? chronological.slice(chronological.length - TIMELINE_MAX_POINTS)
      : chronological;

  const points: JourneyTimelinePoint[] = trimmed.map((analysis, index) => {
    const isLatest = index === trimmed.length - 1;
    return {
      analysisId: analysis.id,
      date: analysis.analysisDate,
      dateLabel: isLatest ? "現在" : formatMonthDay(analysis.analysisDate),
      score: wellnessScoreOf(analysis),
      isCurrent: isLatest,
    };
  });

  if (points.length === 0) {
    points.push({
      analysisId: null,
      date: "",
      dateLabel: "現在",
      score: null,
      isCurrent: true,
    });
  }

  return points;
}

function collectHomeworkTexts(analyses: StoredAnalysis[]): string {
  const chunks: string[] = [];
  for (const analysis of analyses) {
    const goals = analysis.result?.recommendationsUntilNext ?? [];
    for (const goal of goals) {
      if (goal?.text) chunks.push(goal.text);
    }
    for (const point of analysis.result?.goodPoints ?? []) {
      chunks.push(point);
    }
    for (const item of analysis.result?.improvements ?? []) {
      if (item?.text) chunks.push(item.text);
    }
    const summary = analysis.result?.summary;
    if (typeof summary === "string") chunks.push(summary);
    const karte = analysis.result?.karteSummary;
    if (typeof karte === "string") chunks.push(karte);
  }
  return chunks.join("\n");
}

function textMentions(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(haystack));
}

/**
 * 分析履歴・宿題状況から改善バッジを自動判定。
 */
export function detectJourneyBadges(
  ctx: SleepWellnessJourneyContext,
): JourneyBadge[] {
  const chronological = ctx.analyses.slice().reverse();
  if (chronological.length === 0) return [];

  const first = chronological[0]!;
  const latest = chronological[chronological.length - 1]!;
  const firstSnap = snapOf(first);
  const latestSnap = snapOf(latest);
  const corpus = collectHomeworkTexts(ctx.analyses);
  const badges: JourneyBadge[] = [];

  const scoreDelta =
    firstSnap.wellnessScore != null && latestSnap.wellnessScore != null
      ? latestSnap.wellnessScore - firstSnap.wellnessScore
      : null;

  if (
    textMentions(corpus, [/朝日/, /朝の光/, /日光浴/, /朝陽/, /朝陽を浴び/])
  ) {
    badges.push({ id: "morning_sun", emoji: "🌅", label: "朝日習慣" });
  }

  if (
    textMentions(corpus, [/呼吸/, /3[:：]?6/, /瞑想/, /リラックス呼吸/])
  ) {
    badges.push({ id: "breathing", emoji: "🧘", label: "呼吸法継続" });
  }

  const durationImproved =
    firstSnap.sleepDurationMin != null &&
    latestSnap.sleepDurationMin != null &&
    latestSnap.sleepDurationMin - firstSnap.sleepDurationMin >= 20;
  const bedtimeHabit = textMentions(corpus, [
    /就寝時刻/,
    /寝る時刻/,
    /就寝時間/,
    /ベッドタイム/,
    /スマホオフ/,
  ]);
  if (durationImproved || bedtimeHabit) {
    badges.push({ id: "bedtime", emoji: "🌙", label: "就寝時間改善" });
  }

  if (
    firstSnap.deepSleepMin != null &&
    latestSnap.deepSleepMin != null &&
    latestSnap.deepSleepMin - firstSnap.deepSleepMin >= 10
  ) {
    badges.push({ id: "deep_sleep", emoji: "💤", label: "深睡眠アップ" });
  }

  if (scoreDelta != null && scoreDelta >= 10) {
    const pts = Math.round(scoreDelta);
    badges.push({
      id: "score_up",
      emoji: "📈",
      label: `Score +${pts}`,
    });
  } else if (scoreDelta != null && scoreDelta >= 5) {
    badges.push({
      id: "score_up",
      emoji: "📈",
      label: `Score +${Math.round(scoreDelta)}`,
    });
  }

  if (
    firstSnap.sleepEfficiency != null &&
    latestSnap.sleepEfficiency != null &&
    latestSnap.sleepEfficiency - firstSnap.sleepEfficiency >= 3
  ) {
    badges.push({ id: "efficiency", emoji: "✨", label: "睡眠効率アップ" });
  }

  if (
    firstSnap.hrv != null &&
    latestSnap.hrv != null &&
    latestSnap.hrv - firstSnap.hrv >= 5
  ) {
    badges.push({ id: "hrv", emoji: "💓", label: "HRV改善" });
  }

  if (
    firstSnap.stress != null &&
    latestSnap.stress != null &&
    firstSnap.stress - latestSnap.stress >= 5
  ) {
    badges.push({ id: "stress", emoji: "🍃", label: "ストレス低下" });
  }

  if (ctx.streakDays >= 7) {
    badges.push({
      id: "homework_streak",
      emoji: "🔥",
      label: `${ctx.streakDays}日継続`,
    });
  } else if (ctx.streakDays >= 3) {
    badges.push({
      id: "homework_streak",
      emoji: "🔥",
      label: "宿題継続",
    });
  }

  if (ctx.homeworkRate != null && ctx.homeworkRate >= 70) {
    badges.push({
      id: "homework_rate",
      emoji: "✅",
      label: `達成率 ${Math.round(ctx.homeworkRate)}%`,
    });
  }

  // 重複 ID を除去しつつ最大6件
  const seen = new Set<JourneyBadgeId>();
  const unique: JourneyBadge[] = [];
  for (const badge of badges) {
    if (seen.has(badge.id)) continue;
    seen.add(badge.id);
    unique.push(badge);
    if (unique.length >= 6) break;
  }
  return unique;
}

function clampSummaryLength(text: string): string {
  const normalized = text.replace(/\s+\n/g, "\n").trim();
  const chars = Array.from(normalized);
  if (chars.length <= SUMMARY_MAX) {
    if (chars.length >= SUMMARY_MIN) return normalized;
    // 短すぎる場合は締めの一文を足す
    const padded = `${normalized}\n\nこれからも小さな積み重ねを大切にしましょう。`;
    return Array.from(padded).slice(0, SUMMARY_MAX).join("").trim();
  }
  return chars.slice(0, SUMMARY_MAX).join("").trim();
}

function describeOpening(first: MetricSnap): string {
  const parts: string[] = [];
  if (
    first.sleepDurationMin != null &&
    first.sleepDurationMin < 6 * 60
  ) {
    parts.push("最初は睡眠時間が不足し");
  }
  if (
    first.sleepEfficiency != null &&
    first.sleepEfficiency < 85
  ) {
    parts.push(
      parts.length === 0
        ? "最初は睡眠効率が低めでした"
        : "睡眠効率も低めでした",
    );
  }
  if (first.stress != null && first.stress >= 50) {
    parts.push(
      parts.length === 0
        ? "最初はストレスが高めでした"
        : "ストレスも高めでした",
    );
  }
  if (parts.length === 0) {
    return "最初の分析では、まだ改善の余地が見えていました。";
  }
  if (parts.length === 1 && !parts[0]!.endsWith("でした")) {
    return `${parts[0]}、就寝リズムにもばらつきがありました。`;
  }
  if (parts.length === 1) return `${parts[0]}。`;
  return `${parts[0]}、${parts.slice(1).join("、")}。`;
}

function describeProcess(
  badges: JourneyBadge[],
  streakDays: number,
  homeworkRate: number | null,
): string {
  const habits: string[] = [];
  if (badges.some((b) => b.id === "morning_sun")) {
    habits.push("朝日を浴びる習慣");
  }
  if (badges.some((b) => b.id === "breathing")) {
    habits.push("呼吸法");
  }
  if (badges.some((b) => b.id === "bedtime")) {
    habits.push("就寝時刻の整え");
  }

  if (habits.length > 0) {
    return `宿題を継続し、${habits.join("と")}が身についたことで、`;
  }
  if (streakDays >= 3 || (homeworkRate != null && homeworkRate >= 50)) {
    return "宿題への取り組みを積み重ねたことで、";
  }
  return "分析を重ねて生活リズムを見直したことで、";
}

function describeOutcome(
  first: MetricSnap,
  latest: MetricSnap,
  badges: JourneyBadge[],
): { body: string; nextGoal: string } {
  const gains: string[] = [];

  if (
    first.sleepEfficiency != null &&
    latest.sleepEfficiency != null &&
    latest.sleepEfficiency > first.sleepEfficiency
  ) {
    gains.push("睡眠効率は改善し");
  }
  if (
    first.deepSleepMin != null &&
    latest.deepSleepMin != null &&
    latest.deepSleepMin > first.deepSleepMin
  ) {
    gains.push("深睡眠も伸び");
  }
  if (
    first.sleepDurationMin != null &&
    latest.sleepDurationMin != null &&
    latest.sleepDurationMin - first.sleepDurationMin >= 15
  ) {
    gains.push("睡眠時間も整い");
  }

  const scoreDelta =
    first.wellnessScore != null && latest.wellnessScore != null
      ? Math.round(latest.wellnessScore - first.wellnessScore)
      : null;

  let body: string;
  if (gains.length > 0 && scoreDelta != null && scoreDelta > 0) {
    body = `${gains.join("、")}、Sleep Wellness Scoreも${scoreDelta}ポイント向上しました。`;
  } else if (scoreDelta != null && scoreDelta > 0) {
    body = `Sleep Wellness Scoreは${scoreDelta}ポイント向上しました。`;
  } else if (gains.length > 0) {
    body = `${gains.join("、")}ました。`;
  } else if (latest.wellnessScore != null) {
    body = `現在の Sleep Wellness Score は${Math.round(latest.wellnessScore)}です。`;
  } else {
    body = "着実に睡眠の土台づくりが進んでいます。";
  }

  let nextGoal = "今後は良い流れを崩さず、習慣を大切にしましょう。";
  if (
    latest.deepSleepMin != null &&
    (first.deepSleepMin == null ||
      latest.deepSleepMin - (first.deepSleepMin ?? 0) < 15) &&
    !badges.some((b) => b.id === "deep_sleep")
  ) {
    nextGoal = "今後は深睡眠をさらに伸ばすことを目標にしましょう。";
  } else if (
    latest.sleepEfficiency != null &&
    latest.sleepEfficiency < 90
  ) {
    nextGoal = "今後は睡眠効率をさらに高めることを目標にしましょう。";
  } else if (latest.stress != null && latest.stress >= 40) {
    nextGoal = "今後はストレスケアを続け、回復力を高めていきましょう。";
  } else if (latest.hrv != null && latest.hrv < 40) {
    nextGoal = "今後はHRVを高め、自律神経のゆとりを育てましょう。";
  }

  return { body, nextGoal };
}

/**
 * ルールベースの Journey Summary（100〜250文字）。
 */
export function buildRuleBasedJourneySummary(
  ctx: SleepWellnessJourneyContext,
  badges: JourneyBadge[],
): string {
  const chronological = ctx.analyses.slice().reverse();
  if (chronological.length === 0) {
    return clampSummaryLength(
      "まだ分析履歴がありません。最初の分析から、あなたの Sleep Wellness Journey が始まります。",
    );
  }

  if (chronological.length === 1) {
    const only = snapOf(chronological[0]!);
    const scoreLabel =
      only.wellnessScore != null
        ? `現在の Sleep Wellness Score は${Math.round(only.wellnessScore)}です。`
        : "最初の Sleep Wellness Score が記録されました。";
    return clampSummaryLength(
      `${scoreLabel}\n\n宿題と日々の習慣を続けることで、これからの改善の物語が形になっていきます。`,
    );
  }

  const first = snapOf(chronological[0]!);
  const latest = snapOf(chronological[chronological.length - 1]!);
  const opening = describeOpening(first);
  const process = describeProcess(badges, ctx.streakDays, ctx.homeworkRate);
  const { body, nextGoal } = describeOutcome(first, latest, badges);

  return clampSummaryLength(
    `${opening}\n\n${process}\n\n${body}\n\n${nextGoal}`,
  );
}

/**
 * ルールベースの Sleep Wellness Journey™ 生成。
 */
export function generateRuleBasedSleepWellnessJourney(
  ctx: SleepWellnessJourneyContext,
): SleepWellnessJourney {
  const timeline = buildJourneyTimeline(ctx.analyses);
  const badges = detectJourneyBadges(ctx);
  const summary = buildRuleBasedJourneySummary(ctx, badges);

  return {
    title: "あなたのSleep Wellness Journey",
    timeline,
    summary,
    badges,
    source: "rules",
  };
}

/**
 * Sleep Wellness Journey™ の統一エントリ。
 * 将来 GPT 実装を渡すだけで差し替え可能。
 */
export async function generateSleepWellnessJourney(
  ctx: SleepWellnessJourneyContext,
  generator: SleepWellnessJourneyGenerator = generateRuleBasedSleepWellnessJourney,
): Promise<SleepWellnessJourney> {
  return generator(ctx);
}
