import type { StoredAnalysis } from "@/lib/repositories/client-repository";

export type CompareMetricKey =
  | "sleepScore"
  | "sleepDuration"
  | "sleepEfficiency"
  | "deepSleep"
  | "awakenings"
  | "sleepLatency"
  | "spo2"
  | "hrv"
  | "restingHeartRate";

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
};

export type ComparisonResult = {
  before: StoredAnalysis;
  after: StoredAnalysis;
  scoreDelta: number | null;
  assessment: OverallAssessment;
  metrics: CompareMetricRow[];
  comments: ComparisonComments;
};

const METRIC_DEFS: Array<{
  key: CompareMetricKey;
  label: string;
  lowerIsBetter: boolean;
  getValue: (analysis: StoredAnalysis) => string;
  parse: (value: string) => number | null;
}> = [
  {
    key: "sleepScore",
    label: "睡眠スコア",
    lowerIsBetter: false,
    getValue: (a) => {
      const score = a.sleepScore ?? a.wellnessScore;
      return typeof score === "number" ? String(score) : "";
    },
    parse: parseNumber,
  },
  {
    key: "sleepDuration",
    label: "睡眠時間",
    lowerIsBetter: false,
    getValue: (a) => a.metrics.sleepDuration,
    parse: parseDurationMinutes,
  },
  {
    key: "sleepEfficiency",
    label: "睡眠効率",
    lowerIsBetter: false,
    getValue: (a) => a.metrics.sleepEfficiency,
    parse: parsePercent,
  },
  {
    key: "deepSleep",
    label: "深睡眠",
    lowerIsBetter: false,
    getValue: (a) =>
      a.metrics.deepSleep?.trim() ||
      a.metrics.deepSleepRate?.trim() ||
      "",
    parse: (value) => parseDurationMinutes(value) ?? parsePercent(value),
  },
  {
    key: "awakenings",
    label: "中途覚醒",
    lowerIsBetter: true,
    getValue: (a) =>
      a.metrics.awakenings?.trim() ||
      a.metrics.awakeningRate?.trim() ||
      "",
    parse: (value) => parseDurationMinutes(value) ?? parsePercent(value),
  },
  {
    key: "sleepLatency",
    label: "入眠潜時",
    lowerIsBetter: true,
    getValue: (a) => a.metrics.sleepLatency,
    parse: parseDurationMinutes,
  },
  {
    key: "spo2",
    label: "平均SpO₂",
    lowerIsBetter: false,
    getValue: (a) => a.metrics.spo2,
    parse: parsePercent,
  },
  {
    key: "hrv",
    label: "HRV",
    lowerIsBetter: false,
    getValue: (a) => a.metrics.hrv,
    parse: parseNumber,
  },
  {
    key: "restingHeartRate",
    label: "安静時心拍数",
    lowerIsBetter: true,
    getValue: (a) => a.metrics.restingHeartRate,
    parse: parseNumber,
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

  const hourMinEn = trimmed.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (hourMinEn) {
    return Number(hourMinEn[1]) * 60 + Number(hourMinEn[2]);
  }

  const colon = trimmed.match(/^(\d+):(\d+)$/);
  if (colon) {
    return Number(colon[1]) * 60 + Number(colon[2]);
  }

  return null;
}

function formatDelta(delta: number, key: CompareMetricKey): string {
  const rounded =
    key === "sleepScore" || key === "spo2" || key === "sleepEfficiency"
      ? Math.round(delta)
      : Math.round(delta * 10) / 10;

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
      Math.abs(beforeNumeric) >= 50 ? 1 : Math.max(0.5, Math.abs(beforeNumeric) * 0.02);

    if (Math.abs(delta) <= threshold) {
      return { trend: "unchanged", arrow: "→", delta };
    }

    const improved = lowerIsBetter ? delta < 0 : delta > 0;
    return {
      trend: improved ? "improved" : "worsened",
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

export function buildComparison(
  before: StoredAnalysis,
  after: StoredAnalysis,
): ComparisonResult {
  const beforeScore =
    before.sleepScore ?? before.wellnessScore ?? null;
  const afterScore = after.sleepScore ?? after.wellnessScore ?? null;
  const scoreDelta =
    beforeScore != null && afterScore != null
      ? afterScore - beforeScore
      : null;

  const metrics = METRIC_DEFS.map((def) => {
    const beforeRaw = def.getValue(before);
    const afterRaw = def.getValue(after);
    const beforeDisplay = displayOrDash(beforeRaw);
    const afterDisplay = displayOrDash(afterRaw);
    const beforeNumeric = def.parse(beforeRaw);
    const afterNumeric = def.parse(afterRaw);
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
      deltaDisplay:
        delta != null ? formatDelta(delta, def.key) : "—",
      trend,
      arrow,
      lowerIsBetter: def.lowerIsBetter,
    };
  });

  return {
    before,
    after,
    scoreDelta,
    assessment: assessOverall(scoreDelta),
    metrics,
    comments: generateComments(metrics, scoreDelta),
  };
}

function metricLabel(key: CompareMetricKey): string {
  return METRIC_DEFS.find((item) => item.key === key)?.label ?? key;
}

function generateComments(
  metrics: CompareMetricRow[],
  scoreDelta: number | null,
): ComparisonComments {
  const improved = metrics.filter((m) => m.trend === "improved");
  const worsened = metrics.filter((m) => m.trend === "worsened");

  const improvementsParts: string[] = [];
  if (scoreDelta != null && scoreDelta > 0) {
    improvementsParts.push(
      `睡眠スコアは${scoreDelta}ポイント改善しています。`,
    );
  } else if (scoreDelta != null && scoreDelta === 0) {
    improvementsParts.push("睡眠スコアは前回と同水準を維持しています。");
  }

  if (improved.length > 0) {
    const names = improved.slice(0, 3).map((m) => m.label);
    improvementsParts.push(
      `特に${names.join("・")}の改善が見られます。`,
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
      `睡眠スコアは${Math.abs(scoreDelta)}ポイント低下しています。`,
    );
  }
  if (worsened.length > 0) {
    const names = worsened.slice(0, 3).map((m) => m.label);
    concernParts.push(`${names.join("・")}に注意が必要です。`);
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
    factorParts.push("深睡眠の増加は、就寝前の切り替えや回復習慣の効果が表れている可能性があります。");
  }
  if (improved.some((m) => m.key === "awakenings" || m.key === "sleepLatency")) {
    factorParts.push("中途覚醒や入眠潜時の改善は、ストレス管理や就寝前ルーティンの効果が考えられます。");
  }
  if (factorParts.length === 0) {
    factorParts.push(
      "運動量、食事・飲酒・カフェインのタイミング、仕事ストレスなど生活背景の変化も確認するとよいでしょう。",
    );
  }

  const guidanceParts: string[] = [];
  if (worsened.some((m) => m.key === "sleepLatency" || m.key === "awakenings")) {
    guidanceParts.push(
      "就寝90分前から照明と刺激を下げ、短い呼吸法またはメラトニンヨガ™を継続してください。",
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
  if (scoreDelta != null && scoreDelta >= 10) {
    guidanceParts.push(
      "改善傾向を維持するため、現在の良い習慣を固定化し、週次で同じ条件の分析を続けましょう。",
    );
  } else if (scoreDelta != null && scoreDelta <= -3) {
    guidanceParts.push(
      "次回までに睡眠時間の確保と、就寝・起床時刻の一定化を最優先で整えてください。",
    );
  } else {
    guidanceParts.push(
      "次回分析までに、就寝・起床時刻の記録と就寝前ルーティンの継続をおすすめします。",
    );
  }

  return {
    improvements: improvementsParts.join(""),
    concerns: concernParts.join(""),
    factors: factorParts.slice(0, 2).join(""),
    nextGuidance: guidanceParts.slice(0, 2).join(""),
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
        bg: "rgba(15, 107, 92, 0.08)",
        color: "#0f6b5c",
        border: "rgba(15, 107, 92, 0.25)",
      };
    case "改善":
      return {
        bg: "rgba(49, 95, 104, 0.08)",
        color: "#315f68",
        border: "rgba(49, 95, 104, 0.25)",
      };
    case "要注意":
      return {
        bg: "rgba(163, 58, 58, 0.07)",
        color: "#a33a3a",
        border: "rgba(163, 58, 58, 0.26)",
      };
    default:
      return {
        bg: "rgba(138, 106, 45, 0.08)",
        color: "#8a6a2d",
        border: "rgba(138, 106, 45, 0.28)",
      };
  }
}

export function trendColor(trend: HealthTrend): string {
  if (trend === "improved") return "#0f6b5c";
  if (trend === "worsened") return "#a33a3a";
  return "#8a6a2d";
}

export { metricLabel };
