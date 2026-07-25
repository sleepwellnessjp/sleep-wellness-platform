import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import { parseDurationMinutes, parseLeadingNumber } from "@/lib/soxai-graphs";

export type CompareMetricKey =
  | "sleepScore"
  | "deepSleep"
  | "hrv"
  | "sleepEfficiency"
  | "stress"
  | "sleepDuration"
  | "awakenings"
  | "sleepLatency"
  | "spo2"
  | "restingHeartRate";

/** 比較分析の主要5指標（表示優先） */
export const PRIMARY_COMPARE_KEYS: CompareMetricKey[] = [
  "sleepScore",
  "deepSleep",
  "hrv",
  "sleepEfficiency",
  "stress",
];

export type HealthTrend = "improved" | "worsened" | "unchanged";

export type CompareMetricRow = {
  key: CompareMetricKey;
  label: string;
  beforeDisplay: string;
  afterDisplay: string;
  beforeNumeric: number | null;
  afterNumeric: number | null;
  delta: number | null;
  deltaDisplay: string;
  trend: HealthTrend;
  arrow: "↑" | "↓" | "→";
  lowerIsBetter: boolean;
  unitHint: string;
};

export type OverallAssessment =
  | "大きく改善"
  | "改善"
  | "ほぼ変化なし"
  | "要注意";

export type ComparisonComments = {
  improvements: string;
  concerns: string;
  factors: string;
  nextGuidance: string;
  /** OpenAI 等の保存済み解説（あれば） */
  aiNarrative: string;
};

export type ComparisonResult = {
  before: StoredAnalysis;
  after: StoredAnalysis;
  scoreDelta: number | null;
  assessment: OverallAssessment;
  metrics: CompareMetricRow[];
  primaryMetrics: CompareMetricRow[];
  comments: ComparisonComments;
};

export type MetricTrendPoint = {
  date: string;
  value: number;
};

const METRIC_DEFS: Array<{
  key: CompareMetricKey;
  label: string;
  lowerIsBetter: boolean;
  unitHint: string;
  getValue: (analysis: StoredAnalysis) => string;
  parse: (value: string, analysis?: StoredAnalysis) => number | null;
  getNumeric: (analysis: StoredAnalysis) => number | null;
}> = [
  {
    key: "sleepScore",
    label: "睡眠スコア",
    lowerIsBetter: false,
    unitHint: "pt",
    getValue: (a) => {
      const score = a.sleepScore ?? a.wellnessScore;
      return typeof score === "number" ? String(score) : "";
    },
    parse: parseNumber,
    getNumeric: (a) => {
      const score = a.sleepScore ?? a.wellnessScore;
      return typeof score === "number" && Number.isFinite(score) ? score : null;
    },
  },
  {
    key: "deepSleep",
    label: "深睡眠",
    lowerIsBetter: false,
    unitHint: "分",
    getValue: (a) =>
      a.metrics.deepSleep?.trim() || a.metrics.deepSleepRate?.trim() || "",
    parse: (value) => parseDurationMinutes(value) ?? parsePercent(value),
    getNumeric: (a) => {
      const raw =
        a.metrics.deepSleep?.trim() || a.metrics.deepSleepRate?.trim() || "";
      return parseDurationMinutes(raw) ?? parsePercent(raw);
    },
  },
  {
    key: "hrv",
    label: "HRV",
    lowerIsBetter: false,
    unitHint: "ms",
    getValue: (a) => a.metrics.hrv,
    parse: parseNumber,
    getNumeric: (a) => parseLeadingNumber(String(a.metrics.hrv ?? "")),
  },
  {
    key: "sleepEfficiency",
    label: "睡眠効率",
    lowerIsBetter: false,
    unitHint: "%",
    getValue: (a) => a.metrics.sleepEfficiency,
    parse: parsePercent,
    getNumeric: (a) => {
      const raw = a.metrics.sleepEfficiency;
      return parsePercent(String(raw ?? ""));
    },
  },
  {
    key: "stress",
    label: "ストレス",
    lowerIsBetter: true,
    unitHint: "",
    getValue: (a) => {
      const structured = a.structured?.stressAverage?.trim();
      if (structured) return structured;
      return a.metrics.stress?.trim() || "";
    },
    parse: parseNumber,
    getNumeric: (a) => {
      const structured = a.structured?.stressAverage?.trim();
      if (structured) return parseLeadingNumber(structured);
      return parseLeadingNumber(a.metrics.stress ?? "");
    },
  },
  {
    key: "sleepDuration",
    label: "睡眠時間",
    lowerIsBetter: false,
    unitHint: "分",
    getValue: (a) => a.metrics.sleepDuration,
    parse: parseDurationMinutes,
    getNumeric: (a) => parseDurationMinutes(a.metrics.sleepDuration ?? ""),
  },
  {
    key: "awakenings",
    label: "中途覚醒",
    lowerIsBetter: true,
    unitHint: "",
    getValue: (a) =>
      a.metrics.awakenings?.trim() || a.metrics.awakeningRate?.trim() || "",
    parse: (value) => parseDurationMinutes(value) ?? parsePercent(value),
    getNumeric: (a) => {
      const raw =
        a.metrics.awakenings?.trim() || a.metrics.awakeningRate?.trim() || "";
      return parseDurationMinutes(raw) ?? parsePercent(raw);
    },
  },
  {
    key: "sleepLatency",
    label: "入眠潜時",
    lowerIsBetter: true,
    unitHint: "分",
    getValue: (a) => a.metrics.sleepLatency,
    parse: parseDurationMinutes,
    getNumeric: (a) => parseDurationMinutes(a.metrics.sleepLatency ?? ""),
  },
  {
    key: "spo2",
    label: "平均SpO₂",
    lowerIsBetter: false,
    unitHint: "%",
    getValue: (a) => a.metrics.spo2,
    parse: parsePercent,
    getNumeric: (a) => parsePercent(a.metrics.spo2 ?? ""),
  },
  {
    key: "restingHeartRate",
    label: "安静時心拍数",
    lowerIsBetter: true,
    unitHint: "bpm",
    getValue: (a) => a.metrics.restingHeartRate,
    parse: parseNumber,
    getNumeric: (a) => parseLeadingNumber(String(a.metrics.restingHeartRate ?? "")),
  },
];

function displayOrDash(value: string): string {
  return value.trim() || "—";
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parsePercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("%")) {
    return parseNumber(trimmed);
  }
  const n = parseNumber(trimmed);
  if (n == null) return null;
  if (n <= 1) return n * 100;
  return n;
}

function formatDelta(delta: number, key: CompareMetricKey): string {
  if (key === "deepSleep" || key === "sleepDuration" || key === "sleepLatency") {
    const rounded = Math.round(delta);
    if (rounded === 0) return "±0分";
    const sign = rounded > 0 ? "+" : "";
    const abs = Math.abs(rounded);
    const hours = Math.floor(abs / 60);
    const minutes = abs % 60;
    if (hours > 0 && minutes > 0) return `${sign}${hours}時間${minutes}分`;
    if (hours > 0) return `${sign}${hours}時間`;
    return `${sign}${minutes}分`;
  }

  if (key === "sleepEfficiency" || key === "spo2") {
    const rounded = Math.round(delta * 10) / 10;
    if (Math.abs(rounded) < 0.05) return "±0%";
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded}%`;
  }

  if (key === "sleepScore") {
    const rounded = Math.round(delta);
    if (rounded > 0) return `+${rounded}`;
    if (rounded < 0) return String(rounded);
    return "±0";
  }

  if (key === "stress") {
    const rounded = Math.round(delta * 10) / 10;
    if (Math.abs(rounded) < 0.05) return "±0";
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded}`;
  }

  const rounded = Math.round(delta * 10) / 10;
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return String(rounded);
  return "±0";
}

function resolveTrend(
  beforeNumeric: number | null,
  afterNumeric: number | null,
  beforeDisplay: string,
  afterDisplay: string,
  lowerIsBetter: boolean,
): { trend: HealthTrend; arrow: "↑" | "↓" | "→"; delta: number | null } {
  if (beforeNumeric != null && afterNumeric != null) {
    const delta = afterNumeric - beforeNumeric;
    const threshold =
      Math.abs(beforeNumeric) >= 50
        ? 1
        : Math.max(0.5, Math.abs(beforeNumeric) * 0.02);

    if (Math.abs(delta) <= threshold) {
      return { trend: "unchanged", arrow: "→", delta };
    }

    const improved = lowerIsBetter ? delta < 0 : delta > 0;
    return {
      trend: improved ? "improved" : "worsened",
      // 改善=↑ / 悪化=↓（lowerIsBetter でも矢印はトレンド方向ではなく改善方向）
      arrow: improved ? "↑" : "↓",
      delta,
    };
  }

  const beforeText = beforeDisplay.trim();
  const afterText = afterDisplay.trim();
  if (!beforeText || !afterText || beforeText === "—" || afterText === "—") {
    return { trend: "unchanged", arrow: "→", delta: null };
  }

  if (beforeText === afterText) {
    return { trend: "unchanged", arrow: "→", delta: null };
  }

  return { trend: "unchanged", arrow: "→", delta: null };
}

export function assessOverall(scoreDelta: number | null): OverallAssessment {
  if (scoreDelta == null) return "ほぼ変化なし";
  if (scoreDelta >= 10) return "大きく改善";
  if (scoreDelta >= 3) return "改善";
  if (scoreDelta >= -2) return "ほぼ変化なし";
  return "要注意";
}

function buildMetricRow(
  def: (typeof METRIC_DEFS)[number],
  before: StoredAnalysis,
  after: StoredAnalysis,
): CompareMetricRow {
  const beforeRaw = def.getValue(before);
  const afterRaw = def.getValue(after);
  const beforeDisplay = displayOrDash(beforeRaw);
  const afterDisplay = displayOrDash(afterRaw);
  const beforeNumeric = def.getNumeric(before);
  const afterNumeric = def.getNumeric(after);
  const { trend, arrow, delta } = resolveTrend(
    beforeNumeric,
    afterNumeric,
    beforeDisplay,
    afterDisplay,
    def.lowerIsBetter,
  );

  return {
    key: def.key,
    label: def.label,
    beforeDisplay,
    afterDisplay,
    beforeNumeric,
    afterNumeric,
    delta,
    deltaDisplay: delta != null ? formatDelta(delta, def.key) : "—",
    trend,
    arrow,
    lowerIsBetter: def.lowerIsBetter,
    unitHint: def.unitHint,
  };
}

export function buildComparison(
  before: StoredAnalysis,
  after: StoredAnalysis,
): ComparisonResult {
  const beforeScore = before.sleepScore ?? before.wellnessScore ?? null;
  const afterScore = after.sleepScore ?? after.wellnessScore ?? null;
  const scoreDelta =
    beforeScore != null && afterScore != null
      ? afterScore - beforeScore
      : null;

  const metrics = METRIC_DEFS.map((def) => buildMetricRow(def, before, after));
  const primaryMetrics = PRIMARY_COMPARE_KEYS.map(
    (key) => metrics.find((row) => row.key === key)!,
  ).filter(Boolean);

  return {
    before,
    after,
    scoreDelta,
    assessment: assessOverall(scoreDelta),
    metrics,
    primaryMetrics,
    comments: generateComments(metrics, scoreDelta, after),
  };
}

/** 時系列用（古い→新しい） */
export function buildMetricTrendSeries(
  analyses: StoredAnalysis[],
  key: CompareMetricKey,
): MetricTrendPoint[] {
  const def = METRIC_DEFS.find((item) => item.key === key);
  if (!def) return [];

  return [...analyses]
    .reverse()
    .map((analysis) => {
      const value = def.getNumeric(analysis);
      if (value == null || !Number.isFinite(value)) return null;
      return {
        date: analysis.analysisDate,
        value,
      };
    })
    .filter((point): point is MetricTrendPoint => point != null);
}

function generateComments(
  metrics: CompareMetricRow[],
  scoreDelta: number | null,
  after: StoredAnalysis,
): ComparisonComments {
  const improved = metrics.filter((m) => m.trend === "improved");
  const worsened = metrics.filter((m) => m.trend === "worsened");
  const primaryImproved = improved.filter((m) =>
    PRIMARY_COMPARE_KEYS.includes(m.key),
  );
  const primaryWorsened = worsened.filter((m) =>
    PRIMARY_COMPARE_KEYS.includes(m.key),
  );

  const improvementsParts: string[] = [];
  if (scoreDelta != null && scoreDelta > 0) {
    improvementsParts.push(
      `睡眠スコアは前回比 ${scoreDelta} ポイント改善しています。`,
    );
  } else if (scoreDelta != null && scoreDelta === 0) {
    improvementsParts.push("睡眠スコアは前回と同水準を維持しています。");
  }

  if (primaryImproved.length > 0) {
    const details = primaryImproved
      .slice(0, 4)
      .map((m) => `${m.label}（${m.deltaDisplay}）`)
      .join("、");
    improvementsParts.push(`特に${details}の改善が見られます。`);
  } else if (improved.length > 0) {
    improvementsParts.push(
      `特に${improved
        .slice(0, 3)
        .map((m) => m.label)
        .join("・")}の改善が見られます。`,
    );
  }

  if (improvementsParts.length === 0) {
    improvementsParts.push(
      "大きな数値改善は限定的ですが、継続的な記録により変化の兆候を捉えやすくなります。",
    );
  }

  const concernParts: string[] = [];
  if (scoreDelta != null && scoreDelta < -2) {
    concernParts.push(
      `睡眠スコアは前回比 ${Math.abs(scoreDelta)} ポイント低下しています。`,
    );
  }
  if (primaryWorsened.length > 0) {
    const details = primaryWorsened
      .slice(0, 4)
      .map((m) => `${m.label}（${m.deltaDisplay}）`)
      .join("、");
    concernParts.push(`${details}に注意が必要です。`);
  } else if (worsened.length > 0) {
    concernParts.push(
      `${worsened
        .slice(0, 3)
        .map((m) => m.label)
        .join("・")}に注意が必要です。`,
    );
  }
  if (concernParts.length === 0) {
    concernParts.push(
      "現時点で大きな悪化指標は限定的です。引き続き推移を確認しましょう。",
    );
  }

  const factorParts: string[] = [];
  if (scoreDelta != null && scoreDelta >= 3) {
    factorParts.push(
      "メラトニンヨガ™や生活リズムの調整、入浴・照明の見直しなどが寄与している可能性があります。",
    );
  }
  if (improved.some((m) => m.key === "deepSleep")) {
    factorParts.push(
      "深睡眠の増加は、就寝前の切り替えや回復習慣の効果が表れている可能性があります。",
    );
  }
  if (improved.some((m) => m.key === "hrv")) {
    factorParts.push(
      "HRVの改善は、自律神経の回復と日中の負荷マネジメントが効いている可能性があります。",
    );
  }
  if (improved.some((m) => m.key === "stress")) {
    factorParts.push(
      "ストレス指標の低下は、就寝前ルーティンや呼吸・ヨガ習慣の継続効果が考えられます。",
    );
  }
  if (improved.some((m) => m.key === "sleepEfficiency")) {
    factorParts.push(
      "睡眠効率の向上は、入眠環境の整備と中途覚醒の減少が寄与している可能性があります。",
    );
  }
  if (factorParts.length === 0) {
    factorParts.push(
      "運動量、食事・飲酒・カフェインのタイミング、仕事ストレスなど生活背景の変化も確認するとよいでしょう。",
    );
  }

  const guidanceParts: string[] = [];
  if (worsened.some((m) => m.key === "stress")) {
    guidanceParts.push(
      "ストレス負荷が高い場合は、就寝90分前から刺激を下げ、短い呼吸法またはメラトニンヨガ™を優先してください。",
    );
  }
  if (worsened.some((m) => m.key === "hrv" || m.key === "restingHeartRate")) {
    guidanceParts.push(
      "回復指標の維持のため、過度な夜間作業を避け、日中の軽い運動と休息のバランスを整えましょう。",
    );
  }
  if (worsened.some((m) => m.key === "deepSleep")) {
    guidanceParts.push(
      "深睡眠を意識し、就寝前のスクリーン時間短縮と体温を下げる入浴タイミングを見直してください。",
    );
  }
  if (worsened.some((m) => m.key === "sleepEfficiency" || m.key === "sleepScore")) {
    guidanceParts.push(
      "次回までに睡眠時間の確保と、就寝・起床時刻の一定化を最優先で整えてください。",
    );
  }
  if (scoreDelta != null && scoreDelta >= 10) {
    guidanceParts.push(
      "改善傾向を維持するため、現在の良い習慣を固定化し、週次で同じ条件の分析を続けましょう。",
    );
  } else if (guidanceParts.length === 0) {
    guidanceParts.push(
      "次回分析までに、就寝・起床時刻の記録と就寝前ルーティンの継続をおすすめします。",
    );
  }

  const aiNarrative =
    after.result?.comparisonNarrative?.vsPrevious?.trim() ||
    after.result?.scoreComment?.trim() ||
    "";

  return {
    improvements: improvementsParts.join(""),
    concerns: concernParts.join(""),
    factors: factorParts.slice(0, 2).join(""),
    nextGuidance: guidanceParts.slice(0, 2).join(""),
    aiNarrative,
  };
}

export function analysisOptionLabel(analysis: StoredAnalysis): string {
  const date = analysis.analysisDate;
  const score = analysis.sleepScore ?? analysis.wellnessScore;
  const scoreText = typeof score === "number" ? String(score) : "—";
  return `${date} · スコア ${scoreText}`;
}

export function getScoreFromAnalysis(analysis: StoredAnalysis): number | null {
  const score = analysis.sleepScore ?? analysis.wellnessScore;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

export function assessmentStyle(assessment: OverallAssessment): {
  bg: string;
  color: string;
  border: string;
} {
  switch (assessment) {
    case "大きく改善":
      return {
        bg: "rgba(37, 99, 235, 0.08)",
        color: "#2563eb",
        border: "rgba(37, 99, 235, 0.28)",
      };
    case "改善":
      return {
        bg: "rgba(37, 99, 235, 0.07)",
        color: "#2563eb",
        border: "rgba(37, 99, 235, 0.24)",
      };
    case "要注意":
      return {
        bg: "rgba(220, 38, 38, 0.07)",
        color: "#dc2626",
        border: "rgba(220, 38, 38, 0.26)",
      };
    default:
      return {
        bg: "rgba(138, 106, 45, 0.08)",
        color: "#8a6a2d",
        border: "rgba(138, 106, 45, 0.28)",
      };
  }
}

/** 改善=青 / 悪化=赤 / 変化なし=ゴールド */
export function trendColor(trend: HealthTrend): string {
  if (trend === "improved") return "#2563eb";
  if (trend === "worsened") return "#dc2626";
  return "#8a6a2d";
}

export function metricLabel(key: CompareMetricKey): string {
  return METRIC_DEFS.find((item) => item.key === key)?.label ?? key;
}

export function metricDefLabel(key: CompareMetricKey): string {
  return metricLabel(key);
}
