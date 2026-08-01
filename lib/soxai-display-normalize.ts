import { parseDurationMinutes, parseLeadingNumber } from "@/lib/soxai-graphs";
import {
  emptyMetrics,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import { normalizeTimeToHHMM } from "@/lib/soxai-structured-metrics";

function normalizeSkinTemperatureDisplay(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/°\s*[cｃ]/gi, "℃")
    .replace(/\s+/g, " ");
}

const DURATION_KEYS = new Set<MetricFieldKey>([
  "sleepDuration",
  "awakenings",
  "remSleep",
  "nonRemSleep",
  "lightSleep",
  "deepSleep",
  "sleepDebt",
  "sleepLatency",
]);

const PERCENT_KEYS = new Set<MetricFieldKey>([
  "sleepEfficiency",
  "awakeningRate",
  "remSleepRate",
  "nonRemSleepRate",
  "lightSleepRate",
  "deepSleepRate",
  "spo2",
]);

/**
 * 分 → 「N時間M分」/「N分」（負の負債も対応）
 * 「1:15」「1時間15分」「75分」を同一表記に揃える
 */
export function formatDurationDisplay(raw: string): string {
  const text = raw.normalize("NFKC").trim();
  if (!text) return "";

  const minutes = parseDurationMinutes(text);
  if (minutes == null) {
    // 英語表記など
    const en = text.match(
      /^(-?\d+)\s*(?:h|hr|hrs|hour|hours)\s*(-?\d+)?\s*(?:m|min|mins|minute|minutes)?$/i,
    );
    if (en) {
      const h = Number(en[1]);
      const m = en[2] ? Number(en[2]) : 0;
      if (Number.isFinite(h) && Number.isFinite(m)) {
        return formatMinutesAsDuration(h * 60 + m);
      }
    }
    return text;
  }

  return formatMinutesAsDuration(minutes);
}

export function formatMinutesAsDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) return "";
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}分`;
  if (m === 0) return `${sign}${h}時間`;
  return `${sign}${h}時間${m}分`;
}

/** 「87」「87%」「87％」→「87%」 */
export function formatPercentDisplay(raw: string): string {
  const text = raw.normalize("NFKC").trim().replace(/％/g, "%");
  if (!text) return "";
  const n = parseLeadingNumber(text.replace(/%/g, ""));
  if (n == null) return text;
  // 整数っぽいものは整数表示
  const shown = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  return `${shown}%`;
}

/** キーに応じた表示用正規化（推測補完はしない） */
export function normalizeMetricDisplayValue(
  key: MetricFieldKey,
  value: string,
): string {
  const raw = value.normalize("NFKC").trim();
  if (!raw) return "";

  if (key === "bedtime" || key === "wakeTime") {
    const hhmm = normalizeTimeToHHMM(raw);
    return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : raw;
  }

  if (DURATION_KEYS.has(key)) {
    return formatDurationDisplay(raw);
  }

  if (PERCENT_KEYS.has(key)) {
    return formatPercentDisplay(raw);
  }

  if (key === "hrv" || key === "hrvMax" || key === "hrvMin") {
    const n = parseLeadingNumber(raw);
    if (n == null) return raw;
    const shown = Number.isInteger(n) ? String(n) : String(n);
    return `${shown} ms`;
  }

  if (
    key === "restingHeartRate" ||
    key === "restingHeartRateMin" ||
    key === "restingHeartRateMax"
  ) {
    const n = parseLeadingNumber(raw);
    if (n == null) return raw;
    const rounded = Math.round(n);
    if (/bpm|拍\/分|回\/分/i.test(raw)) return `${rounded} bpm`;
    return String(rounded);
  }

  if (key === "respiratoryRate") {
    const n = parseLeadingNumber(raw);
    if (n == null) return raw;
    const shown = String(Math.round(n * 10) / 10);
    if (/rpm|brpm|呼吸\/分|回\/分/i.test(raw)) {
      if (/brpm/i.test(raw)) return `${shown} brpm`;
      if (/rpm/i.test(raw)) return `${shown} rpm`;
      return `${shown} rpm`;
    }
    // 単位欠落時も呼吸速度として rpm を明示（未取得扱い・取り違え防止）
    return `${shown} rpm`;
  }

  if (key === "skinTemperature") {
    return normalizeSkinTemperatureDisplay(raw);
  }

  return raw;
}

/** 全メトリクスの表示正規化（空はそのまま） */
export function normalizeMetricsForDisplay(
  metrics: AnalysisMetrics,
): AnalysisMetrics {
  const next = emptyMetrics();
  next.sleepScore = metrics.sleepScore;

  for (const key of Object.keys(next) as MetricFieldKey[]) {
    if (key === "sleepScore") continue;
    const value = String(metrics[key] ?? "").trim();
    next[key] = value ? normalizeMetricDisplayValue(key, value) : "";
  }

  return next;
}
