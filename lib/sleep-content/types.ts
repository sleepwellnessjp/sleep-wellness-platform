export const SLEEP_CONTENT_IMAGE_BUCKET = "sleep-content-images";
export const SLEEP_CONTENT_AUDIO_BUCKET = "sleep-content-audio";
export const SLEEP_CONTENT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const SLEEP_CONTENT_AUDIO_MAX_BYTES = 50 * 1024 * 1024;

// SVGはスクリプトを埋め込める形式のため、表示は必ず <img> タグで行うこと。
// dangerouslySetInnerHTML や <object> でのインライン展開を禁止する。
export const SLEEP_CONTENT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

export const SLEEP_CONTENT_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
] as const;

export const SLEEP_CONTENT_CATEGORIES = [
  "rest",
  "science",
  "interview",
] as const;

export const SLEEP_CONTENT_SUBCATEGORIES = [
  "basic",
  "practice",
  "life",
  "women",
  "men",
  "work",
] as const;

export const SLEEP_CONTENT_KINDS = [
  "talk_video",
  "nature_sound",
  "practice_video",
  "article",
  "interview",
] as const;

export const SLEEP_CONTENT_BLOCK_TYPES = [
  "heading",
  "paragraph",
  "figure",
  "list",
  "callout",
] as const;

export type SleepContentCategory = (typeof SLEEP_CONTENT_CATEGORIES)[number];
export type SleepContentSubcategory =
  (typeof SLEEP_CONTENT_SUBCATEGORIES)[number];
export type SleepContentKind = (typeof SLEEP_CONTENT_KINDS)[number];
export type SleepContentStatus = "draft" | "published" | "archived";
export type SleepContentBlockType = (typeof SLEEP_CONTENT_BLOCK_TYPES)[number];

export type SleepContentHeadingBlock = {
  type: "heading";
  text: string;
};

export type SleepContentParagraphBlock = {
  type: "paragraph";
  text: string;
};

export type SleepContentFigureBlock = {
  type: "figure";
  image_url: string;
  alt: string;
  caption: string;
};

export type SleepContentListBlock = {
  type: "list";
  items: string[];
};

export type SleepContentCalloutBlock = {
  type: "callout";
  text: string;
};

export type SleepContentBlock =
  | SleepContentHeadingBlock
  | SleepContentParagraphBlock
  | SleepContentFigureBlock
  | SleepContentListBlock
  | SleepContentCalloutBlock;

export type SleepContent = {
  id: string;
  slug: string;
  category: SleepContentCategory;
  subcategory: SleepContentSubcategory | null;
  kind: SleepContentKind;
  title: string;
  summary: string;
  bodyBlocks: SleepContentBlock[];
  youtubeUrl: string;
  audioUrl: string;
  coverImageUrl: string;
  durationSeconds: number | null;
  sortOrder: number;
  status: SleepContentStatus;
  published: boolean;
  publishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SleepContentInput = {
  slug?: string;
  category: SleepContentCategory;
  subcategory?: SleepContentSubcategory | null;
  kind: SleepContentKind;
  title: string;
  summary?: string;
  bodyBlocks?: SleepContentBlock[];
  youtubeUrl?: string;
  audioUrl?: string;
  coverImageUrl?: string;
  durationSeconds?: number | null;
  sortOrder?: number;
};

export type SleepContentRow = {
  id: string;
  slug: string;
  category: string;
  subcategory: string | null;
  kind: string;
  title: string;
  summary: string;
  body_blocks: unknown;
  youtube_url: string;
  audio_url: string;
  cover_image_url: string;
  duration_seconds: number | null;
  sort_order: number;
  status: string;
  published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const SLEEP_CONTENT_CATEGORY_LABELS: Record<
  SleepContentCategory,
  string
> = {
  rest: "入眠",
  science: "睡眠学",
  interview: "インタビュー",
};

export const SLEEP_CONTENT_SUBCATEGORY_LABELS: Record<
  SleepContentSubcategory,
  string
> = {
  basic: "基礎",
  practice: "実践",
  life: "暮らし",
  women: "女性",
  men: "男性",
  work: "仕事",
};

export const SLEEP_CONTENT_KIND_LABELS: Record<SleepContentKind, string> = {
  talk_video: "語りかけ動画",
  nature_sound: "自然音",
  practice_video: "メラトニンヨガ™",
  article: "記事",
  interview: "インタビュー",
};

export const SLEEP_CONTENT_BLOCK_TYPE_LABELS: Record<
  SleepContentBlockType,
  string
> = {
  heading: "見出し",
  paragraph: "段落",
  figure: "図解",
  list: "箇条書き",
  callout: "強調ブロック",
};

export const REST_KINDS: SleepContentKind[] = [
  "talk_video",
  "nature_sound",
  "practice_video",
];

export function isSleepContentCategory(
  value: string,
): value is SleepContentCategory {
  return (SLEEP_CONTENT_CATEGORIES as readonly string[]).includes(value);
}

export function isSleepContentSubcategory(
  value: string,
): value is SleepContentSubcategory {
  return (SLEEP_CONTENT_SUBCATEGORIES as readonly string[]).includes(value);
}

export function isSleepContentKind(value: string): value is SleepContentKind {
  return (SLEEP_CONTENT_KINDS as readonly string[]).includes(value);
}

export function isSleepContentStatus(
  value: string,
): value is SleepContentStatus {
  return value === "draft" || value === "published" || value === "archived";
}

export function isYoutubeKind(kind: SleepContentKind): boolean {
  return (
    kind === "talk_video" || kind === "practice_video" || kind === "interview"
  );
}

export function emptyBlock(type: SleepContentBlockType): SleepContentBlock {
  if (type === "heading") return { type: "heading", text: "" };
  if (type === "paragraph") return { type: "paragraph", text: "" };
  if (type === "figure") {
    return { type: "figure", image_url: "", alt: "", caption: "" };
  }
  if (type === "list") return { type: "list", items: [""] };
  return { type: "callout", text: "" };
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseBodyBlocks(value: unknown): SleepContentBlock[] {
  if (!Array.isArray(value)) return [];
  const blocks: SleepContentBlock[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const type = "type" in item ? String(item.type) : "";
    if (type === "heading") {
      blocks.push({ type: "heading", text: asText((item as { text?: unknown }).text) });
      continue;
    }
    if (type === "paragraph") {
      blocks.push({
        type: "paragraph",
        text: asText((item as { text?: unknown }).text),
      });
      continue;
    }
    if (type === "figure") {
      const figure = item as {
        image_url?: unknown;
        alt?: unknown;
        caption?: unknown;
      };
      blocks.push({
        type: "figure",
        image_url: asText(figure.image_url),
        alt: asText(figure.alt),
        caption: asText(figure.caption),
      });
      continue;
    }
    if (type === "list") {
      const raw = (item as { items?: unknown }).items;
      const items = Array.isArray(raw)
        ? raw.map((entry) => asText(entry))
        : [];
      blocks.push({ type: "list", items });
      continue;
    }
    if (type === "callout") {
      blocks.push({
        type: "callout",
        text: asText((item as { text?: unknown }).text),
      });
    }
  }
  return blocks;
}
