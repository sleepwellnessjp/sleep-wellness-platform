/**
 * Sleep Coach AI — SWIJ 独自の日次コーチ提案。
 *
 * 現時点はルールベース。将来 GPT に差し替える場合は
 * `SleepCoachGenerator` を実装して `generateSleepCoach` に渡す。
 */

import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import { localDateKey } from "@/lib/client-daily-content";
import {
  parseDurationMinutes,
  parseLeadingNumber,
} from "@/lib/soxai-graphs";

export type SleepCoachSource = "rules" | "gpt";

/** ①〜③ の日次提案（UI / API 共通契約） */
export type SleepCoachSuggestion = {
  dateKey: string;
  /** ① 今日意識すること */
  focus: string;
  /** ② 今日おすすめの行動（最大3） */
  actions: string[];
  /** ③ 今日の応援メッセージ */
  encouragement: string;
  source: SleepCoachSource;
};

/** コーチ生成に渡す観測データ（分析結果・宿題など） */
export type SleepCoachContext = {
  dateKey: string;
  /** 新しい順の分析履歴 */
  analyses: StoredAnalysis[];
  latest: StoredAnalysis | null;
  previous: StoredAnalysis | null;
  /** 宿題の継続日数 */
  streakDays: number;
  /** 宿題達成率 0–100（対象なしは null） */
  homeworkRate: number | null;
};

export type SleepCoachGenerator = (
  ctx: SleepCoachContext,
) => SleepCoachSuggestion | Promise<SleepCoachSuggestion>;

type MetricSnapshot = {
  wellnessScore: number | null;
  scoreDelta: number | null;
  sleepEfficiency: number | null;
  sleepDurationMin: number | null;
  deepSleepMin: number | null;
  sleepDebtMin: number | null;
  stress: number | null;
  hrv: number | null;
  analysisCount: number;
};

type PrioritySignal =
  | "bedtime_consistency"
  | "short_sleep"
  | "low_efficiency"
  | "low_deep_sleep"
  | "sleep_debt"
  | "high_stress"
  | "low_hrv"
  | "homework"
  | "maintain";

const SHORT_SLEEP_MIN = 6 * 60;
const LOW_EFFICIENCY = 85;
const LOW_DEEP_SLEEP_MIN = 60;
const DEBT_THRESHOLD_MIN = 45;
const HIGH_STRESS = 50;
const LOW_HRV = 30;

function dayIndex(dateKey: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}

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

function snapshotFromContext(ctx: SleepCoachContext): MetricSnapshot {
  const latest = ctx.latest;
  const previous = ctx.previous;
  const latestScore = wellnessScoreOf(latest);
  const previousScore = wellnessScoreOf(previous);

  return {
    wellnessScore: latestScore,
    scoreDelta:
      latestScore != null && previousScore != null
        ? latestScore - previousScore
        : null,
    sleepEfficiency: latest
      ? parseLeadingNumber(String(latest.metrics.sleepEfficiency ?? ""))
      : null,
    sleepDurationMin: latest
      ? parseDurationMinutes(String(latest.metrics.sleepDuration ?? ""))
      : null,
    deepSleepMin: latest
      ? parseDurationMinutes(String(latest.metrics.deepSleep ?? ""))
      : null,
    sleepDebtMin: latest
      ? parseDurationMinutes(String(latest.metrics.sleepDebt ?? ""))
      : null,
    stress: latest
      ? parseLeadingNumber(
          String(
            latest.structured?.stressAverage?.trim() ||
              latest.metrics.stress ||
              "",
          ),
        )
      : null,
    hrv: latest
      ? parseLeadingNumber(String(latest.metrics.hrv ?? ""))
      : null,
    analysisCount: ctx.analyses.length,
  };
}

function pickPrimarySignal(
  snap: MetricSnapshot,
  homeworkRate: number | null,
): PrioritySignal {
  const debtAbs =
    snap.sleepDebtMin == null ? null : Math.abs(snap.sleepDebtMin);

  if (
    snap.sleepDurationMin != null &&
    snap.sleepDurationMin < SHORT_SLEEP_MIN
  ) {
    return "short_sleep";
  }
  if (debtAbs != null && debtAbs >= DEBT_THRESHOLD_MIN) {
    return "sleep_debt";
  }
  if (
    snap.sleepEfficiency != null &&
    snap.sleepEfficiency < LOW_EFFICIENCY
  ) {
    return "low_efficiency";
  }
  if (
    snap.deepSleepMin != null &&
    snap.deepSleepMin < LOW_DEEP_SLEEP_MIN
  ) {
    return "low_deep_sleep";
  }
  if (snap.stress != null && snap.stress >= HIGH_STRESS) {
    return "high_stress";
  }
  if (snap.hrv != null && snap.hrv > 0 && snap.hrv < LOW_HRV) {
    return "low_hrv";
  }
  if (homeworkRate != null && homeworkRate < 50) {
    return "homework";
  }
  if (
    snap.scoreDelta != null &&
    Math.abs(snap.scoreDelta) < 2 &&
    snap.analysisCount >= 2
  ) {
    return "bedtime_consistency";
  }
  return "maintain";
}

const FOCUS_BY_SIGNAL: Record<PrioritySignal, string[]> = {
  bedtime_consistency: [
    "今日は睡眠時間よりも\n就寝時刻を一定にしましょう。",
    "今日は「何時に寝るか」を固定し、\nリズムを整える一日にしましょう。",
  ],
  short_sleep: [
    "今日は無理な夜更かしを避け、\n睡眠時間の確保を最優先にしましょう。",
    "今日は眠気の波を逃さず、\n早めに休息へ切り替えていきましょう。",
  ],
  sleep_debt: [
    "今日は睡眠負債を意識し、\n夜の余白を少しだけ増やしましょう。",
    "今日は追い込みすぎず、\n睡眠で返済する一日にしましょう。",
  ],
  low_efficiency: [
    "今日は寝る前の刺激を減らし、\n睡眠効率を上げることに集中しましょう。",
    "今日は入眠の質を優先し、\n寝室と就寝前の流れを整えましょう。",
  ],
  low_deep_sleep: [
    "今日は深い睡眠のために、\n夕方以降のカフェインと激しい刺激を控えましょう。",
    "今日は体温と呼吸でリラックスし、\n深い休息へつながる夜を意識しましょう。",
  ],
  high_stress: [
    "今日はスコアより心の余白を優先し、\n交感神経をゆるめることを意識しましょう。",
    "今日は「頑張る」より「ほどく」。\n短い休息をこまめに入れましょう。",
  ],
  low_hrv: [
    "今日は回復力を高めるため、\n呼吸と軽い歩行で自律神経を整えましょう。",
    "今日は負荷を少し下げ、\n回復のための余白をつくりましょう。",
  ],
  homework: [
    "今日は宿題を1つだけでも進め、\n小さな達成を積み重ねましょう。",
    "今日は完璧より継続。\n宿題のうち最も簡単な一歩から始めましょう。",
  ],
  maintain: [
    "今日は良い流れを崩さず、\n就寝前のルーティンを丁寧に守りましょう。",
    "今日は現状維持が成功。\n無理な変化より、安定したリズムを大切にしましょう。",
  ],
};

type ActionCandidate = {
  id: string;
  label: string;
  signals: PrioritySignal[];
};

const ACTION_LIBRARY: ActionCandidate[] = [
  {
    id: "sun",
    label: "朝日10分",
    signals: ["bedtime_consistency", "short_sleep", "sleep_debt", "maintain"],
  },
  {
    id: "breath36",
    label: "3:6呼吸5分",
    signals: ["high_stress", "low_hrv", "low_efficiency", "maintain"],
  },
  {
    id: "yoga7",
    label: "メラトニンヨガ™7分",
    signals: ["low_deep_sleep", "high_stress", "low_efficiency", "maintain"],
  },
  {
    id: "phone",
    label: "就寝1時間前スマホオフ",
    signals: ["low_efficiency", "bedtime_consistency", "short_sleep"],
  },
  {
    id: "bath",
    label: "就寝90分前の入浴",
    signals: ["low_deep_sleep", "low_efficiency", "sleep_debt"],
  },
  {
    id: "walk",
    label: "夕方の軽い散歩15分",
    signals: ["low_hrv", "high_stress", "short_sleep", "homework"],
  },
  {
    id: "caffeine",
    label: "午後2時以降カフェインオフ",
    signals: ["low_deep_sleep", "low_efficiency", "sleep_debt"],
  },
  {
    id: "stretch",
    label: "肩・首ストレッチ5分",
    signals: ["high_stress", "low_hrv", "homework", "maintain"],
  },
  {
    id: "bedtime",
    label: "就寝時刻を昨日と同じに",
    signals: ["bedtime_consistency", "short_sleep", "sleep_debt"],
  },
  {
    id: "homework",
    label: "今日の宿題を1つ完了",
    signals: ["homework", "maintain"],
  },
];

function pickActions(
  signal: PrioritySignal,
  dateKey: string,
): string[] {
  const preferred = ACTION_LIBRARY.filter((item) =>
    item.signals.includes(signal),
  );
  const pool = preferred.length >= 3 ? preferred : ACTION_LIBRARY;
  const start = dayIndex(dateKey, pool.length);
  const picked: ActionCandidate[] = [];
  const used = new Set<string>();

  for (let i = 0; i < pool.length && picked.length < 3; i += 1) {
    const item = pool[(start + i) % pool.length]!;
    if (used.has(item.id)) continue;
    used.add(item.id);
    picked.push(item);
  }

  // 不足時はライブラリ先頭から補完
  for (const item of ACTION_LIBRARY) {
    if (picked.length >= 3) break;
    if (used.has(item.id)) continue;
    used.add(item.id);
    picked.push(item);
  }

  return picked.map((item) => item.label);
}

function pickFocus(signal: PrioritySignal, dateKey: string): string {
  const options = FOCUS_BY_SIGNAL[signal];
  return options[dayIndex(dateKey, options.length)]!;
}

function pickEncouragement(
  snap: MetricSnapshot,
  streakDays: number,
  homeworkRate: number | null,
  dateKey: string,
): string {
  const messages: string[] = [];

  if (snap.scoreDelta != null && snap.scoreDelta >= 3) {
    const pts = Math.round(snap.scoreDelta);
    messages.push(
      `ここ最近で\nSleep Wellness Scoreは${pts}ポイント改善しています。\n\nこの調子です。`,
    );
  } else if (snap.scoreDelta != null && snap.scoreDelta <= -3) {
    messages.push(
      `スコアが少し下がっても大丈夫。\n今日の小さな行動が、回復の起点になります。`,
    );
  } else if (snap.wellnessScore != null && snap.wellnessScore >= 75) {
    messages.push(
      `Sleep Wellness Score ${Math.round(snap.wellnessScore)}。\n良い状態を保てています。今日も丁寧に。`,
    );
  }

  if (streakDays >= 3) {
    messages.push(
      `${streakDays}日連続で取り組めています。\n継続そのものが、あなたの強みです。`,
    );
  } else if (streakDays === 1) {
    messages.push(
      `今日のログインが新しい一歩。\n一日ずつ、睡眠の土台を積み上げていきましょう。`,
    );
  }

  if (homeworkRate != null && homeworkRate >= 70) {
    messages.push(
      `宿題達成率 ${Math.round(homeworkRate)}%。\n着実な積み重ねが、夜の質につながっています。`,
    );
  }

  if (snap.analysisCount >= 3) {
    messages.push(
      `分析を重ねるほど、あなた専用の\n回復パターンが見えてきます。今日も一緒に。`,
    );
  }

  if (messages.length === 0) {
    messages.push(
      `今日もマイページに来てくれてありがとうございます。\n小さな意識が、睡眠を変えていきます。`,
    );
  }

  return messages[dayIndex(dateKey, messages.length)]!;
}

/**
 * ルールベースの Sleep Coach 生成。
 * 既存分析メトリクス・宿題状況から ①②③ を組み立てる。
 */
export function generateRuleBasedSleepCoach(
  ctx: SleepCoachContext,
): SleepCoachSuggestion {
  const dateKey = ctx.dateKey || localDateKey();
  const snap = snapshotFromContext(ctx);
  const signal = pickPrimarySignal(snap, ctx.homeworkRate);

  return {
    dateKey,
    focus: pickFocus(signal, dateKey),
    actions: pickActions(signal, dateKey),
    encouragement: pickEncouragement(
      snap,
      ctx.streakDays,
      ctx.homeworkRate,
      dateKey,
    ),
    source: "rules",
  };
}

/**
 * Sleep Coach の統一エントリ。
 * 将来 GPT 実装を渡すだけで差し替え可能。
 */
export async function generateSleepCoach(
  ctx: SleepCoachContext,
  generator: SleepCoachGenerator = generateRuleBasedSleepCoach,
): Promise<SleepCoachSuggestion> {
  return generator(ctx);
}

/** 表示用の日本語日付（例: 2026年7月22日（水）） */
export function formatSleepCoachDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${y}年${m}月${d}日（${weekday}）`;
}
