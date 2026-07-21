import type { GraphPanelData, SoxaiGraphBundle } from "@/lib/soxai-graphs";
import { parseLeadingNumber } from "@/lib/soxai-graphs";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";

export type SkinTemperatureType = "absolute" | "delta";

/** 分析保存用の構造化メトリクス（DB列・report_payload 共通） */
export type StructuredSleepMetrics = {
  sleepOnsetTime: string;
  wakeTime: string;
  skinTemperatureValue: string;
  skinTemperatureType: SkinTemperatureType | "";
  skinTemperatureUnit: string;
  stressAverage: string;
  stressLevel: string;
  stressSeries: number[];
};

export type OcrExtractionMeta = {
  sourceImageIndexes: number[];
  confidence: Partial<Record<string, number>>;
};

export function emptyStructuredMetrics(): StructuredSleepMetrics {
  return {
    sleepOnsetTime: "",
    wakeTime: "",
    skinTemperatureValue: "",
    skinTemperatureType: "",
    skinTemperatureUnit: "℃",
    stressAverage: "",
    stressLevel: "",
    stressSeries: [],
  };
}

/** 時刻を HH:mm に正規化（午前0時跨ぎはそのまま保持） */
export function normalizeTimeToHHMM(raw: string): string {
  const text = raw.normalize("NFKC").trim();
  if (!text) return "";

  const hm = text.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (hm) {
    const hh = Number(hm[1]);
    const mm = Number(hm[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  const jp = text.match(/(午前|午後|AM|PM|am|pm)\s*(\d{1,2})\s*[:：]?\s*(\d{2})?/);
  if (jp) {
    let hh = Number(jp[2]);
    const mm = jp[3] ? Number(jp[3]) : 0;
    const isPm = /午後|pm/i.test(jp[1]);
    const isAm = /午前|am/i.test(jp[1]);
    if (isPm && hh < 12) hh += 12;
    if (isAm && hh === 12) hh = 0;
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  const hOnly = text.match(/^(\d{1,2})\s*時\s*(\d{1,2})?\s*分?$/);
  if (hOnly) {
    const hh = Number(hOnly[1]);
    const mm = hOnly[2] ? Number(hOnly[2]) : 0;
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  return text;
}

export function parseSkinTemperature(raw: string): {
  display: string;
  value: string;
  type: SkinTemperatureType | "";
  unit: string;
} {
  const text = raw.normalize("NFKC").trim();
  if (!text) {
    return { display: "", value: "", type: "", unit: "℃" };
  }

  const unit = /°f|℉|fahrenheit/i.test(text) ? "°F" : "℃";
  const deltaMatch = text.match(/^([+-])\s*(\d+(?:\.\d+)?)/);
  if (deltaMatch) {
    const sign = deltaMatch[1];
    const num = deltaMatch[2];
    const value = `${sign}${num}`;
    return {
      display: `${value}${unit}`,
      value,
      type: "delta",
      unit,
    };
  }

  const absMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:℃|°c|°|度)?/i);
  if (absMatch) {
    const value = absMatch[1];
    return {
      display: `${value}${unit}`,
      value,
      type: "absolute",
      unit,
    };
  }

  return { display: text, value: text, type: "", unit };
}

const STRESS_LEVEL_PATTERNS: Array<{ pattern: RegExp; level: string }> = [
  { pattern: /非常に高|very\s*high|extreme/i, level: "非常に高い" },
  { pattern: /高め|やや高|high|elevated/i, level: "高め" },
  { pattern: /中程度|medium|moderate|普通/i, level: "中程度" },
  { pattern: /低め|やや低|low|calm|穏やか/i, level: "低め" },
  { pattern: /非常に低|very\s*low/i, level: "非常に低い" },
];

export function inferStressLevel(raw: string, average?: string): string {
  for (const { pattern, level } of STRESS_LEVEL_PATTERNS) {
    if (pattern.test(raw)) return level;
  }
  const n = parseLeadingNumber(average ?? raw);
  if (n == null) return "";
  if (n >= 80) return "非常に高い";
  if (n >= 60) return "高め";
  if (n >= 40) return "中程度";
  if (n >= 20) return "低め";
  return "非常に低い";
}

export function parseStressMetrics(
  raw: string,
  stressGraph?: GraphPanelData,
): {
  display: string;
  average: string;
  level: string;
  series: number[];
} {
  const text = raw.normalize("NFKC").trim();
  const series: number[] = [];

  if (stressGraph?.points.length) {
    for (const point of stressGraph.points) {
      if (Number.isFinite(point.y)) series.push(point.y);
    }
  }

  const annotationAvg = stressGraph?.annotations.find((a) =>
    /平均|avg|mean|現在/i.test(a.label),
  );
  const avgFromAnnotation = annotationAvg?.value.trim() ?? "";

  const avgFromText =
    text.match(/平均\s*[:：]?\s*(\d+(?:\.\d+)?)/i)?.[1] ??
    text.match(/^(\d+(?:\.\d+)?)\s*(?:\/|$)/)?.[1] ??
    "";

  let average = avgFromAnnotation || avgFromText;
  // 折れ線だけの場合は平均を捏造しない（時系列のみ保存）
  if (!average) {
    const n = parseLeadingNumber(text);
    if (n != null) average = String(n);
  }

  const level = inferStressLevel(text, average);
  const display =
    text ||
    (average
      ? level
        ? `${average}（${level}）`
        : average
      : "");

  return { display, average, level, series };
}

/** hypnogram segments から入眠・起床候補を補完 */
export function enrichBedWakeFromGraphs(
  metrics: AnalysisMetrics,
  bundle: SoxaiGraphBundle,
): AnalysisMetrics {
  const next = { ...metrics };
  const stages = bundle.stages;
  if (!stages?.segments.length) return next;

  const withTimes = stages.segments.filter(
    (s) => s.startTime?.trim() || s.endTime?.trim(),
  );
  if (withTimes.length === 0) return next;

  const firstStart = withTimes[0]?.startTime?.trim();
  const lastEnd = withTimes[withTimes.length - 1]?.endTime?.trim();

  if (!next.bedtime.trim() && firstStart) {
    next.bedtime = normalizeTimeToHHMM(firstStart);
  }
  if (!next.wakeTime.trim() && lastEnd) {
    next.wakeTime = normalizeTimeToHHMM(lastEnd);
  }

  return next;
}

/** OCR結果を正規化し、表示用文字列も更新 */
export function normalizeOcrMetrics(
  metrics: AnalysisMetrics,
  graphs?: SoxaiGraphBundle,
): AnalysisMetrics {
  let next = { ...metrics };

  if (next.bedtime.trim()) {
    next.bedtime = normalizeTimeToHHMM(next.bedtime);
  }
  if (next.wakeTime.trim()) {
    next.wakeTime = normalizeTimeToHHMM(next.wakeTime);
  }

  if (graphs) {
    next = enrichBedWakeFromGraphs(next, graphs);
  }

  if (next.skinTemperature.trim()) {
    const skin = parseSkinTemperature(next.skinTemperature);
    next.skinTemperature = skin.display || next.skinTemperature;
  }

  if (next.stress.trim() || graphs?.stress) {
    const stress = parseStressMetrics(next.stress, graphs?.stress);
    next.stress = stress.display || next.stress;
  }

  return next;
}

export function buildStructuredMetrics(
  metrics: AnalysisMetrics,
  graphs?: SoxaiGraphBundle,
): StructuredSleepMetrics {
  const skin = parseSkinTemperature(metrics.skinTemperature);
  const stress = parseStressMetrics(metrics.stress, graphs?.stress);

  return {
    sleepOnsetTime: normalizeTimeToHHMM(metrics.bedtime),
    wakeTime: normalizeTimeToHHMM(metrics.wakeTime),
    skinTemperatureValue: skin.value,
    skinTemperatureType: skin.type,
    skinTemperatureUnit: skin.unit,
    stressAverage: stress.average,
    stressLevel: stress.level,
    stressSeries: stress.series,
  };
}

export function structuredToDisplayPatch(
  structured: StructuredSleepMetrics,
  metrics: AnalysisMetrics,
): AnalysisMetrics {
  const next = { ...metrics };
  if (structured.sleepOnsetTime) next.bedtime = structured.sleepOnsetTime;
  if (structured.wakeTime) next.wakeTime = structured.wakeTime;
  if (structured.skinTemperatureValue) {
    const sign =
      structured.skinTemperatureType === "delta" &&
      !/^[+-]/.test(structured.skinTemperatureValue)
        ? structured.skinTemperatureValue.startsWith("-")
          ? ""
          : "+"
        : "";
    next.skinTemperature = `${sign}${structured.skinTemperatureValue}${structured.skinTemperatureUnit || "℃"}`;
  }
  if (structured.stressAverage || structured.stressLevel) {
    next.stress =
      structured.stressLevel && structured.stressAverage
        ? `${structured.stressAverage}（${structured.stressLevel}）`
        : structured.stressAverage || structured.stressLevel;
  }
  return next;
}

export function parseStructuredFromStorage(
  row: Record<string, unknown> | null | undefined,
  metrics: AnalysisMetrics,
  graphs?: SoxaiGraphBundle,
): StructuredSleepMetrics {
  if (!row) {
    return buildStructuredMetrics(metrics, graphs);
  }

  const stressSeriesRaw = row.stress_series ?? row.stressSeries;
  let stressSeries: number[] = [];
  if (Array.isArray(stressSeriesRaw)) {
    stressSeries = stressSeriesRaw
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((n) => Number.isFinite(n));
  }

  const fromDb: StructuredSleepMetrics = {
    sleepOnsetTime: String(
      row.sleep_onset_time ?? row.sleepOnsetTime ?? "",
    ).trim(),
    wakeTime: String(row.wake_time ?? row.wakeTime ?? "").trim(),
    skinTemperatureValue: String(
      row.skin_temperature_value ?? row.skinTemperatureValue ?? "",
    ).trim(),
    skinTemperatureType: (String(
      row.skin_temperature_type ?? row.skinTemperatureType ?? "",
    ).trim() || "") as SkinTemperatureType | "",
    skinTemperatureUnit: String(
      row.skin_temperature_unit ?? row.skinTemperatureUnit ?? "℃",
    ).trim(),
    stressAverage: String(
      row.stress_average ?? row.stressAverage ?? "",
    ).trim(),
    stressLevel: String(row.stress_level ?? row.stressLevel ?? "").trim(),
    stressSeries,
  };

  if (
    !fromDb.sleepOnsetTime &&
    !fromDb.wakeTime &&
    !fromDb.skinTemperatureValue &&
    !fromDb.stressAverage
  ) {
    return buildStructuredMetrics(metrics, graphs);
  }

  return fromDb;
}
