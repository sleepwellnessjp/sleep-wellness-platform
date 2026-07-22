/**
 * 改善提案の優先度（重要度順）
 * ★★★★★ 今すぐ改善 / ★★★★☆ 今週改善 / ★★★☆☆ 余裕があれば
 */

export type ImprovementPriorityStars = 3 | 4 | 5;

export type ImprovementPriorityLabel =
  | "今すぐ改善"
  | "今週改善"
  | "余裕があれば";

export type ImprovementItem = {
  text: string;
  stars: ImprovementPriorityStars;
};

export const IMPROVEMENT_PRIORITY_META: Record<
  ImprovementPriorityStars,
  { label: ImprovementPriorityLabel; starsDisplay: string }
> = {
  5: { label: "今すぐ改善", starsDisplay: "★★★★★" },
  4: { label: "今週改善", starsDisplay: "★★★★☆" },
  3: { label: "余裕があれば", starsDisplay: "★★★☆☆" },
};

const MAX_IMPROVEMENTS = 5;

/** レガシー「優先N」や配列位置から星を推定 */
const LEGACY_INDEX_STARS: ImprovementPriorityStars[] = [5, 4, 4, 3, 3];

export function clampImprovementStars(
  value: unknown,
  fallback: ImprovementPriorityStars = 3,
): ImprovementPriorityStars {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  if (n >= 5) return 5;
  if (n === 4) return 4;
  return 3;
}

export function formatImprovementStars(stars: ImprovementPriorityStars): string {
  return IMPROVEMENT_PRIORITY_META[stars].starsDisplay;
}

export function improvementPriorityLabel(
  stars: ImprovementPriorityStars,
): ImprovementPriorityLabel {
  return IMPROVEMENT_PRIORITY_META[stars].label;
}

export function stripImprovementPrefix(text: string): string {
  return text
    .replace(/^[★☆]{3,5}\s*/u, "")
    .replace(/^(今すぐ改善|今週改善|余裕があれば)[：:\s]*/u, "")
    .replace(/^(優先\d+|優先度[：:]\s*(最優先|高|中|低))[：:\s]*/u, "")
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[\.．、:：\s]*/u, "")
    .trim();
}

function starsFromLegacyPrefix(
  text: string,
): ImprovementPriorityStars | null {
  if (/今すぐ改善/.test(text) || /★★★★★/.test(text)) return 5;
  if (/今週改善/.test(text) || /★★★★☆/.test(text)) return 4;
  if (/余裕があれば/.test(text) || /★★★☆☆/.test(text)) return 3;

  const priorityMatch = text.match(/^優先\s*(\d+)/);
  if (priorityMatch) {
    const n = Number(priorityMatch[1]);
    if (n <= 1) return 5;
    if (n === 2) return 4;
    return 3;
  }

  if (/優先度[：:]\s*最優先/.test(text) || /^最優先/.test(text)) return 5;
  if (/優先度[：:]\s*高/.test(text)) return 4;
  if (/優先度[：:]\s*(中|低)/.test(text)) return 3;

  return null;
}

/**
 * AI / 保存データ / レガシー文字列配列を ImprovementItem[] に正規化。
 * 重要度（stars）降順・最大5件。
 */
export function normalizeImprovements(
  raw: unknown,
  max: number = MAX_IMPROVEMENTS,
): ImprovementItem[] {
  if (!Array.isArray(raw)) return [];

  const items: ImprovementItem[] = [];

  for (let index = 0; index < raw.length; index++) {
    const entry = raw[index];
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const fromPrefix = starsFromLegacyPrefix(trimmed);
      const text = stripImprovementPrefix(trimmed);
      if (!text) continue;
      items.push({
        text,
        stars:
          fromPrefix ??
          LEGACY_INDEX_STARS[Math.min(index, LEGACY_INDEX_STARS.length - 1)]!,
      });
      continue;
    }

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as {
      text?: unknown;
      stars?: unknown;
      priority?: unknown;
    };
    const rawText = typeof record.text === "string" ? record.text : "";
    const text = stripImprovementPrefix(rawText.trim());
    if (!text) continue;

    let stars: ImprovementPriorityStars;
    if (record.stars != null) {
      stars = clampImprovementStars(record.stars);
    } else if (typeof record.priority === "number") {
      stars = clampImprovementStars(record.priority);
    } else if (typeof record.priority === "string") {
      stars =
        starsFromLegacyPrefix(record.priority) ??
        LEGACY_INDEX_STARS[Math.min(index, LEGACY_INDEX_STARS.length - 1)]!;
    } else {
      stars =
        LEGACY_INDEX_STARS[Math.min(index, LEGACY_INDEX_STARS.length - 1)]!;
    }
    items.push({ text, stars });
  }

  return items
    .sort((a, b) => b.stars - a.stars)
    .slice(0, Math.max(0, max));
}

export function improvementTexts(items: ImprovementItem[]): string[] {
  return items.map((item) => item.text);
}
