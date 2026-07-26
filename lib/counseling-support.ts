/**
 * AIカウンセリング支援 — 良好な点 / 改善が必要な点 / 考えられる要因 / 質問候補
 *
 * 断定・改善提案の混同を避け、データ根拠のある短文だけを返す。
 */

import {
  formatDurationDisplay,
  formatMinutesAsDuration,
  formatPercentDisplay,
} from "@/lib/soxai-display-normalize";
import { parseDurationMinutes, parseLeadingNumber } from "@/lib/soxai-graphs";

export type CounselingSupportSections = {
  goodPoints: string[];
  needsImprovement: string[];
  possibleFactors: string[];
  questionCandidates: string[];
};

export type CounselingSupportLifestyle = {
  caffeine?: string | null;
  caffeineTime?: string | null;
  caffeineDone?: string | null;
  alcohol?: string | null;
  alcoholDrank?: string | null;
  alcoholEndTime?: string | null;
  alcoholAmount?: string | null;
  preBedBehavior?: string | null;
  notes?: string | null;
  stress?: string | null;
  dinner?: string | null;
  dinnerTime?: string | null;
  dinnerContent?: string | null;
  bathing?: string | null;
  condition?: string | null;
  work?: string | null;
};

export type CounselingSupportMetrics = {
  sleepScore?: number | null;
  deepSleep?: string | null;
  remSleep?: string | null;
  sleepEfficiency?: string | null;
  sleepLatency?: string | null;
  sleepDebt?: string | null;
  awakenings?: string | null;
  hrv?: string | null;
  restingHeartRate?: string | null;
  sleepDuration?: string | null;
  stress?: string | null;
};

export type CounselingSupportInput = {
  metrics: CounselingSupportMetrics;
  previousMetrics?: CounselingSupportMetrics | null;
  lifestyle?: CounselingSupportLifestyle | null;
  /** 本人の過去 HRV（基準範囲判定用） */
  previousHrvValues?: number[] | null;
  /** 本人の過去安静時心拍（基準範囲判定用） */
  previousRhrValues?: number[] | null;
};

const DEEP_GOOD_MIN = 75;
const REM_GOOD_MIN = 90;
const EFFICIENCY_GOOD = 85;
const EFFICIENCY_ATTENTION = 82;
const LATENCY_ATTENTION_MIN = 30;
const DEBT_ATTENTION_MIN = 45;
const AWAKENING_DURATION_ATTENTION = 40;
const AWAKENING_COUNT_ATTENTION = 3;
const DURATION_SHORT_MIN = 6 * 60;
const INSTRUCTOR_CONFIRM =
  "原因はデータだけでは特定できないため、講師による確認が必要です";

type MetricSnap = {
  deepMin: number | null;
  remMin: number | null;
  efficiency: number | null;
  latencyMin: number | null;
  debtMin: number | null;
  awakeningMin: number | null;
  awakeningCount: number | null;
  awakeningRaw: string;
  hrv: number | null;
  rhr: number | null;
  durationMin: number | null;
  stress: number | null;
};

function textOrEmpty(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function hasMeaningfulText(value: string | null | undefined): boolean {
  const t = textOrEmpty(value);
  if (!t) return false;
  return !/^(なし|無し|ない|未入力|不明|none|no|n\/a|-|ー|−)$/i.test(t);
}

function snapFromMetrics(
  metrics: CounselingSupportMetrics | null | undefined,
): MetricSnap {
  const m = metrics ?? {};
  const awakenings = textOrEmpty(m.awakenings);
  const countMatch = awakenings.match(/(\d+)\s*回/);
  return {
    deepMin: m.deepSleep ? parseDurationMinutes(m.deepSleep) : null,
    remMin: m.remSleep ? parseDurationMinutes(m.remSleep) : null,
    efficiency: m.sleepEfficiency
      ? parseLeadingNumber(m.sleepEfficiency)
      : null,
    latencyMin: m.sleepLatency ? parseDurationMinutes(m.sleepLatency) : null,
    debtMin: m.sleepDebt ? parseDurationMinutes(m.sleepDebt) : null,
    awakeningMin: awakenings ? parseDurationMinutes(awakenings) : null,
    awakeningCount: countMatch ? Number(countMatch[1]) : null,
    awakeningRaw: awakenings,
    hrv: m.hrv ? parseLeadingNumber(m.hrv) : null,
    rhr: m.restingHeartRate
      ? parseLeadingNumber(m.restingHeartRate)
      : null,
    durationMin: m.sleepDuration
      ? parseDurationMinutes(m.sleepDuration)
      : null,
    stress: m.stress ? parseLeadingNumber(m.stress) : null,
  };
}

function displayDuration(raw: string | null | undefined, minutes: number | null): string {
  if (raw?.trim()) {
    const formatted = formatDurationDisplay(raw);
    if (formatted) return formatted;
  }
  if (minutes != null) return formatMinutesAsDuration(Math.abs(minutes));
  return "";
}

function displayPercent(raw: string | null | undefined, value: number | null): string {
  if (raw?.trim()) {
    const formatted = formatPercentDisplay(raw);
    if (formatted) return formatted;
  }
  if (value != null) return `${Math.round(value)}%`;
  return "";
}

function personalRange(
  values: number[] | null | undefined,
): { min: number; max: number } | null {
  if (!values || values.length < 2) return null;
  const nums = values.filter((n) => Number.isFinite(n));
  if (nums.length < 2) return null;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance =
    nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  const std = Math.sqrt(variance);
  const pad = Math.max(3, std * 1.25);
  return { min: mean - pad, max: mean + pad };
}

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function lifestyleBlob(lifestyle: CounselingSupportLifestyle | null | undefined): string {
  if (!lifestyle) return "";
  return [
    lifestyle.caffeine,
    lifestyle.caffeineTime,
    lifestyle.caffeineDone,
    lifestyle.alcohol,
    lifestyle.alcoholDrank,
    lifestyle.alcoholEndTime,
    lifestyle.alcoholAmount,
    lifestyle.preBedBehavior,
    lifestyle.notes,
    lifestyle.stress,
    lifestyle.dinner,
    lifestyle.dinnerTime,
    lifestyle.dinnerContent,
    lifestyle.bathing,
    lifestyle.condition,
    lifestyle.work,
  ]
    .map((v) => textOrEmpty(v))
    .filter(Boolean)
    .join(" ");
}

function hasLifestyleInput(
  lifestyle: CounselingSupportLifestyle | null | undefined,
): boolean {
  if (!lifestyle) return false;
  return [
    lifestyle.caffeine,
    lifestyle.caffeineTime,
    lifestyle.caffeineDone,
    lifestyle.alcohol,
    lifestyle.alcoholDrank,
    lifestyle.alcoholEndTime,
    lifestyle.preBedBehavior,
    lifestyle.notes,
    lifestyle.stress,
    lifestyle.dinner,
    lifestyle.dinnerTime,
    lifestyle.dinnerContent,
    lifestyle.bathing,
    lifestyle.condition,
    lifestyle.work,
  ].some((v) => hasMeaningfulText(v));
}

function isNegativeOrNone(text: string): boolean {
  return includesAny(text, [
    "なし",
    "無し",
    "ない",
    "しません",
    "しなかった",
    "未実施",
    "飲んでいない",
    "摂取なし",
    "none",
    "no",
  ]);
}

function isAfternoonOrEveningCaffeine(lifestyle: CounselingSupportLifestyle): boolean {
  const blob = [
    lifestyle.caffeine,
    lifestyle.caffeineTime,
    lifestyle.caffeineDone,
    lifestyle.notes,
  ]
    .map((v) => textOrEmpty(v))
    .join(" ");
  if (!blob || isNegativeOrNone(blob)) return false;
  if (
    includesAny(blob, [
      "夕方",
      "夜",
      "午後",
      "15時",
      "16時",
      "17時",
      "18時",
      "19時",
      "20時",
      "21時",
      "22時",
      "pm",
    ])
  ) {
    return true;
  }
  // 時間帯不明でも「摂取あり」なら入眠への可能性として扱う
  return hasMeaningfulText(lifestyle.caffeine) || lifestyle.caffeineDone === "yes";
}

function hasPhoneOrScreenUse(lifestyle: CounselingSupportLifestyle): boolean {
  const blob = lifestyleBlob(lifestyle);
  return includesAny(blob, [
    "スマホ",
    "スマートフォン",
    "画面",
    "SNS",
    "動画",
    "テレビ",
    "ゲーム",
  ]);
}

function hasAlcoholIntake(lifestyle: CounselingSupportLifestyle): boolean {
  const blob = [
    lifestyle.alcohol,
    lifestyle.alcoholDrank,
    lifestyle.alcoholEndTime,
    lifestyle.alcoholAmount,
  ]
    .map((v) => textOrEmpty(v))
    .join(" ");
  if (!blob || isNegativeOrNone(blob)) return false;
  if (lifestyle.alcoholDrank === "yes") return true;
  return hasMeaningfulText(lifestyle.alcohol) || hasMeaningfulText(lifestyle.alcoholEndTime);
}

function hasLateDinner(lifestyle: CounselingSupportLifestyle): boolean {
  const blob = [
    lifestyle.dinner,
    lifestyle.dinnerTime,
    lifestyle.dinnerContent,
    lifestyle.notes,
  ]
    .map((v) => textOrEmpty(v))
    .join(" ");
  if (!blob) return false;
  return includesAny(blob, [
    "遅",
    "夜遅く",
    "21:",
    "22:",
    "23:",
    "0:",
    "21時",
    "22時",
    "23時",
  ]);
}

function hasElevatedStressLifestyle(lifestyle: CounselingSupportLifestyle): boolean {
  const blob = [lifestyle.stress, lifestyle.work, lifestyle.condition, lifestyle.notes]
    .map((v) => textOrEmpty(v))
    .join(" ");
  return includesAny(blob, [
    "ストレス",
    "緊張",
    "忙しい",
    "過労",
    "残業",
    "プレッシャー",
    "不安",
  ]);
}

function buildGoodPoints(
  current: MetricSnap,
  previous: MetricSnap | null,
  metrics: CounselingSupportMetrics,
  hrvRange: { min: number; max: number } | null,
  rhrRange: { min: number; max: number } | null,
): string[] {
  const points: string[] = [];
  const hasPrev = previous != null;

  if (current.deepMin != null && current.deepMin >= DEEP_GOOD_MIN) {
    const label = displayDuration(metrics.deepSleep, current.deepMin);
    if (
      hasPrev &&
      previous.deepMin != null &&
      current.deepMin > previous.deepMin + 5
    ) {
      points.push(`深い睡眠は前回より改善し、${label}確保されています`);
    } else {
      points.push(`深い睡眠が${label}確保されています`);
    }
  }

  if (current.remMin != null && current.remMin >= REM_GOOD_MIN) {
    const label = displayDuration(metrics.remSleep, current.remMin);
    if (
      hasPrev &&
      previous.remMin != null &&
      current.remMin > previous.remMin + 5
    ) {
      points.push(`REM睡眠は前回より改善し、${label}確保されています`);
    } else {
      points.push(`REM睡眠が${label}確保されています`);
    }
  }

  if (current.efficiency != null && current.efficiency >= EFFICIENCY_GOOD) {
    const label = displayPercent(metrics.sleepEfficiency, current.efficiency);
    if (
      hasPrev &&
      previous.efficiency != null &&
      current.efficiency > previous.efficiency + 1
    ) {
      points.push(`睡眠効率は前回より改善し、${label}です`);
    } else {
      points.push(`睡眠効率は${label}です`);
    }
  }

  if (
    current.hrv != null &&
    hrvRange &&
    current.hrv >= hrvRange.min &&
    current.hrv <= hrvRange.max
  ) {
    points.push("HRVは本人の基準範囲内です");
  }

  if (
    current.rhr != null &&
    rhrRange &&
    current.rhr >= rhrRange.min &&
    current.rhr <= rhrRange.max
  ) {
    points.push("安静時心拍数は本人の基準範囲内です");
  }

  if (
    current.durationMin != null &&
    current.durationMin >= 7 * 60 &&
    current.durationMin <= 9 * 60
  ) {
    const label = displayDuration(metrics.sleepDuration, current.durationMin);
    if (
      hasPrev &&
      previous.durationMin != null &&
      current.durationMin > previous.durationMin + 15
    ) {
      points.push(`睡眠時間は前回より改善し、${label}です`);
    } else {
      points.push(`睡眠時間は${label}です`);
    }
  }

  if (
    current.latencyMin != null &&
    current.latencyMin > 0 &&
    current.latencyMin <= 20
  ) {
    const label = displayDuration(metrics.sleepLatency, current.latencyMin);
    points.push(`入眠潜時は${label}です`);
  }

  if (
    (current.awakeningCount != null && current.awakeningCount <= 1) ||
    (current.awakeningMin != null &&
      current.awakeningMin > 0 &&
      current.awakeningMin <= 20 &&
      current.awakeningCount == null)
  ) {
    if (current.awakeningCount != null) {
      points.push(`中途覚醒は${current.awakeningCount}回です`);
    } else if (current.awakeningMin != null) {
      const label = displayDuration(metrics.awakenings, current.awakeningMin);
      points.push(`中途覚醒時間は${label}です`);
    }
  }

  return points.slice(0, 5);
}

function buildNeedsImprovement(
  current: MetricSnap,
  previous: MetricSnap | null,
  metrics: CounselingSupportMetrics,
  hrvRange: { min: number; max: number } | null,
  rhrRange: { min: number; max: number } | null,
): string[] {
  const points: string[] = [];
  const hasPrev = previous != null;

  if (current.latencyMin != null && current.latencyMin >= LATENCY_ATTENTION_MIN) {
    const label = displayDuration(metrics.sleepLatency, current.latencyMin);
    points.push(`入眠潜時が${label}と長めです`);
  }

  if (current.debtMin != null && Math.abs(current.debtMin) >= DEBT_ATTENTION_MIN) {
    const label = displayDuration(metrics.sleepDebt, current.debtMin);
    points.push(`睡眠負債が${label}あります`);
  }

  const awakeningBusy =
    (current.awakeningCount != null &&
      current.awakeningCount >= AWAKENING_COUNT_ATTENTION) ||
    (current.awakeningMin != null &&
      current.awakeningMin >= AWAKENING_DURATION_ATTENTION);
  if (awakeningBusy) {
    if (
      current.awakeningCount != null &&
      current.awakeningMin != null &&
      current.awakeningMin > 0
    ) {
      const label = displayDuration(metrics.awakenings, current.awakeningMin);
      points.push(
        `中途覚醒が${current.awakeningCount}回・${label}と多めです`,
      );
    } else if (current.awakeningCount != null) {
      points.push(`中途覚醒が${current.awakeningCount}回と多めです`);
    } else if (current.awakeningMin != null) {
      const label = displayDuration(metrics.awakenings, current.awakeningMin);
      points.push(`中途覚醒時間が${label}と長めです`);
    }
  }

  if (
    current.efficiency != null &&
    current.efficiency < EFFICIENCY_ATTENTION
  ) {
    const label = displayPercent(metrics.sleepEfficiency, current.efficiency);
    if (
      hasPrev &&
      previous.efficiency != null &&
      current.efficiency < previous.efficiency - 1
    ) {
      points.push(`睡眠効率が前回より低下し、${label}です`);
    } else {
      points.push(`睡眠効率が${label}と低めです`);
    }
  }

  if (current.deepMin != null && current.deepMin < 55) {
    const label = displayDuration(metrics.deepSleep, current.deepMin);
    points.push(`深い睡眠が${label}と短めです`);
  }

  if (current.remMin != null && current.remMin < 70) {
    const label = displayDuration(metrics.remSleep, current.remMin);
    points.push(`REM睡眠が${label}と短めです`);
  }

  if (
    current.durationMin != null &&
    current.durationMin > 0 &&
    current.durationMin < DURATION_SHORT_MIN
  ) {
    const label = displayDuration(metrics.sleepDuration, current.durationMin);
    points.push(`睡眠時間が${label}と短めです`);
  }

  if (
    current.hrv != null &&
    hrvRange &&
    (current.hrv < hrvRange.min || current.hrv > hrvRange.max)
  ) {
    points.push(
      `HRV（${Math.round(current.hrv)}）が本人の基準範囲から外れています`,
    );
  }

  if (
    current.rhr != null &&
    rhrRange &&
    (current.rhr < rhrRange.min || current.rhr > rhrRange.max)
  ) {
    points.push(
      `安静時心拍数（${Math.round(current.rhr)}bpm）が本人の基準範囲から外れています`,
    );
  }

  return points.slice(0, 5);
}

function buildPossibleFactors(
  current: MetricSnap,
  needsImprovement: string[],
  lifestyle: CounselingSupportLifestyle | null | undefined,
): string[] {
  if (needsImprovement.length === 0) {
    return [];
  }

  if (!hasLifestyleInput(lifestyle)) {
    return [INSTRUCTOR_CONFIRM];
  }

  const factors: string[] = [];
  const ls = lifestyle!;
  const latencyIssue = needsImprovement.some((p) => p.includes("入眠潜時"));
  const deepIssue = needsImprovement.some((p) => p.includes("深い睡眠"));
  const awakeningIssue = needsImprovement.some((p) => p.includes("中途覚醒"));
  const efficiencyIssue = needsImprovement.some((p) => p.includes("睡眠効率"));
  const hrvIssue = needsImprovement.some((p) => p.includes("HRV"));

  if (latencyIssue && hasPhoneOrScreenUse(ls)) {
    factors.push(
      "就寝前のスマートフォン利用が、入眠の遅れに関係している可能性があります",
    );
  }

  if (latencyIssue && isAfternoonOrEveningCaffeine(ls)) {
    factors.push(
      "夕方以降のカフェイン摂取が、入眠に影響した可能性があります",
    );
  }

  if ((deepIssue || awakeningIssue || efficiencyIssue) && hasAlcoholIntake(ls)) {
    factors.push(
      "飲酒が、深い睡眠や中途覚醒に影響した可能性が考えられます",
    );
  }

  if ((latencyIssue || efficiencyIssue) && hasLateDinner(ls)) {
    factors.push(
      "遅い夕食が、入眠や睡眠の連続性に関係している可能性があります",
    );
  }

  if (
    (hrvIssue ||
      needsImprovement.some((p) => p.includes("安静時心拍")) ||
      current.stress != null && current.stress >= 55) &&
    hasElevatedStressLifestyle(ls)
  ) {
    factors.push(
      "日中の緊張や仕事負荷が、回復指標に影響した可能性が考えられます",
    );
  }

  if (factors.length === 0) {
    factors.push(INSTRUCTOR_CONFIRM);
  } else if (!factors.some((f) => f.includes("講師による確認"))) {
    factors.push(INSTRUCTOR_CONFIRM);
  }

  return factors.slice(0, 4);
}

function buildQuestions(
  needsImprovement: string[],
  possibleFactors: string[],
): string[] {
  const questions: string[] = [];

  for (const point of needsImprovement) {
    if (point.includes("入眠潜時") && questions.length < 4) {
      questions.push("昨夜、床に就いてから眠るまでに何をしていましたか？");
    } else if (point.includes("睡眠負債") && questions.length < 4) {
      questions.push("平日と休日で、睡眠時間にどのくらい差がありますか？");
    } else if (point.includes("中途覚醒") && questions.length < 4) {
      questions.push("夜中に目が覚めたとき、何か心当たりはありますか？");
    } else if (point.includes("睡眠効率") && questions.length < 4) {
      questions.push("就床時刻と、実際に眠気を感じる時刻はずれていますか？");
    } else if (point.includes("深い睡眠") && questions.length < 4) {
      questions.push("夕食や入浴の時刻は、いつもと比べてどうでしたか？");
    } else if (point.includes("REM") && questions.length < 4) {
      questions.push("起床・就寝時刻のばらつきはどのくらいありますか？");
    } else if (
      (point.includes("HRV") || point.includes("安静時心拍")) &&
      questions.length < 4
    ) {
      questions.push("最近、負荷の高い予定や緊張が続く場面はありましたか？");
    } else if (point.includes("睡眠時間") && questions.length < 4) {
      questions.push("就寝を前倒しできそうな余白はありますか？");
    }
  }

  for (const factor of possibleFactors) {
    if (factor.includes("スマートフォン") && questions.length < 4) {
      questions.push("就寝前のスマートフォン利用は、だいたい何分くらいですか？");
    } else if (factor.includes("カフェイン") && questions.length < 4) {
      questions.push("午後以降に飲んだカフェインの種類と時刻を教えてください。");
    } else if (factor.includes("飲酒") && questions.length < 4) {
      questions.push("飲酒の量と、終了時刻の実感を教えてください。");
    } else if (factor.includes("夕食") && questions.length < 4) {
      questions.push("夕食を終えた時刻は、就寝の何時間前くらいでしたか？");
    } else if (factor.includes("緊張") && questions.length < 4) {
      questions.push("日中いちばん緊張が高まる時間帯はいつですか？");
    }
  }

  if (questions.length === 0 && needsImprovement.length > 0) {
    questions.push("今回のデータで気になる点について、体感と一致しますか？");
    questions.push("講師として、優先して確認したい生活場面はどこですか？");
  }

  return [...new Set(questions)].slice(0, 4);
}

/**
 * カウンセリング支援の4見出し分をルールベースで生成する。
 */
export function buildCounselingSupport(
  input: CounselingSupportInput,
): CounselingSupportSections {
  const metrics = input.metrics ?? {};
  const current = snapFromMetrics(metrics);
  const previous = input.previousMetrics
    ? snapFromMetrics(input.previousMetrics)
    : null;

  const hrvFromPrev = (input.previousHrvValues ?? []).filter((n) =>
    Number.isFinite(n),
  );
  if (previous?.hrv != null) hrvFromPrev.push(previous.hrv);
  const rhrFromPrev = (input.previousRhrValues ?? []).filter((n) =>
    Number.isFinite(n),
  );
  if (previous?.rhr != null) rhrFromPrev.push(previous.rhr);

  const hrvRange = personalRange(hrvFromPrev);
  const rhrRange = personalRange(rhrFromPrev);

  const goodPoints = buildGoodPoints(
    current,
    previous,
    metrics,
    hrvRange,
    rhrRange,
  );
  const needsImprovement = buildNeedsImprovement(
    current,
    previous,
    metrics,
    hrvRange,
    rhrRange,
  );
  const possibleFactors = buildPossibleFactors(
    current,
    needsImprovement,
    input.lifestyle,
  );
  const questionCandidates = buildQuestions(needsImprovement, possibleFactors);

  return {
    goodPoints,
    needsImprovement,
    possibleFactors,
    questionCandidates,
  };
}

/** InstructorCounselingPlan / flatten 用プレフィックス */
export function flattenCounselingSupport(
  sections: CounselingSupportSections,
): string[] {
  return [
    ...sections.goodPoints.map((item) => `良好な点：${item}`),
    ...sections.needsImprovement.map((item) => `改善が必要な点：${item}`),
    ...sections.possibleFactors.map((item) => `考えられる要因：${item}`),
    ...sections.questionCandidates.map((item) => `質問候補：${item}`),
  ].slice(0, 16);
}
