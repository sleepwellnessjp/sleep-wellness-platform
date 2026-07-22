/** よく使うクライアントタグ（自由入力も可） */
export const PREDEFINED_CLIENT_TAGS = [
  "高血圧",
  "夜勤",
  "飲酒",
  "ホットヨガ",
  "花粉症",
  "睡眠薬",
  "アスリート",
  "高齢者",
  "妊娠",
  "企業契約",
] as const;

export type PredefinedClientTag = (typeof PREDEFINED_CLIENT_TAGS)[number];

const MAX_TAG_LENGTH = 32;
const MAX_TAGS = 24;

function normalizeTagKey(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

/** trim・空除去・重複排除・長さ制限 */
export function normalizeClientTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.normalize("NFKC").trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed) continue;
    const key = normalizeTagKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(trimmed);
    if (tags.length >= MAX_TAGS) break;
  }

  return tags;
}

export function clientHasTag(
  tags: string[] | undefined,
  tag: string,
): boolean {
  const needle = normalizeTagKey(tag);
  if (!needle) return false;
  return (tags ?? []).some((item) => normalizeTagKey(item) === needle);
}

export function toggleClientTag(tags: string[], tag: string): string[] {
  const trimmed = tag.normalize("NFKC").trim().slice(0, MAX_TAG_LENGTH);
  if (!trimmed) return normalizeClientTags(tags);
  if (clientHasTag(tags, trimmed)) {
    const key = normalizeTagKey(trimmed);
    return tags.filter((item) => normalizeTagKey(item) !== key);
  }
  return normalizeClientTags([...tags, trimmed]);
}
