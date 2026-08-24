/**
 * SOXAI OCR が duration 値に付ける定性ラベル。
 * Vision が「-1:00 進み気味」のように数値と一体で返すことがある。
 * 長い語から順に除去すること（「進み」より先に「進み気味」）。
 */
export const SOXAI_DURATION_QUALITATIVE_PHRASES: readonly string[] = [
  "進み気味",
  "遅れ気味",
  "前倒し気味",
  "やや進み",
  "やや遅れ",
  "進み",
  "遅れ",
  "前倒し",
  "夜型",
  "朝型",
  "標準",
  "普通",
  "良好",
  "正常",
  "オンタイム",
  "整っている",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * circadianRhythm / sleepDebt 向け: 数値の前後にある定性語を除去し、
 * parseDurationMinutes / formatDurationDisplay に渡せる形へ整える。
 */
export function stripOcrDurationQualitative(text: string): string {
  let next = text.normalize("NFKC").trim();
  if (!next) return next;

  for (const phrase of SOXAI_DURATION_QUALITATIVE_PHRASES) {
    next = next.replace(new RegExp(escapeRegExp(phrase), "gi"), "");
  }

  return next
    .replace(/[、・,，/／|｜]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
