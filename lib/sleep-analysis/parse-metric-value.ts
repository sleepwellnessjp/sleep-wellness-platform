/**
 * 表示用メトリクス文字列 → 数値のパース（共通モデル用）。
 * OCR は増やさず、既存 parse ユーティリティを再利用する。
 */

import {
  parseDurationMinutes,
  parseLeadingNumber,
  parsePercent,
} from "@/lib/soxai-graphs";

export function parseMetricMinutes(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  }
  const text = value.trim();
  if (!text) return null;
  return parseDurationMinutes(text);
}

export function parseMetricNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const text = value.trim();
  if (!text) return null;
  return parseLeadingNumber(text);
}

export function parseMetricPercent(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const text = value.trim();
  if (!text) return null;
  return parsePercent(text);
}

export function parseMetricScore(
  value: string | number | null | undefined,
): number | null {
  const n = parseMetricNumber(value);
  if (n == null) return null;
  if (n < 0 || n > 100) return null;
  return Math.round(n);
}

/** 「45 ms」「53 bpm」など単位付き文字列から先頭数値 */
export function parseMetricWithUnit(
  value: string | number | null | undefined,
): number | null {
  return parseMetricNumber(value);
}
