/**
 * A4 カウンセリングレポート（2ページ）専用の掲載文。
 * 分析ロジックは変更しない。取得できた指標だけを選び、クライアント向けに整える。
 */

import type { AnalysisResult } from "@/lib/analysis-session";
import {
  computeSleepStageSummary,
  parseDurationMinutes,
  parsePercent,
} from "@/lib/soxai-graphs";
import type { AnalysisMetrics, MetricFieldKey } from "@/lib/soxai-metrics";
import {
  evaluateMetric,
  metricGuideline,
} from "@/lib/report-metric-guide";
import {
  buildClientWellnessReport,
  buildMelatoninYogaPrescription,
  type LifestyleSnapshot,
  type MelatoninYogaPrescription,
} from "@/lib/wellness-client-report";

export type CounselingKeyMetric = {
  label: string;
  value: string;
  key?: MetricFieldKey;
  guide: string;
  starsLabel?: string;
  evalLabel?: string;
};

export type CounselingStageBar = {
  id: "awake" | "rem" | "light" | "deep";
  label: string;
  valueText: string;
  percent: number;
  color: string;
};

export type CounselingExpertPoint = {
  index: string;
  title: string;
  body: string;
};

export type CounselingAction = {
  rank: number;
  what: string;
  why: string;
};

export type CounselingReportContent = {
  overallComment: string;
  keyMetrics: CounselingKeyMetric[];
  analysisGuideMetrics: CounselingKeyMetric[];
  stages: CounselingStageBar[];
  goodPoints: string[];
  attentionPoints: string[];
  expertPoints: CounselingExpertPoint[];
  lifestyleConnection: string;
  actions: CounselingAction[];
  nextSteps: string[];
  melatoninYoga: MelatoninYogaPrescription;
};

const MISSING = /^(未測定|取得できず|データなし|要確認|--|—|－|-|n\/a|na)$/i;

const STAGE_COLORS = {
  awake: "#8a6a2d",
  rem: "#0f6b5c",
  light: "#b89242",
  deep: "#315f68",
} as const;

export function hasMeasuredValue(
  value: string | number | null | undefined,
): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (value == null) return false;
  const text = String(value).trim();
  if (!text) return false;
  return !MISSING.test(text);
}

function displayMeasured(
  value: string | number | null | undefined,
): string | null {
  if (!hasMeasuredValue(value)) return null;
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

function stripReportNoise(text: string): string {
  return text
    .replace(/認定講師[^.。！？]*[.。！？]?/g, "")
    .replace(/未測定|取得できず|データなし/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clampSentences(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const parts = trimmed.match(/[^.!?。！？]+[.!?。！？]?/g);
  if (!parts || parts.length <= max) return trimmed;
  return parts.slice(0, max).join("").trim();
}

function toClientLine(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (/[。．!?！？]$/.test(t)) return t;
  return `${t}。`;
}

function num(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!hasMeasuredValue(value)) return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

type KeyMetricDef = {
  label: string;
  key?: MetricFieldKey;
  pick: (metrics: AnalysisMetrics) => string | number | null | undefined;
};

const KEY_METRIC_PRIORITY: KeyMetricDef[] = [
  { label: "睡眠時間", key: "sleepDuration", pick: (m) => m.sleepDuration },
  { label: "睡眠効率", key: "sleepEfficiency", pick: (m) => m.sleepEfficiency },
  { label: "入眠時刻", key: "bedtime", pick: (m) => m.bedtime },
  { label: "覚醒時間", key: "awakenings", pick: (m) => m.awakenings },
  { label: "レム睡眠", key: "remSleep", pick: (m) => m.remSleep },
  { label: "深い睡眠", key: "deepSleep", pick: (m) => m.deepSleep },
  { label: "安静時心拍", key: "restingHeartRate", pick: (m) => m.restingHeartRate },
  { label: "HRV", key: "hrv", pick: (m) => m.hrv },
];

const KEY_METRIC_FILL: KeyMetricDef[] = [
  { label: "入眠潜時", key: "sleepLatency", pick: (m) => m.sleepLatency },
  { label: "起床時刻", key: "wakeTime", pick: (m) => m.wakeTime },
  { label: "呼吸数", key: "respiratoryRate", pick: (m) => m.respiratoryRate },
  { label: "ストレス", key: "stress", pick: (m) => m.stress },
  { label: "皮膚温", key: "skinTemperature", pick: (m) => m.skinTemperature },
  { label: "QoL", pick: (m) => m.qol },
  { label: "体調", pick: (m) => m.conditionScore },
];

/** 分析ページ「睡眠指標＋バイオシグナル」のうち、カウンセリングで参照する一般指標 */
const ANALYSIS_PAGE_METRICS: KeyMetricDef[] = [
  { label: "睡眠スコア", key: "sleepScore", pick: (m) => m.sleepScore },
  { label: "睡眠時間", key: "sleepDuration", pick: (m) => m.sleepDuration },
  { label: "入眠時間", key: "bedtime", pick: (m) => m.bedtime },
  { label: "起床時間", key: "wakeTime", pick: (m) => m.wakeTime },
  { label: "睡眠効率", key: "sleepEfficiency", pick: (m) => m.sleepEfficiency },
  { label: "睡眠負債", key: "sleepDebt", pick: (m) => m.sleepDebt },
  { label: "入眠潜時", key: "sleepLatency", pick: (m) => m.sleepLatency },
  { label: "体内時計", key: "circadianRhythm", pick: (m) => m.circadianRhythm },
  { label: "呼吸速度", key: "respiratoryRate", pick: (m) => m.respiratoryRate },
  { label: "平均SpO₂", key: "spo2", pick: (m) => m.spo2 },
];

function enrichMetric(
  metrics: AnalysisMetrics,
  item: KeyMetricDef,
  value: string,
): CounselingKeyMetric {
  const evaluation = item.key ? evaluateMetric(item.key, metrics) : null;
  const guide = item.key ? metricGuideline(item.key) : "";
  return {
    label: item.label,
    value,
    key: item.key,
    guide,
    starsLabel: evaluation?.starsLabel,
    evalLabel: evaluation?.label,
  };
}

function buildKeyMetrics(metrics: AnalysisMetrics): CounselingKeyMetric[] {
  const rows: CounselingKeyMetric[] = [];
  const seen = new Set<string>();
  for (const item of [...KEY_METRIC_PRIORITY, ...KEY_METRIC_FILL]) {
    if (seen.has(item.label)) continue;
    const value = displayMeasured(item.pick(metrics));
    if (!value) continue;
    seen.add(item.label);
    rows.push(enrichMetric(metrics, item, value));
    if (rows.length >= 8) break;
  }
  return rows;
}

function buildAnalysisGuideMetrics(
  metrics: AnalysisMetrics,
  keyMetrics: CounselingKeyMetric[],
): CounselingKeyMetric[] {
  const usedKeys = new Set(
    keyMetrics.map((item) => item.key).filter(Boolean) as MetricFieldKey[],
  );
  const rows: CounselingKeyMetric[] = [];
  for (const item of ANALYSIS_PAGE_METRICS) {
    if (item.key && usedKeys.has(item.key)) continue;
    const value = displayMeasured(item.pick(metrics));
    if (!value) continue;
    if (item.key) usedKeys.add(item.key);
    rows.push(enrichMetric(metrics, item, value));
    if (rows.length >= 8) break;
  }
  return rows;
}

function buildStages(metrics: AnalysisMetrics): CounselingStageBar[] {
  const summary = computeSleepStageSummary(metrics);
  const candidates: Array<{
    id: CounselingStageBar["id"];
    label: string;
    present: boolean;
    valueText: string;
    percent: number | null;
  }> = [
    {
      id: "awake",
      label: "覚醒",
      present:
        hasMeasuredValue(metrics.awakenings) ||
        hasMeasuredValue(metrics.awakeningRate),
      valueText:
        displayMeasured(metrics.awakenings) ||
        displayMeasured(metrics.awakeningRate) ||
        "",
      percent: parsePercent(metrics.awakeningRate),
    },
    {
      id: "rem",
      label: "レム",
      present:
        hasMeasuredValue(metrics.remSleep) ||
        hasMeasuredValue(metrics.remSleepRate),
      valueText: summary.rem.combined !== "未測定" ? summary.rem.combined : "",
      percent: summary.rem.percent,
    },
    {
      id: "light",
      label: "浅い睡眠",
      present:
        hasMeasuredValue(metrics.lightSleep) ||
        hasMeasuredValue(metrics.lightSleepRate),
      valueText:
        summary.light.combined !== "未測定" ? summary.light.combined : "",
      percent: summary.light.percent,
    },
    {
      id: "deep",
      label: "深い睡眠",
      present:
        hasMeasuredValue(metrics.deepSleep) ||
        hasMeasuredValue(metrics.deepSleepRate),
      valueText: summary.deep.combined !== "未測定" ? summary.deep.combined : "",
      percent: summary.deep.percent,
    },
  ];

  const present = candidates.filter(
    (item) => item.present && (item.valueText || item.percent != null),
  );
  if (present.length < 2) return [];

  const percentSum = present.reduce(
    (sum, item) => sum + (item.percent ?? 0),
    0,
  );
  const minuteWeights = present.map((item) => {
    if (item.id === "awake") return parseDurationMinutes(metrics.awakenings) ?? 0;
    if (item.id === "rem") return parseDurationMinutes(metrics.remSleep) ?? 0;
    if (item.id === "light") return parseDurationMinutes(metrics.lightSleep) ?? 0;
    return parseDurationMinutes(metrics.deepSleep) ?? 0;
  });
  const minuteSum = minuteWeights.reduce((sum, n) => sum + n, 0);

  return present.map((item, index) => {
    let percent = item.percent ?? 0;
    if (percentSum >= 40) {
      percent = ((item.percent ?? 0) / percentSum) * 100;
    } else if (minuteSum > 0) {
      percent = (minuteWeights[index]! / minuteSum) * 100;
    } else {
      percent = 100 / present.length;
    }
    return {
      id: item.id,
      label: item.label,
      valueText: item.valueText || `${Math.round(percent)}%`,
      percent,
      color: STAGE_COLORS[item.id],
    };
  });
}

function buildExpertPoints(result: AnalysisResult): CounselingExpertPoint[] {
  const metrics = result.metrics;
  const drafted: Array<{ title: string; body: string }> = [];

  const duration = displayMeasured(metrics.sleepDuration);
  if (duration) {
    const min = parseDurationMinutes(metrics.sleepDuration);
    let body = `今回の睡眠時間は${duration}でした。`;
    if (min != null && min < 360) {
      body +=
        "一般的な目安より短めのため、回復の土台を厚くする余地があります。";
    } else if (min != null && min >= 420 && min <= 540) {
      body +=
        "時間はおおむね確保できており、これからは眠りの質とのバランスを見ていく段階です。";
    } else {
      body +=
        "時間の確保と、眠りの質の両方から整えていくとよいでしょう。";
    }
    drafted.push({ title: "睡眠時間", body });
  }

  const efficiency = displayMeasured(metrics.sleepEfficiency);
  const hasStages =
    hasMeasuredValue(metrics.deepSleep) ||
    hasMeasuredValue(metrics.remSleep) ||
    hasMeasuredValue(metrics.deepSleepRate);
  if (efficiency || hasStages) {
    const parts: string[] = [];
    if (efficiency) {
      const p = parsePercent(metrics.sleepEfficiency);
      if (p != null && p >= 90) {
        parts.push(
          `睡眠効率は${efficiency}と高く、ベッドでの時間を休息に活かせています。`,
        );
      } else if (p != null && p < 85) {
        parts.push(
          `睡眠効率は${efficiency}で、就床時間に対する実際の休息に改善余地があります。`,
        );
      } else {
        parts.push(`睡眠効率は${efficiency}でした。`);
      }
    }
    const deep = displayMeasured(metrics.deepSleep) || displayMeasured(metrics.deepSleepRate);
    const rem = displayMeasured(metrics.remSleep) || displayMeasured(metrics.remSleepRate);
    if (deep || rem) {
      parts.push(
        [
          deep ? `深い睡眠は${deep}` : "",
          rem ? `レム睡眠は${rem}` : "",
        ]
          .filter(Boolean)
          .join("、") + "でした。構成のバランスが、翌朝の回復感につながります。",
      );
    }
    if (parts.length > 0) {
      drafted.push({ title: "睡眠の質と構成", body: parts.join("") });
    }
  }

  const hrv = displayMeasured(metrics.hrv);
  const rhr = displayMeasured(metrics.restingHeartRate);
  if (hrv || rhr) {
    const bits: string[] = [];
    if (hrv) {
      const n = num(metrics.hrv);
      bits.push(
        n != null && n < 40
          ? `HRVは${hrv}と低めのため、副交感神経への切り替えが弱かった可能性があります。`
          : `HRVは${hrv}でした。回復の余力を見る手がかりになります。`,
      );
    }
    if (rhr) {
      bits.push(`安静時心拍は${rhr}でした。`);
    }
    drafted.push({ title: "身体の回復", body: bits.join("") });
  }

  const stress = displayMeasured(metrics.stress);
  if (stress) {
    const n = num(metrics.stress);
    drafted.push({
      title: "ストレスとの関係",
      body:
        n != null && n >= 45
          ? `ストレス指標は${stress}と高めです。就寝前の切り替えが、入眠や深い休息に影響した可能性があります。`
          : `ストレス指標は${stress}でした。大きな乱れは目立たない一方、夜の過ごし方との関係は引き続き見ていくとよいでしょう。`,
    });
  }

  const resp = displayMeasured(metrics.respiratoryRate);
  const spo2 = displayMeasured(metrics.spo2);
  if (resp || spo2) {
    drafted.push({
      title: "呼吸",
      body: [
        resp ? `睡眠時の呼吸は${resp}でした。` : "",
        spo2
          ? `平均SpO₂は${spo2}です。ウェルネス目的の参考値としてご覧ください。`
          : "",
      ]
        .filter(Boolean)
        .join(""),
    });
  }

  const temp = displayMeasured(metrics.skinTemperature);
  if (temp) {
    drafted.push({
      title: "体表温",
      body: `皮膚温度は${temp}でした。入眠前後の体温リズムを見る参考になります。`,
    });
  }

  const activity = result.ouraScores?.activityScore;
  if (typeof activity === "number" && Number.isFinite(activity)) {
    drafted.push({
      title: "活動との関係",
      body: `日中の活動スコアは${activity}でした。活動量と夜の回復のバランスを、次回もあわせて見ていきましょう。`,
    });
  }

  const selected =
    drafted.length <= 5 ? drafted : [drafted[0]!, drafted[1]!, drafted[2]!, drafted[3]!, drafted[4]!];

  return selected.slice(0, 3).map((item, index) => ({
    index: String(index + 1).padStart(2, "0"),
    title: item.title,
    body: clampSentences(item.body, 1),
  }));
}

function hedgeLine(text: string): string {
  const line = toClientLine(text.replace(/認定講師[^.。！？]*[.。！？]?/g, "").trim());
  if (!line) return "";
  if (/可能性|考えられ|関連|傾向|参考|要因/.test(line)) return line;
  return line.replace(/。$/u, "") + "が、今回の睡眠に影響している可能性があります。";
}

function buildLifestyleConnection(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot | null,
): string {
  const fromAi = stripReportNoise(
    result.profileRelation || result.lifestyleRelation || "",
  );
  if (fromAi) return clampSentences(fromAi, 2);

  const model = buildClientWellnessReport(result, lifestyle);
  if (model.impactFactors.length > 0) {
    return model.impactFactors.slice(0, 3).map(hedgeLine).filter(Boolean).join("");
  }
  return "";
}

function buildNextSteps(
  result: AnalysisResult,
  actions: CounselingAction[],
): string[] {
  const fromAi = (result.nextComparisonPoints ?? [])
    .map((item) => stripReportNoise(item))
    .filter(Boolean);
  if (fromAi.length > 0) return fromAi.slice(0, 2).map(toClientLine);

  const steps: string[] = [];
  const metrics = result.metrics;
  if (hasMeasuredValue(metrics.sleepDuration)) {
    steps.push("睡眠時間の変化");
  }
  if (
    hasMeasuredValue(metrics.deepSleep) ||
    hasMeasuredValue(metrics.deepSleepRate)
  ) {
    steps.push("深い睡眠の変化");
  }
  if (hasMeasuredValue(metrics.hrv) || hasMeasuredValue(metrics.sleepEfficiency)) {
    steps.push(
      hasMeasuredValue(metrics.hrv) ? "HRV / 回復の変化" : "睡眠効率の変化",
    );
  }
  if (steps.length === 0 && actions[0]) {
    steps.push(`${actions[0].what}の継続具合`);
  }
  return steps.slice(0, 2).map((item) => {
    if (/見る|意識/.test(item)) return toClientLine(item);
    return toClientLine(`次回の測定で、${item}を見る`);
  });
}

function buildOverallComment(
  result: AnalysisResult,
  model: ReturnType<typeof buildClientWellnessReport>,
): string {
  const candidates = [
    result.scoreComment,
    result.summary,
    model.overallComment,
  ];
  for (const candidate of candidates) {
    const clamped = clampSentences(stripReportNoise(candidate || ""), 2);
    if (clamped.length >= 24) return clamped;
  }

  const score = Math.max(0, Math.min(100, Math.round(result.score)));
  const durationMin = parseDurationMinutes(result.metrics.sleepDuration);
  const efficiency = parsePercent(result.metrics.sleepEfficiency);
  const quality =
    score >= 80
      ? "睡眠の質は比較的良好です"
      : score >= 65
        ? "睡眠の土台はおおむね保てています"
        : "睡眠の質には改善の余地があります";
  const gaps: string[] = [];
  if (durationMin != null && durationMin < 360) gaps.push("睡眠時間");
  if (efficiency != null && efficiency < 85) gaps.push("睡眠効率");
  if (hasMeasuredValue(result.metrics.hrv)) {
    const hrv = num(result.metrics.hrv);
    if (hrv != null && hrv < 40) gaps.push("回復");
  }
  if (gaps.length > 0) {
    return `${quality}が、${gaps.join("と")}のバランスに改善余地があります。`;
  }
  return `${quality}。今回のリズムを大切にしながら、生活との関係を見ていきましょう。`;
}

function isGenericPoint(text: string): boolean {
  return /個別の改善計画を立てられます|データをもとに|未測定|取得できず|データなし/.test(
    text,
  );
}

function buildActions(
  result: AnalysisResult,
  model: ReturnType<typeof buildClientWellnessReport>,
): CounselingAction[] {
  const recs = (result.todaysRecommendations ?? [])
    .map((item) => stripReportNoise(item).replace(/ください。?$/u, ""))
    .filter(Boolean)
    .slice(0, 3);
  const reasons = model.priorityImprovements.map((item) => item.reason);
  if (recs.length > 0) {
    return recs.map((what, index) => ({
      rank: index + 1,
      what,
      why: toClientLine(
        clampSentences(
          stripReportNoise(reasons[index] || "") ||
            "今回の測定と生活の様子から、優先して取り組みたいことです。",
          1,
        ),
      ),
    }));
  }
  return model.priorityImprovements.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    what: stripReportNoise(item.action).replace(/ください。?$/u, ""),
    why: toClientLine(clampSentences(stripReportNoise(item.reason), 1)),
  }));
}

export function buildCounselingReportContent(
  result: AnalysisResult,
  lifestyle?: LifestyleSnapshot | null,
): CounselingReportContent {
  const model = buildClientWellnessReport(result, lifestyle);
  const goodPoints = model.goodPoints
    .map((item) => toClientLine(stripReportNoise(item)))
    .filter((item) => item && !isGenericPoint(item))
    .slice(0, 3);
  const attentionPoints = model.priorityImprovements
    .map((item) => toClientLine(stripReportNoise(item.title)))
    .filter((item) => item && !isGenericPoint(item))
    .slice(0, 3);
  const actions = buildActions(result, model);
  const keyMetrics = buildKeyMetrics(result.metrics);

  return {
    overallComment: buildOverallComment(result, model),
    keyMetrics,
    analysisGuideMetrics: buildAnalysisGuideMetrics(result.metrics, keyMetrics),
    stages: buildStages(result.metrics),
    goodPoints,
    attentionPoints,
    expertPoints: buildExpertPoints(result),
    lifestyleConnection: buildLifestyleConnection(result, lifestyle),
    actions,
    nextSteps: buildNextSteps(result, actions),
    melatoninYoga: (() => {
      const yoga = buildMelatoninYogaPrescription(result, lifestyle);
      return {
        ...yoga,
        phaseReason: clampSentences(yoga.phaseReason, 2),
      };
    })(),
  };
}
