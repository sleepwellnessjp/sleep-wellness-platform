/**
 * 夜間グルコース「読み取り」文 — AIではなくルールで組み立てる。
 * 閾値は GLUCOSE_READING_THRESHOLDS に集約（あとから調整可能）。
 *
 * 覚醒時間は睡眠ステージの覚醒（metrics.awakenings / awakeningRate）を使う。
 * 体内時計（circadianRhythm）とは別指標なので混同しない。
 */

import type { NightGlucoseStats } from "@/lib/glucose/night-glucose-stats";
import { NIGHT_GLUCOSE_COVERAGE_WARN_RATIO } from "@/lib/glucose/night-glucose-stats";
import { formatMinutesAsDuration } from "@/lib/soxai-display-normalize";

function formatGlucoseClockTokyo(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** 読み取りルールの閾値（1か所で管理） */
export const GLUCOSE_READING_THRESHOLDS = {
  /** (a) 夜全体の安定度：ゆるやかな変動の上限（これ以下＝安定） */
  rangeStableMaxMgDl: 20,
  /** (a) 変化が大きいとみなす変動幅 */
  rangeLargeMinMgDl: 41,
  /** (b) 60分以内の目立つ上昇・下降 */
  swingMgDl: 15,
  /** (b) 目立つ動きを探す時間窓（分） */
  swingWindowMinutes: 60,
  /** (b) 起床前のゆるやかな上昇とみなす、直前帯でのピーク−谷 */
  preWakeRiseMgDl: 10,
  /** (b) 起床前帯の長さ（時間） */
  preWakeHours: 2,
  /** (b) 入眠直後が高め：入眠後1時間平均 − 夜全体平均 */
  earlySleepElevatedDeltaMgDl: 15,
  /** (b) 入眠直後帯の長さ（時間） */
  earlySleepHours: 1,
  /** (c) 覚醒が「長め」とみなす分数（睡眠ステージの覚醒時間） */
  awakeLongMinutes: 30,
  /** (c) 覚醒が「長め」とみなす覚醒率（%） */
  awakeLongRatePercent: 10,
  /** (d) 入眠後の最初の記録が遅れたとみなす分数 */
  onsetGapMinutes: 30,
  /** (d) 取得率がこれ未満なら参考程度のみ */
  coverageWarnRatio: NIGHT_GLUCOSE_COVERAGE_WARN_RATIO,
} as const;

export type GlucoseReadingPoint = {
  recordedAtIso: string;
  glucoseMgDl: number;
};

export type GlucoseReadingFlags = {
  earlySleepElevated: boolean;
  sparseCoverage: boolean;
  onsetRecordingGap: boolean;
  preWakeRise: boolean;
  stableNight: boolean;
  awakeLong: boolean;
};

export type GlucoseReadingResult = {
  /** 2〜4文（該当分のみ）。順序は (a)→(b)→(c)→(d) */
  sentences: string[];
  /** 表示用に結合した本文 */
  text: string;
  flags: GlucoseReadingFlags;
};

function historicSorted(points: GlucoseReadingPoint[]): GlucoseReadingPoint[] {
  return points
    .filter((p) => Number.isFinite(p.glucoseMgDl))
    .slice()
    .sort((a, b) => a.recordedAtIso.localeCompare(b.recordedAtIso));
}

type Swing = {
  fromIso: string;
  toIso: string;
  delta: number;
};

function findNotableSwings(
  points: GlucoseReadingPoint[],
  windowMs: number,
  swingMgDl: number,
): Swing[] {
  const swings: Swing[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const aMs = Date.parse(a.recordedAtIso);
    for (let j = i + 1; j < points.length; j += 1) {
      const b = points[j]!;
      const bMs = Date.parse(b.recordedAtIso);
      if (bMs - aMs > windowMs) break;
      const delta = b.glucoseMgDl - a.glucoseMgDl;
      if (Math.abs(delta) >= swingMgDl) {
        swings.push({
          fromIso: a.recordedAtIso,
          toIso: b.recordedAtIso,
          delta,
        });
      }
    }
  }
  swings.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return swings;
}

function resolveAwakeDisplay(
  awakeDisplay: string | null | undefined,
  awakeMinutes: number | null | undefined,
): string | null {
  if (typeof awakeMinutes === "number" && Number.isFinite(awakeMinutes)) {
    const formatted = formatMinutesAsDuration(awakeMinutes);
    if (formatted) return formatted;
  }
  const raw = awakeDisplay?.trim();
  if (!raw) return null;
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return `${Number(hm[1])}:${hm[2]}`;
  return raw;
}

function isAwakeLong(options: {
  awakeMinutes?: number | null;
  awakeRatePercent?: number | null;
}): boolean {
  const T = GLUCOSE_READING_THRESHOLDS;
  const { awakeMinutes = null, awakeRatePercent = null } = options;
  if (
    typeof awakeMinutes === "number" &&
    Number.isFinite(awakeMinutes) &&
    awakeMinutes >= T.awakeLongMinutes
  ) {
    return true;
  }
  if (
    typeof awakeRatePercent === "number" &&
    Number.isFinite(awakeRatePercent) &&
    awakeRatePercent >= T.awakeLongRatePercent
  ) {
    return true;
  }
  return false;
}

/** (a)(b)(c)(d) から最大4文。各観点を1文ずつ優先し、余りは (b)→(a)→(c)→(d) で補充 */
function pickOrderedSentences(
  a: string[],
  b: string[],
  c: string[],
  d: string[],
  max = 4,
): string[] {
  const picked: string[] = [];
  const tryPush = (s: string | undefined) => {
    if (!s || picked.length >= max) return;
    if (picked.includes(s)) return;
    picked.push(s);
  };
  tryPush(a[0]);
  tryPush(b[0]);
  tryPush(c[0]);
  tryPush(d[0]);
  for (const s of [...b.slice(1), ...a.slice(1), ...c.slice(1), ...d.slice(1)]) {
    tryPush(s);
  }
  return picked;
}

/**
 * 夜間帯 historic 点と統計から読み取り文を組み立てる。
 * 覚醒は睡眠ステージ由来（awakeMinutes / awakeRatePercent）のみ。
 */
export function buildNightGlucoseReading(options: {
  stats: NightGlucoseStats;
  /** 夜間帯内の historic 点（血糖値あり） */
  points: GlucoseReadingPoint[];
  /** 睡眠ステージの覚醒時間（分）。体内時計ではない */
  awakeMinutes?: number | null;
  /** 睡眠ステージの覚醒率（%）。例: 17 */
  awakeRatePercent?: number | null;
  /** 表示用（例: "1:26"）。なければ分から整形 */
  awakeDisplay?: string | null;
}): GlucoseReadingResult {
  const T = GLUCOSE_READING_THRESHOLDS;
  const {
    stats,
    awakeMinutes = null,
    awakeRatePercent = null,
    awakeDisplay = null,
  } = options;
  const points = historicSorted(options.points);

  const sparseCoverage = stats.coverageRatio < T.coverageWarnRatio;
  const onsetGapMs =
    Date.parse(stats.firstRecordedAtIso) -
    Date.parse(stats.window.startAtIso);
  const onsetRecordingGap =
    Number.isFinite(onsetGapMs) &&
    onsetGapMs >= T.onsetGapMinutes * 60_000;
  const awakeLong = isAwakeLong({ awakeMinutes, awakeRatePercent });
  const awakeLabel = resolveAwakeDisplay(awakeDisplay, awakeMinutes);

  const flags: GlucoseReadingFlags = {
    earlySleepElevated: false,
    sparseCoverage,
    onsetRecordingGap,
    preWakeRise: false,
    stableNight: stats.rangeMgDl <= T.rangeStableMaxMgDl,
    awakeLong,
  };

  const sentencesD: string[] = [];
  if (onsetRecordingGap) {
    sentencesD.push(
      "入眠直後の記録が欠けているため、夕食の影響は今回は読み取れません。次回は就寝前にスキャンしておくと確認できます",
    );
  }

  // 取得率不足時は (d) のみ
  if (sparseCoverage) {
    sentencesD.push("記録が少ないため、今回は参考程度にご覧ください");
    const picked = sentencesD.slice(0, 4);
    return {
      sentences: picked,
      text: picked.length ? `${picked.join("。")}。` : "",
      flags,
    };
  }

  // —— (a) 夜全体の安定度 ——
  const sentencesA: string[] = [];
  if (stats.rangeMgDl <= T.rangeStableMaxMgDl) {
    sentencesA.push("夜のあいだ大きな上下はなく安定していました");
  } else if (stats.rangeMgDl >= T.rangeLargeMinMgDl) {
    const peakClock = formatGlucoseClockTokyo(stats.max.recordedAtIso);
    sentencesA.push(
      `夜のあいだに変化の大きい時間帯がありました（${peakClock}ごろ）`,
    );
  } else {
    sentencesA.push("夜のあいだにゆるやかな変動がありました");
  }

  // —— (b) 目立つ動き / 起床前 / 入眠直後 ——
  const sentencesB: string[] = [];
  const windowMs = T.swingWindowMinutes * 60_000;
  const swings = findNotableSwings(points, windowMs, T.swingMgDl);
  const endMs = Date.parse(stats.window.endAtIso);
  const startMs = Date.parse(stats.window.startAtIso);
  const preWakeStartMs = endMs - T.preWakeHours * 3600_000;
  const earlyEndMs = startMs + T.earlySleepHours * 3600_000;

  const preWakePoints = points.filter((p) => {
    const t = Date.parse(p.recordedAtIso);
    return t >= preWakeStartMs && t <= endMs;
  });
  if (preWakePoints.length >= 2) {
    const vals = preWakePoints.map((p) => p.glucoseMgDl);
    const trough = Math.min(...vals);
    const peak = Math.max(...vals);
    const troughIso = preWakePoints.find((p) => p.glucoseMgDl === trough)!
      .recordedAtIso;
    const peakIso = preWakePoints.find((p) => p.glucoseMgDl === peak)!
      .recordedAtIso;
    if (
      peak - trough >= T.preWakeRiseMgDl &&
      Date.parse(peakIso) >= Date.parse(troughIso)
    ) {
      flags.preWakeRise = true;
      sentencesB.push(
        "起床前にゆるやかに上がっており、朝に向けて体が目覚めの準備を始める動きとして見られるものです",
      );
    }
  }

  if (!flags.preWakeRise && swings.length > 0) {
    const top = swings[0]!;
    const clock = formatGlucoseClockTokyo(top.toIso);
    const kind = top.delta > 0 ? "上がり" : "下がり";
    sentencesB.push(`${clock}ごろに一時的な${kind}が見られました`);
  } else if (!flags.preWakeRise) {
    const outside = swings.find((s) => Date.parse(s.toIso) < preWakeStartMs);
    if (outside) {
      const clock = formatGlucoseClockTokyo(outside.toIso);
      const kind = outside.delta > 0 ? "上がり" : "下がり";
      sentencesB.push(`${clock}ごろに一時的な${kind}が見られました`);
    }
  }

  const earlyPoints = points.filter((p) => {
    const t = Date.parse(p.recordedAtIso);
    return t >= startMs && t <= earlyEndMs;
  });
  if (earlyPoints.length > 0) {
    const earlyAvg =
      earlyPoints.reduce((sum, p) => sum + p.glucoseMgDl, 0) /
      earlyPoints.length;
    if (earlyAvg - stats.averageMgDl >= T.earlySleepElevatedDeltaMgDl) {
      flags.earlySleepElevated = true;
      sentencesB.push(
        "入眠直後が高めでした。夕食や就寝前の飲食の時間を振り返ってみてください",
      );
    }
  }

  // —— (c) 睡眠との関係 ——
  const sentencesC: string[] = [];
  if (flags.stableNight && awakeLong) {
    sentencesC.push(
      awakeLabel
        ? `今回の覚醒時間（${awakeLabel}）はグルコースの変動とは結びつきにくく、寝室環境など他の要因から見直すのがよさそうです`
        : "今回の覚醒はグルコースの変動とは結びつきにくく、寝室環境など他の要因から見直すのがよさそうです",
    );
  } else if (
    stats.rangeMgDl > T.rangeStableMaxMgDl ||
    flags.preWakeRise ||
    swings.length > 0
  ) {
    sentencesC.push(
      awakeLabel
        ? `今回の覚醒時間（${awakeLabel}）について、変化が見られた時間帯に目が覚めた感覚があったか振り返ってみてください`
        : "変化が見られた時間帯に、目が覚めた感覚があったか振り返ってみてください",
    );
  }

  const picked = pickOrderedSentences(
    sentencesA,
    sentencesB,
    sentencesC,
    sentencesD,
    4,
  );

  return {
    sentences: picked,
    text: picked.length ? `${picked.join("。")}。` : "",
    flags,
  };
}

export const EARLY_SLEEP_DINNER_TIP =
  "夕食を就寝の3時間前までに済ませる";
