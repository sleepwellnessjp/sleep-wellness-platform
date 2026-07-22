import type {
  AnalysisDayContext,
  ClientProfileRecord,
} from "@/lib/client-profiles";
import {
  analysisSleepScore,
  type StoredAnalysis,
} from "@/lib/client-store";
import { parseDurationMinutes } from "@/lib/soxai-graphs";

export type AiFollowAlertKind =
  | "consecutive_decline"
  | "short_sleep_streak"
  | "alcohol_increase"
  | "night_shift_load"
  | "large_drop";

export type AiFollowAlert = {
  id: string;
  kind: AiFollowAlertKind;
  /** 観察事実（診断表現は使わない） */
  title: string;
  /** フォロー推奨の一文 */
  detail: string;
};

export type BuildAiFollowAlertsInput = {
  /** 新しい順 */
  analyses: StoredAnalysis[];
  profile?: ClientProfileRecord | null;
  tags?: string[] | null;
  /** analyses と同じ順。未取得なら省略可 */
  dayContexts?: Array<AnalysisDayContext | null | undefined>;
};

const SHORT_SLEEP_MINUTES = 5 * 60;
const DECLINE_THRESHOLD = 1;
const LARGE_DROP_POINTS = 5;
const SHORT_SLEEP_STREAK = 2;
const MIN_CONSECUTIVE_DECLINES = 3;

function collectNarrative(analysis: StoredAnalysis): string {
  const r = analysis.result;
  const improvementTexts = (r.improvements ?? [])
    .map((item) => (typeof item === "string" ? item : item.text))
    .filter(Boolean);
  return [
    r.karteSummary,
    r.summary,
    r.profileRelation,
    r.scoreComment,
    ...improvementTexts,
    ...(r.goodPoints ?? []),
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n");
}

function hasAlcoholIncreaseMention(text: string): boolean {
  return (
    /飲酒[量頻度]?[がを]?(?:増え|増加|多め|多すぎ)/.test(text) ||
    /アルコール[がを]?(?:増え|増加)/.test(text) ||
    /(?:増え|増加).{0,12}飲酒/.test(text)
  );
}

function hasNightShiftIncreaseMention(text: string): boolean {
  return (
    /夜勤[がを]?(?:増え|増加|多め|続き)/.test(text) ||
    /(?:シフト|勤務).{0,8}(?:増え|増加)/.test(text) ||
    /(?:増え|増加).{0,12}夜勤/.test(text)
  );
}

function alcoholVolumeSignal(amount: string | undefined): number | null {
  const raw = amount?.trim() ?? "";
  if (!raw) return null;
  if (/なし|無し|飲まない|なし（|0\s*ml|ゼロ/i.test(raw)) return 0;

  const ml = raw.match(/(\d+(?:\.\d+)?)\s*m[lｌ]/i);
  if (ml) return Number(ml[1]);

  const go = raw.match(/(\d+(?:\.\d+)?)\s*合/);
  if (go) return Number(go[1]) * 180;

  const cups = raw.match(/(\d+(?:\.\d+)?)\s*(?:杯|本|缶)/);
  if (cups) return Number(cups[1]) * 200;

  if (/多|たくさん|多め|深酒/.test(raw)) return 500;
  return 200;
}

function profileHasNightShift(
  profile?: ClientProfileRecord | null,
  tags?: string[] | null,
): boolean {
  const nights = profile?.work.nightShiftsPerMonth;
  if (typeof nights === "number" && nights > 0) return true;

  const attrs = profile?.work.environmentAttributeIds ?? [];
  if (attrs.some((id) => id === "night_shift" || id.includes("night"))) {
    return true;
  }

  const tagHit = (tags ?? []).some((tag) => /夜勤|シフト/.test(tag));
  return tagHit;
}

function profileSuggestsFrequentDrinking(
  profile?: ClientProfileRecord | null,
): boolean {
  const freq = profile?.lifestyle.drinkingFrequency?.trim() ?? "";
  if (!freq) return false;
  return /ほぼ毎日|毎日|週\s*[4-7]|週四|週五|週六|頻繁|多い/.test(freq);
}

function countTrailingDeclines(scores: number[]): number {
  let count = 0;
  for (let i = 0; i < scores.length - 1; i += 1) {
    if (scores[i]! <= scores[i + 1]! - DECLINE_THRESHOLD) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

function sleepDurationMinutes(analysis: StoredAnalysis): number | null {
  return parseDurationMinutes(analysis.metrics.sleepDuration ?? "");
}

function countShortSleepStreak(analyses: StoredAnalysis[]): number {
  let count = 0;
  for (const analysis of analyses) {
    const minutes = sleepDurationMinutes(analysis);
    if (minutes != null && minutes < SHORT_SLEEP_MINUTES) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

/**
 * 診断ではなく「フォロー推奨」用の AI アラートを生成する。
 * メトリクス推移・プロフィール・AI文面・当日コンテキストから検知する。
 */
export function buildAiFollowAlerts(
  input: BuildAiFollowAlertsInput,
): AiFollowAlert[] {
  const analyses = input.analyses;
  if (analyses.length === 0) return [];

  const alerts: AiFollowAlert[] = [];
  const scores = analyses
    .map((item) => analysisSleepScore(item))
    .filter((n): n is number => n != null);

  const consecutiveDeclines = countTrailingDeclines(scores);
  if (consecutiveDeclines >= MIN_CONSECUTIVE_DECLINES) {
    alerts.push({
      id: "consecutive_decline",
      kind: "consecutive_decline",
      title: `${consecutiveDeclines}回連続で睡眠スコアが低下`,
      detail:
        "傾向の確認と生活リズムのヒアリングを、次回フォローでおすすめします。",
    });
  }

  const shortStreak = countShortSleepStreak(analyses);
  if (shortStreak >= SHORT_SLEEP_STREAK) {
    alerts.push({
      id: "short_sleep_streak",
      kind: "short_sleep_streak",
      title: `睡眠時間5時間未満が${shortStreak}回継続`,
      detail:
        "睡眠時間の確保状況を丁寧に聞き取り、負担の少ない整え方を一緒に検討してください。",
    });
  } else if (shortStreak === 1) {
    const minutes = sleepDurationMinutes(analyses[0]!);
    if (minutes != null && minutes < SHORT_SLEEP_MINUTES) {
      alerts.push({
        id: "short_sleep_latest",
        kind: "short_sleep_streak",
        title: "直近の睡眠時間が5時間未満",
        detail:
          "単発か継続かの見極めのため、次回測定までの過ごし方をフォローすると安心です。",
      });
    }
  }

  if (scores.length >= 2) {
    const drop = scores[1]! - scores[0]!;
    if (drop >= LARGE_DROP_POINTS && consecutiveDeclines < MIN_CONSECUTIVE_DECLINES) {
      alerts.push({
        id: "large_drop",
        kind: "large_drop",
        title: `前回より睡眠スコアが${Math.round(drop)}点低下`,
        detail:
          "前回との差分が大きいため、生活変化の有無を次回フォローで確認してください。",
      });
    }
  }

  const latestNarrative = collectNarrative(analyses[0]!);
  const alcoholFromText = hasAlcoholIncreaseMention(latestNarrative);
  const alcoholFromContext = (() => {
    const contexts = input.dayContexts;
    if (!contexts || contexts.length < 2) return false;
    const latest = alcoholVolumeSignal(contexts[0]?.previousDayAlcoholAmount);
    const previous = alcoholVolumeSignal(contexts[1]?.previousDayAlcoholAmount);
    if (latest == null || previous == null) return false;
    return latest > previous && latest - previous >= 100;
  })();

  if (alcoholFromText || alcoholFromContext) {
    alerts.push({
      id: "alcohol_increase",
      kind: "alcohol_increase",
      title: "飲酒量の増加がうかがえます",
      detail:
        "診断ではなく生活文脈の確認として、飲酒タイミングと量をやさしくフォローしてください。",
    });
  } else if (
    profileSuggestsFrequentDrinking(input.profile) &&
    consecutiveDeclines >= 1
  ) {
    alerts.push({
      id: "alcohol_habit_follow",
      kind: "alcohol_increase",
      title: "飲酒習慣と睡眠低下の重なり",
      detail:
        "飲酒頻度のプロフィールとスコア低下が重なっています。負担のない範囲で聞き取りをおすすめします。",
    });
  }

  const nightFromText = hasNightShiftIncreaseMention(latestNarrative);
  const nightFromProfile = profileHasNightShift(input.profile, input.tags);
  if (nightFromText) {
    alerts.push({
      id: "night_shift_increase",
      kind: "night_shift_load",
      title: "夜勤の増加がうかがえます",
      detail:
        "シフト変化と回復のバランスを、次回フォローで一緒に整理すると良いでしょう。",
    });
  } else if (nightFromProfile && (consecutiveDeclines >= 1 || shortStreak >= 1)) {
    alerts.push({
      id: "night_shift_load",
      kind: "night_shift_load",
      title: "夜勤負荷へのフォロー余地",
      detail:
        "夜勤プロフィールと直近の睡眠低下が重なっています。勤務リズムの確認をおすすめします。",
    });
  }

  return alerts;
}
