/**
 * Oura Vision JSON → 既存 AnalysisMetrics への変換。
 * SOXAI metrics 変換ロジックは変更しない（本ファイルは Oura 専用）。
 */

import { formatDurationDisplay } from "@/lib/soxai-display-normalize";
import { parseDurationMinutes } from "@/lib/soxai-graphs";
import {
  emptyMetrics,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import type {
  OuraDeviceSpecificMetrics,
  OuraVisionMetrics,
  OuraVisionResult,
} from "@/lib/oura-vision-schema";
import { normalizeOuraVisionResult } from "@/lib/oura-vision-schema";

function minutesToDisplay(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return "";
  return formatDurationDisplay(`${Math.round(minutes)}分`);
}

function percentToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value * 10) / 10}%`;
}

function bpmToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value)} bpm`;
}

function msToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value)} ms`;
}

function rpmToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value * 10) / 10} 回/分`;
}

function tempDevToDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value * 100) / 100}℃`;
}

function scoreToNumber(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value);
}

/**
 * Oura Vision 結果を共通 AnalysisMetrics へ変換。
 * Light/Deep は個別保持。Non-REM は両方あるときだけ Light+Deep 合算。
 */
export function ouraVisionToAnalysisMetrics(
  vision: OuraVisionResult | OuraVisionMetrics,
): AnalysisMetrics {
  const metrics: OuraVisionMetrics =
    "metrics" in vision && vision.metrics
      ? vision.metrics
      : (vision as OuraVisionMetrics);

  const out = emptyMetrics();
  out.sleepScore = scoreToNumber(metrics.sleepScore);
  out.sleepDuration = minutesToDisplay(metrics.totalSleep);
  out.timeInBed = minutesToDisplay(metrics.timeInBed);
  out.sleepEfficiency = percentToDisplay(metrics.sleepEfficiency);
  out.sleepLatency = minutesToDisplay(metrics.sleepLatency);
  out.bedtime = metrics.bedtime?.trim() || "";
  out.wakeTime = metrics.wakeTime?.trim() || "";
  out.awakenings = minutesToDisplay(metrics.awakeDuration);
  if (!out.awakenings && metrics.awakeTime) {
    // 「3時間43分」など時間表記が awakeTime に入っている場合
    const awakeAsDuration = minutesToDisplay(
      (() => {
        const text = metrics.awakeTime.trim();
        const jp = text.match(/(\d+)\s*時間\s*(\d+)?\s*分?/);
        if (jp) {
          const h = Number(jp[1]);
          const m = Number(jp[2] ?? 0);
          if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
        }
        return null;
      })(),
    );
    if (awakeAsDuration) out.awakenings = awakeAsDuration;
  }
  out.awakeningRate = percentToDisplay(metrics.awakePercent);
  // SOXAI と同一定義: 覚醒率 = 覚醒分 /（レム+浅い+深い+覚醒）＝就床寄りの分母。
  // Vision の awakePercent が欠けるときだけ算出。欠損は埋めず「未測定」のまま。
  if (!out.awakeningRate.trim()) {
    const awakeMin =
      metrics.awakeDuration != null && Number.isFinite(metrics.awakeDuration)
        ? metrics.awakeDuration
        : parseDurationMinutes(out.awakenings);
    const rem = metrics.remDuration;
    const light = metrics.lightSleepDuration;
    const deep = metrics.deepSleepDuration;
    let denom: number | null = null;
    let denomKind: "stageSum" | "timeInBed" | "totalSleepPlusAwake" | null =
      null;
    if (
      awakeMin != null &&
      rem != null &&
      light != null &&
      deep != null &&
      Number.isFinite(rem) &&
      Number.isFinite(light) &&
      Number.isFinite(deep)
    ) {
      denom = rem + light + deep + awakeMin;
      denomKind = "stageSum";
    } else if (
      metrics.timeInBed != null &&
      Number.isFinite(metrics.timeInBed) &&
      metrics.timeInBed > 0
    ) {
      denom = metrics.timeInBed;
      denomKind = "timeInBed";
    } else if (
      awakeMin != null &&
      metrics.totalSleep != null &&
      Number.isFinite(metrics.totalSleep)
    ) {
      denom = metrics.totalSleep + awakeMin;
      denomKind = "totalSleepPlusAwake";
    }
    console.log("[oura-metrics] awakePercent fallback check", {
      awakeMin,
      awakePercentFromVision: metrics.awakePercent,
      rem,
      light,
      deep,
      timeInBed: metrics.timeInBed,
      totalSleep: metrics.totalSleep,
      denomKind,
      denom,
    });
    if (awakeMin != null && denom != null && denom > 0 && denomKind != null) {
      out.awakeningRate = percentToDisplay((awakeMin / denom) * 100);
      const logLine = `[oura-metrics] awakePercent denominator=${denomKind} value=${Math.round(denom)}`;
      if (denomKind === "stageSum") {
        console.log(logLine);
      } else {
        console.warn(logLine);
      }
    } else {
      console.warn("[oura-metrics] awakePercent fallback skipped", {
        reason:
          awakeMin == null
            ? "no awakeMin"
            : denom == null
              ? "no denominator (need stageSum or timeInBed or totalSleep+awake)"
              : "denom <= 0",
        awakeMin,
        rem,
        light,
        deep,
        timeInBed: metrics.timeInBed,
        totalSleep: metrics.totalSleep,
      });
    }
  } else {
    console.log("[oura-metrics] awakePercent from Vision (fallback skipped)", {
      awakePercent: metrics.awakePercent,
      awakeningRate: out.awakeningRate,
    });
  }
  out.remSleep = minutesToDisplay(metrics.remDuration);
  out.remSleepRate = percentToDisplay(metrics.remPercent);
  out.lightSleep = minutesToDisplay(metrics.lightSleepDuration);
  out.lightSleepRate = percentToDisplay(metrics.lightSleepPercent);
  out.deepSleep = minutesToDisplay(metrics.deepSleepDuration);
  out.deepSleepRate = percentToDisplay(metrics.deepSleepPercent);

  // 内部用 Non-REM = Light + Deep（両方あるときだけ。表示では使わない）
  if (
    metrics.lightSleepDuration != null &&
    metrics.deepSleepDuration != null &&
    Number.isFinite(metrics.lightSleepDuration) &&
    Number.isFinite(metrics.deepSleepDuration)
  ) {
    out.nonRemSleep = minutesToDisplay(
      metrics.lightSleepDuration + metrics.deepSleepDuration,
    );
  }
  if (
    metrics.lightSleepPercent != null &&
    metrics.deepSleepPercent != null &&
    Number.isFinite(metrics.lightSleepPercent) &&
    Number.isFinite(metrics.deepSleepPercent)
  ) {
    out.nonRemSleepRate = percentToDisplay(
      metrics.lightSleepPercent + metrics.deepSleepPercent,
    );
  }

  out.restingHeartRate = bpmToDisplay(metrics.restingHeartRate);
  out.restingHeartRateMin = bpmToDisplay(metrics.lowestHeartRate);
  out.averageHeartRate = bpmToDisplay(metrics.averageHeartRate);
  out.hrv = msToDisplay(metrics.averageHrv);
  out.hrvMax = msToDisplay(metrics.maximumHrv);
  out.hrvMin = msToDisplay(metrics.minimumHrv);
  out.respiratoryRate = rpmToDisplay(metrics.respiratoryRate);
  out.spo2 = percentToDisplay(metrics.averageSpO2);
  out.skinTemperature = tempDevToDisplay(metrics.bodyTemperatureDeviation);
  out.sleepDebt = minutesToDisplay(metrics.sleepDebtMinutes);
  out.stress = minutesToDisplay(metrics.daytimeStressMinutes);
  out.breathingDisturbances = metrics.breathingDisturbances?.trim() || "";
  out.previousDayActivity = metrics.previousDayActivity?.trim() || "";

  return out;
}

export type OuraMappedExtraction = {
  metrics: AnalysisMetrics;
  imageKeys: MetricFieldKey[];
  deviceSpecificMetrics: OuraDeviceSpecificMetrics;
  visionMetrics: OuraVisionMetrics;
  ouraScores: {
    sleepScore: number | null;
    readinessScore: number | null;
    activityScore: number | null;
  };
  warnings: string[];
  measurementDate: string | null;
};

function collectedKeys(metrics: AnalysisMetrics): MetricFieldKey[] {
  const keys: MetricFieldKey[] = [];
  const entries = Object.entries(metrics) as Array<
    [MetricFieldKey, string | number | null]
  >;
  for (const [key, value] of entries) {
    if (key === "nonRemSleep" || key === "nonRemSleepRate") continue;
    if (value == null) continue;
    if (typeof value === "number") {
      keys.push(key);
      continue;
    }
    if (String(value).trim()) keys.push(key);
  }
  return keys;
}

export function mapOuraVisionToExtraction(
  raw: unknown,
): OuraMappedExtraction {
  const vision = normalizeOuraVisionResult(raw);
  const metrics = ouraVisionToAnalysisMetrics(vision);
  return {
    metrics,
    imageKeys: collectedKeys(metrics),
    deviceSpecificMetrics: vision.deviceSpecificMetrics,
    visionMetrics: vision.metrics,
    ouraScores: {
      sleepScore: vision.metrics.sleepScore,
      readinessScore: vision.metrics.readinessScore,
      activityScore: vision.metrics.activityScore,
    },
    warnings: vision.warnings,
    measurementDate: vision.measurementDate,
  };
}

/**
 * 共通 metrics の空欄だけ Oura Vision 編集値で埋める。
 * すでに confirm で入っている値は上書きしない（推測・再計算なし）。
 */
export function fillEmptyMetricsFromOuraVision(
  metrics: AnalysisMetrics,
  vision: OuraVisionMetrics | null | undefined,
): AnalysisMetrics {
  if (!vision) return metrics;
  const fromVision = ouraVisionToAnalysisMetrics(vision);
  const out = { ...metrics };
  const entries = Object.entries(fromVision) as Array<
    [MetricFieldKey, string | number | null]
  >;
  for (const [key, value] of entries) {
    if (key === "nonRemSleep" || key === "nonRemSleepRate") continue;
    const current = out[key];
    const currentPresent =
      current != null &&
      (typeof current === "number"
        ? Number.isFinite(current)
        : String(current).trim().length > 0);
    if (currentPresent) continue;
    if (value == null) continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      out[key] = value as never;
      continue;
    }
    if (String(value).trim()) out[key] = value as never;
  }
  return out;
}

/** confirm / result 表示用の Oura 固有行 */
export type OuraDisplayRow = {
  key: string;
  label: string;
  value: string;
  present: boolean;
};

/** confirm で編集可能な Oura 固有フィールド（共通 metrics 以外） */
export const OURA_CONFIRM_EDITABLE_FIELDS = [
  { key: "sleepScore", label: "Sleep Score", kind: "score" },
  { key: "readinessScore", label: "Readiness Score", kind: "score" },
  { key: "activityScore", label: "Activity Score", kind: "score" },
  { key: "timeInBed", label: "Time in Bed", kind: "minutes" },
  { key: "awakeTime", label: "Awake Time", kind: "text" },
  { key: "breathingRegularity", label: "Breathing Regularity", kind: "text" },
  {
    key: "bodyTemperatureDeviation",
    label: "Body Temperature Deviation",
    kind: "temp",
  },
  { key: "sleepTiming", label: "Sleep Timing", kind: "text" },
  { key: "sleepBalance", label: "Sleep Balance", kind: "text" },
  { key: "activityBalance", label: "Activity Balance", kind: "text" },
  { key: "recoveryIndex", label: "Recovery Index", kind: "score" },
  { key: "recoveryTime", label: "Recovery Time", kind: "text" },
] as const;

export type OuraConfirmEditableKey =
  (typeof OURA_CONFIRM_EDITABLE_FIELDS)[number]["key"];

export function formatOuraConfirmFieldValue(
  key: OuraConfirmEditableKey,
  metrics: OuraVisionMetrics,
): string {
  const value = metrics[key];
  if (value == null) return "";
  if (typeof value === "number") {
    if (key === "timeInBed") return minutesToDisplay(value);
    if (key === "bodyTemperatureDeviation") return tempDevToDisplay(value);
    return String(value);
  }
  return String(value).trim();
}

export function parseOuraConfirmFieldInput(
  key: OuraConfirmEditableKey,
  raw: string,
): string | number | null {
  const text = raw.trim();
  if (!text || text === "要確認" || text === "未取得") return null;
  const field = OURA_CONFIRM_EDITABLE_FIELDS.find((item) => item.key === key);
  if (!field) return null;
  if (field.kind === "text") return text;
  if (field.kind === "minutes") {
    const jp = text.match(/(\d+)\s*時間\s*(\d+)?\s*分?/);
    if (jp) {
      const h = Number(jp[1]);
      const m = Number(jp[2] ?? 0);
      if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
    }
    const hm = text.match(/^(\d+)[:：](\d{1,2})$/);
    if (hm) {
      const h = Number(hm[1]);
      const m = Number(hm[2]);
      if (Number.isFinite(h) && Number.isFinite(m) && m < 60) return h * 60 + m;
    }
    const n = Number(text.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (field.kind === "temp") {
    const n = Number(text.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(text.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 100) return null;
  return Math.round(n);
}

export function buildOuraSpecificDisplayRows(
  scores: OuraMappedExtraction["ouraScores"],
  specific: OuraDeviceSpecificMetrics,
  visionMetrics?: OuraVisionMetrics | null,
): OuraDisplayRow[] {
  const rows: OuraDisplayRow[] = [
    {
      key: "readinessScore",
      label: "Readiness Score",
      value:
        scores.readinessScore != null ? String(scores.readinessScore) : "",
      present: scores.readinessScore != null,
    },
    {
      key: "activityScore",
      label: "Activity Score",
      value: scores.activityScore != null ? String(scores.activityScore) : "",
      present: scores.activityScore != null,
    },
  ];

  if (visionMetrics) {
    const extras: Array<[string, string, string | number | null]> = [
      ["timeInBed", "Time in Bed", minutesToDisplay(visionMetrics.timeInBed)],
      [
        "awakeTime",
        "Awake Time",
        visionMetrics.awakeTime ?? "",
      ],
      [
        "recoveryIndex",
        "Recovery Index（Oura）",
        visionMetrics.recoveryIndex != null
          ? String(visionMetrics.recoveryIndex)
          : "",
      ],
      ["recoveryTime", "Recovery Time", visionMetrics.recoveryTime ?? ""],
      ["sleepTiming", "Sleep Timing", visionMetrics.sleepTiming ?? ""],
      ["sleepBalance", "Sleep Balance", visionMetrics.sleepBalance ?? ""],
      [
        "activityBalance",
        "Activity Balance",
        visionMetrics.activityBalance ?? "",
      ],
      ["restfulness", "Restfulness", visionMetrics.restfulness ?? ""],
      [
        "breathingRegularity",
        "Breathing Regularity",
        visionMetrics.breathingRegularity ?? "",
      ],
      [
        "breathingDisturbances",
        "Breathing Disturbances",
        visionMetrics.breathingDisturbances ?? "",
      ],
    ];
    for (const [key, label, value] of extras) {
      const text = String(value ?? "").trim();
      rows.push({ key, label, value: text, present: Boolean(text) });
    }
  }

  const sleepContrib = Object.entries(specific.sleepContributors ?? {});
  for (const [k, v] of sleepContrib.slice(0, 12)) {
    const text = v == null ? "" : String(v).trim();
    rows.push({
      key: `sleepContributor:${k}`,
      label: `Sleep · ${k}`,
      value: text,
      present: Boolean(text),
    });
  }
  const readyContrib = Object.entries(specific.readinessContributors ?? {});
  for (const [k, v] of readyContrib.slice(0, 12)) {
    const text = v == null ? "" : String(v).trim();
    rows.push({
      key: `readinessContributor:${k}`,
      label: `Readiness · ${k}`,
      value: text,
      present: Boolean(text),
    });
  }

  if (specific.tags?.length) {
    rows.push({
      key: "tags",
      label: "Tags",
      value: specific.tags.join(", "),
      present: true,
    });
  } else {
    rows.push({ key: "tags", label: "Tags", value: "", present: false });
  }
  if (specific.notes?.length) {
    rows.push({
      key: "notes",
      label: "Notes",
      value: specific.notes.join(" / "),
      present: true,
    });
  } else {
    rows.push({ key: "notes", label: "Notes", value: "", present: false });
  }

  return rows;
}
