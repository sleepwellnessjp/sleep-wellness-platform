import { parseDurationMinutes, parseLeadingNumber } from "@/lib/soxai-graphs";
import { normalizeTimeToHHMM } from "@/lib/soxai-structured-metrics";
import type { MetricFieldKey } from "@/lib/soxai-metrics";

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

const TIME_KEYS = new Set<MetricFieldKey>(["bedtime", "wakeTime"]);

/** 数値の後ろに付く定性語（競合比較時は無視） */
const QUALITATIVE_SUFFIX =
  /(?:標準|普通|低め|高め|中程度|低い|高い|非常に低い|非常に高い|low|medium|high|normal|calm|elevated)\s*$/i;

const UNIT_NOISE =
  /\s*(?:bpm|brpm|ms|mmhg|℃|°c|°|度|回\/?分|\/分|％|%)\s*$/i;

function baseNormalize(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/％/g, "%")
    .replace(/：/g, ":");
}

/**
 * 「6:22」「6時間22分」「6時間 22分」→ 同一の分単位キー
 */
export function normalizeDurationComparable(raw: string): string | null {
  const text = raw.normalize("NFKC").trim();
  if (!text) return null;

  const minutes = parseDurationMinutes(text);
  if (minutes != null) return `dur:${minutes}`;

  // 「6h22m」「6hr22min」など
  const en = text.match(
    /^(-?\d+)\s*(?:h|hr|hrs|hour|hours)\s*(-?\d+)?\s*(?:m|min|mins|minute|minutes)?$/i,
  );
  if (en) {
    const h = Number(en[1]);
    const m = en[2] ? Number(en[2]) : 0;
    if (Number.isFinite(h) && Number.isFinite(m)) return `dur:${h * 60 + m}`;
  }

  return null;
}

/**
 * 「49 bpm」「49」→ 同一
 * 「33」「33標準」→ 同一
 */
export function normalizeNumericComparable(raw: string): string | null {
  const text = raw.normalize("NFKC").trim();
  if (!text) return null;

  let cleaned = text.replace(QUALITATIVE_SUFFIX, "").trim();
  cleaned = cleaned.replace(UNIT_NOISE, "").trim();
  cleaned = cleaned.replace(/[（(].*?[）)]/g, "").trim();

  const n = parseLeadingNumber(cleaned);
  if (n == null) return null;

  // 整数っぽいものは整数キー、小数は丸めすぎない
  const key = Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
  return `num:${key}`;
}

export function normalizePercentComparable(raw: string): string | null {
  const text = raw.normalize("NFKC").trim();
  if (!text) return null;
  const n = parseLeadingNumber(text.replace(/%|％/g, ""));
  if (n == null) return null;
  return `pct:${n}`;
}

export function normalizeTimeComparable(raw: string): string | null {
  const hhmm = normalizeTimeToHHMM(raw);
  if (/^\d{2}:\d{2}$/.test(hhmm)) return `time:${hhmm}`;
  return null;
}

/**
 * メトリクスキーに応じた比較用正規化キー。
 * 表記ゆれは同じキーになり、本当に違う値だけが別キーになる。
 */
export function normalizeComparableValue(
  key: MetricFieldKey,
  value: string,
): string {
  const raw = value.trim();
  if (!raw) return "";

  if (key === "sleepScore") {
    const n = parseLeadingNumber(raw);
    return n == null ? baseNormalize(raw) : `score:${n}`;
  }

  if (DURATION_KEYS.has(key)) {
    return normalizeDurationComparable(raw) ?? baseNormalize(raw);
  }

  if (TIME_KEYS.has(key)) {
    return normalizeTimeComparable(raw) ?? baseNormalize(raw);
  }

  if (PERCENT_KEYS.has(key)) {
    return normalizePercentComparable(raw) ?? baseNormalize(raw);
  }

  if (
    key === "restingHeartRate" ||
    key === "restingHeartRateMin" ||
    key === "restingHeartRateMax" ||
    key === "hrv" ||
    key === "hrvMax" ||
    key === "hrvMin" ||
    key === "respiratoryRate" ||
    key === "qol" ||
    key === "yesterdayQol" ||
    key === "conditionScore"
  ) {
    return normalizeNumericComparable(raw) ?? baseNormalize(raw);
  }

  if (key === "stress") {
    return normalizeNumericComparable(raw) ?? baseNormalize(raw);
  }

  if (key === "skinTemperature") {
    const text = raw.normalize("NFKC").trim();
    const delta = text.match(/^([+-])\s*(\d+(?:\.\d+)?)/);
    if (delta) return `skin:${delta[1]}${delta[2]}`;
    const n = parseLeadingNumber(text);
    if (n != null) return `skin:${n}`;
    return baseNormalize(raw);
  }

  // フォールバック: 空白・単位・定性語を落として比較
  const stripped =
    normalizeNumericComparable(raw) ??
    normalizeDurationComparable(raw) ??
    normalizePercentComparable(raw);
  if (stripped) return stripped;

  return baseNormalize(raw)
    .replace(UNIT_NOISE, "")
    .replace(QUALITATIVE_SUFFIX, "");
}

/** 2値が表記ゆれのみで同じか */
export function valuesAreEquivalent(
  key: MetricFieldKey,
  a: string,
  b: string,
): boolean {
  const na = normalizeComparableValue(key, a);
  const nb = normalizeComparableValue(key, b);
  if (!na || !nb) return false;
  return na === nb;
}
