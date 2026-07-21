import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  parseDurationMinutes,
  parseHHMM,
  parseLeadingNumber,
  parsePercent,
} from "@/lib/soxai-graphs";

export type TrendPeriod = 7 | 30 | 90 | "all";

export type TrendMetricId =
  | "sleepScore"
  | "sleepDuration"
  | "sleepEfficiency"
  | "deepSleep"
  | "deepSleepRate"
  | "remSleep"
  | "remSleepRate"
  | "awakenings"
  | "awakeningRate"
  | "sleepLatency"
  | "sleepDebt"
  | "spo2"
  | "hrv"
  | "restingHeartRate"
  | "respiratoryRate"
  | "skinTemperature"
  | "stress"
  | "bedtime"
  | "wakeTime"
  | "circadianRhythm";

export type TrendMetricDef = {
  id: TrendMetricId;
  label: string;
  /** 低い方が良い指標 */
  lowerIsBetter?: boolean;
  /** 時刻系（分換算でプロット） */
  isTime?: boolean;
  /** 文字列のみ（数値化不可） */
  textOnly?: boolean;
};

export const TREND_METRICS: TrendMetricDef[] = [
  { id: "sleepScore", label: "睡眠スコア" },
  { id: "sleepDuration", label: "睡眠時間" },
  { id: "sleepEfficiency", label: "睡眠効率" },
  { id: "deepSleep", label: "深い睡眠時間" },
  { id: "deepSleepRate", label: "深い睡眠率" },
  { id: "remSleep", label: "REM睡眠時間" },
  { id: "remSleepRate", label: "REM睡眠率" },
  { id: "awakenings", label: "覚醒時間", lowerIsBetter: true },
  { id: "awakeningRate", label: "覚醒率", lowerIsBetter: true },
  { id: "sleepLatency", label: "入眠潜時", lowerIsBetter: true },
  { id: "sleepDebt", label: "睡眠負債", lowerIsBetter: true },
  { id: "spo2", label: "平均SpO₂" },
  { id: "hrv", label: "HRV" },
  { id: "restingHeartRate", label: "安静時心拍数", lowerIsBetter: true },
  { id: "respiratoryRate", label: "呼吸速度", lowerIsBetter: true },
  { id: "skinTemperature", label: "皮膚温度" },
  { id: "stress", label: "ストレス", lowerIsBetter: true },
  { id: "bedtime", label: "入眠時刻", isTime: true },
  { id: "wakeTime", label: "起床時刻", isTime: true },
  { id: "circadianRhythm", label: "体内時計", textOnly: true },
];

export type TrendPoint = {
  date: string;
  value: number | null;
  display: string;
};

export type TrendStats = {
  latest: string;
  average: string;
  previousDelta: string;
  min: string;
  max: string;
  dataPointCount: number;
};

export type TrendCommentary = {
  improving: string[];
  worsening: string[];
  stable: string[];
  priorities: string[];
  melatoninYoga: string;
};

function metricRawValue(
  analysis: StoredAnalysis,
  metricId: TrendMetricId,
): string {
  const structured = analysis.structured;
  if (structured) {
    if (metricId === "bedtime" && structured.sleepOnsetTime) {
      return structured.sleepOnsetTime;
    }
    if (metricId === "wakeTime" && structured.wakeTime) {
      return structured.wakeTime;
    }
    if (metricId === "skinTemperature" && structured.skinTemperatureValue) {
      const sign =
        structured.skinTemperatureType === "delta" &&
        !/^[+-]/.test(structured.skinTemperatureValue)
          ? "+"
          : "";
      return `${sign}${structured.skinTemperatureValue}${structured.skinTemperatureUnit || "℃"}`;
    }
    if (metricId === "stress" && structured.stressAverage) {
      return structured.stressLevel
        ? `${structured.stressAverage}（${structured.stressLevel}）`
        : structured.stressAverage;
    }
  }

  const m = analysis.metrics;
  if (metricId === "sleepScore") {
    const score = analysis.sleepScore ?? m.sleepScore;
    return score != null ? String(score) : "";
  }
  const v = m[metricId];
  return typeof v === "string" ? v.trim() : "";
}

export function parseMetricNumeric(
  metricId: TrendMetricId,
  raw: string,
): number | null {
  if (!raw) return null;
  if (metricId === "sleepDuration" || metricId === "deepSleep" || metricId === "remSleep" || metricId === "awakenings" || metricId === "sleepLatency" || metricId === "sleepDebt") {
    return parseDurationMinutes(raw);
  }
  if (metricId.endsWith("Rate") || metricId === "sleepEfficiency" || metricId === "spo2") {
    return parsePercent(raw);
  }
  if (metricId === "bedtime" || metricId === "wakeTime") {
    return parseHHMM(raw);
  }
  if (metricId === "skinTemperature") {
    const delta = raw.match(/^([+-])\s*(\d+(?:\.\d+)?)/);
    if (delta) {
      const sign = delta[1] === "-" ? -1 : 1;
      return sign * Number(delta[2]);
    }
    return parseLeadingNumber(raw);
  }
  return parseLeadingNumber(raw);
}

export function filterAnalysesByPeriod(
  analyses: StoredAnalysis[],
  period: TrendPeriod,
): StoredAnalysis[] {
  const sorted = [...analyses].sort((a, b) =>
    a.analysisDate.localeCompare(b.analysisDate),
  );
  if (period === "all" || sorted.length === 0) return sorted;

  const latest = sorted[sorted.length - 1]!;
  const latestDate = new Date(`${latest.analysisDate}T12:00:00`);
  const cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - period);

  return sorted.filter(
    (a) => new Date(`${a.analysisDate}T12:00:00`) >= cutoff,
  );
}

export function buildTrendSeries(
  analyses: StoredAnalysis[],
  metricId: TrendMetricId,
): TrendPoint[] {
  const def = TREND_METRICS.find((m) => m.id === metricId);
  if (!def) return [];

  return [...analyses]
    .sort((a, b) => a.analysisDate.localeCompare(b.analysisDate))
    .map((analysis) => {
      const raw = metricRawValue(analysis, metricId);
      if (!raw) {
        return { date: analysis.analysisDate, value: null, display: "データ未取得" };
      }
      if (def.textOnly) {
        return { date: analysis.analysisDate, value: null, display: raw };
      }
      const value = parseMetricNumeric(metricId, raw);
      return {
        date: analysis.analysisDate,
        value,
        display: raw,
      };
    });
}

function formatDelta(
  metricId: TrendMetricId,
  delta: number,
  def: TrendMetricDef,
): string {
  if (metricId === "bedtime" || metricId === "wakeTime") {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${Math.round(delta)}分`;
  }
  if (
    metricId.endsWith("Rate") ||
    metricId === "sleepEfficiency" ||
    metricId === "spo2"
  ) {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)}%`;
  }
  if (metricId === "sleepDuration" || metricId === "deepSleep" || metricId === "remSleep") {
    const sign = delta >= 0 ? "+" : "";
    const h = Math.floor(Math.abs(delta) / 60);
    const m = Math.round(Math.abs(delta) % 60);
    return `${sign}${h > 0 ? `${h}時間` : ""}${m}分`;
  }
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${Math.round(delta * 10) / 10}`;
}

export function computeTrendStats(
  series: TrendPoint[],
  metricId: TrendMetricId,
): TrendStats {
  const def = TREND_METRICS.find((m) => m.id === metricId)!;
  const numeric = series.filter((p) => p.value != null) as Array<
    TrendPoint & { value: number }
  >;

  if (numeric.length === 0) {
    return {
      latest: "データ未取得",
      average: "—",
      previousDelta: "—",
      min: "—",
      max: "—",
      dataPointCount: 0,
    };
  }

  const values = numeric.map((p) => p.value);
  const latestPoint = numeric[numeric.length - 1]!;
  const prevPoint = numeric.length >= 2 ? numeric[numeric.length - 2]! : null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  let previousDelta = "—";
  if (prevPoint) {
    previousDelta = formatDelta(
      metricId,
      latestPoint.value - prevPoint.value,
      def,
    );
  }

  return {
    latest: latestPoint.display,
    average:
      def.textOnly
        ? "—"
        : metricId === "bedtime" || metricId === "wakeTime"
          ? `${String(Math.floor(avg / 60)).padStart(2, "0")}:${String(Math.round(avg % 60)).padStart(2, "0")}`
          : String(Math.round(avg * 10) / 10),
    previousDelta,
    min:
      def.textOnly
        ? "—"
        : String(Math.round(min * 10) / 10),
    max:
      def.textOnly
        ? "—"
        : String(Math.round(max * 10) / 10),
    dataPointCount: numeric.length,
  };
}

function trendDirection(
  values: number[],
  lowerIsBetter: boolean,
): "improving" | "worsening" | "stable" {
  if (values.length < 2) return "stable";
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  if (first.length === 0 || second.length === 0) return "stable";

  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
  const change = avgSecond - avgFirst;
  const threshold =
    Math.abs(avgFirst) > 0 ? Math.abs(avgFirst) * 0.05 : 1;

  if (Math.abs(change) < threshold) return "stable";
  const improved = lowerIsBetter ? change < 0 : change > 0;
  return improved ? "improving" : "worsening";
}

export function buildTrendCommentary(
  analyses: StoredAnalysis[],
  period: TrendPeriod,
): TrendCommentary {
  const filtered = filterAnalysesByPeriod(analyses, period);
  const improving: string[] = [];
  const worsening: string[] = [];
  const stable: string[] = [];
  const priorities: string[] = [];

  const trackIds: TrendMetricId[] = [
    "sleepScore",
    "sleepEfficiency",
    "deepSleepRate",
    "hrv",
    "stress",
    "sleepLatency",
    "awakenings",
    "spo2",
  ];

  for (const metricId of trackIds) {
    const def = TREND_METRICS.find((m) => m.id === metricId)!;
    const series = buildTrendSeries(filtered, metricId);
    const numeric = series
      .map((p) => p.value)
      .filter((v): v is number => v != null);
    if (numeric.length < 2) continue;

    const dir = trendDirection(numeric, Boolean(def.lowerIsBetter));
    const label = def.label;
    if (dir === "improving") {
      improving.push(
        `${label}は期間の後半で改善傾向が見られ、継続確認が望ましい可能性があります。`,
      );
    } else if (dir === "worsening") {
      worsening.push(
        `${label}は期間の後半で悪化傾向が見られ、生活リズムの見直し余地がある可能性があります。`,
      );
      priorities.push(label);
    } else {
      stable.push(
        `${label}は大きな変化が少なく、現状維持の傾向と考えられます。`,
      );
    }
  }

  const latest = filtered[filtered.length - 1];
  let melatoninYoga =
    "現時点では、睡眠データの推移をもう少し確認しながら、就寝前のリラックス習慣を整える余地がある可能性があります。";

  if (latest) {
    const stress = parseLeadingNumber(latest.metrics.stress);
    const latency = parseDurationMinutes(latest.metrics.sleepLatency);
    const hrvSeries = buildTrendSeries(filtered, "hrv")
      .map((p) => p.value)
      .filter((v): v is number => v != null);

    const stressHigh = stress != null && stress >= 55;
    const latencyHigh = latency != null && latency >= 25;
    const hrvDeclining =
      hrvSeries.length >= 2 &&
      trendDirection(hrvSeries, false) === "worsening";

    if (stressHigh || latencyHigh || hrvDeclining) {
      melatoninYoga =
        "ストレス・入眠潜時・HRVのいずれかに課題が見られるため、就寝前のメラトニンヨガ™で呼吸と副交感神経を整えることが、睡眠の切り替えを助ける可能性があります。単日データでの断定は避け、数日〜2週間の推移を見ながら継続確認してください。";
    }
  }

  if (priorities.length === 0 && worsening.length > 0) {
    priorities.push("睡眠効率", "ストレス");
  }

  return {
    improving: improving.slice(0, 4),
    worsening: worsening.slice(0, 4),
    stable: stable.slice(0, 3),
    priorities: priorities.slice(0, 3),
    melatoninYoga,
  };
}
