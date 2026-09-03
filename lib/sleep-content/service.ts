import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  isSleepContentCategory,
  isSleepContentKind,
  isSleepContentStatus,
  isSleepContentSubcategory,
  isYoutubeKind,
  parseBodyBlocks,
  type SleepContent,
  type SleepContentBlock,
  type SleepContentCategory,
  type SleepContentInput,
  type SleepContentKind,
  type SleepContentRow,
  type SleepContentStatus,
  type SleepContentSubcategory,
} from "@/lib/sleep-content/types";

type Client = SupabaseClient<Database>;

const CONTENT_SELECT = `
  id, slug, category, subcategory, kind, title, summary, body_blocks,
  youtube_url, audio_url, cover_image_url, duration_seconds, sort_order,
  status, published, published_at, created_by, created_at, updated_at
`;

function contentsFrom(client: Client) {
  return client.from("sleep_contents");
}

async function requireClient(): Promise<Client> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase が設定されていません");
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

function isMissingTable(message: string): boolean {
  return /Could not find the table ['"]?public\.sleep_contents|relation ["']sleep_contents["'] does not exist/i.test(
    message,
  );
}

function missingTableError(error: { message: string }): never {
  if (isMissingTable(error.message)) {
    throw new Error(
      "睡眠コンテンツのデータベースが未設定です。supabase/sleep-content.sql を実行してください。",
    );
  }
  throw new Error(error.message);
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function asRow(data: unknown): SleepContentRow {
  return data as SleepContentRow;
}

function mapContent(row: SleepContentRow): SleepContent {
  const category = isSleepContentCategory(row.category) ? row.category : "rest";
  const kind = isSleepContentKind(row.kind) ? row.kind : "article";
  const subcategory =
    row.subcategory && isSleepContentSubcategory(row.subcategory)
      ? row.subcategory
      : null;
  const status = isSleepContentStatus(row.status) ? row.status : "draft";
  return {
    id: row.id,
    slug: text(row.slug),
    category,
    subcategory,
    kind,
    title: text(row.title),
    summary: text(row.summary),
    bodyBlocks: parseBodyBlocks(row.body_blocks),
    youtubeUrl: text(row.youtube_url),
    audioUrl: text(row.audio_url),
    coverImageUrl: text(row.cover_image_url),
    durationSeconds:
      typeof row.duration_seconds === "number" ? row.duration_seconds : null,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    status,
    published: Boolean(row.published),
    publishedAt: row.published_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOne(data: unknown): SleepContent | null {
  if (!data) return null;
  return mapContent(asRow(data));
}

export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function assertCategoryKind(
  category: SleepContentCategory,
  kind: SleepContentKind,
  subcategory: SleepContentSubcategory | null,
): void {
  if (category === "rest") {
    if (
      kind !== "talk_video" &&
      kind !== "nature_sound" &&
      kind !== "practice_video" &&
      kind !== "sleep_music"
    ) {
      throw new Error("入眠の種別を選択してください");
    }
    if (subcategory) {
      throw new Error("入眠にサブカテゴリは設定できません");
    }
    return;
  }
  if (category === "science") {
    if (kind !== "article") {
      throw new Error("睡眠学は記事のみ登録できます");
    }
    if (!subcategory) {
      throw new Error("睡眠学のサブカテゴリを選択してください");
    }
    return;
  }
  if (kind !== "interview") {
    throw new Error("インタビューの種別が不正です");
  }
  if (subcategory) {
    throw new Error("インタビューにサブカテゴリは設定できません");
  }
}

function sanitizeYoutubeUrl(value: string): string {
  const url = text(value);
  if (!url) return "";
  if (url.includes("<") || url.toLowerCase().includes("iframe")) {
    throw new Error("YouTube は URL のみ入力してください（埋め込みHTMLは不可）");
  }
  return url;
}

function normalizeBlocks(blocks: SleepContentBlock[] | undefined): SleepContentBlock[] {
  return parseBodyBlocks(blocks ?? []);
}

function fieldsFromInput(
  input: SleepContentInput,
  status: SleepContentStatus,
): Record<string, unknown> {
  const category = input.category;
  const kind = input.kind;
  const subcategory =
    category === "science" ? (input.subcategory ?? null) : null;
  assertCategoryKind(category, kind, subcategory);

  const title = text(input.title);
  if (!title) throw new Error("タイトルを入力してください");

  const youtubeUrl = isYoutubeKind(kind)
    ? sanitizeYoutubeUrl(input.youtubeUrl ?? "")
    : text(input.youtubeUrl);
  const audioUrl = text(input.audioUrl);
  const bodyBlocks =
    kind === "article" ? normalizeBlocks(input.bodyBlocks) : [];

  if (status === "published") {
    if ((kind === "talk_video" || kind === "interview") && !youtubeUrl) {
      throw new Error("YouTube URL を入力してください");
    }
    if ((kind === "nature_sound" || kind === "sleep_music") && !audioUrl) {
      throw new Error(
        kind === "sleep_music"
          ? "入眠音楽ファイルをアップロードしてください"
          : "自然音ファイルをアップロードしてください",
      );
    }
  }

  const sortOrder =
    typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
      ? Math.trunc(input.sortOrder)
      : 0;
  const duration =
    typeof input.durationSeconds === "number" &&
    Number.isFinite(input.durationSeconds)
      ? Math.trunc(input.durationSeconds)
      : null;

  return {
    category,
    subcategory,
    kind,
    title,
    summary: text(input.summary),
    body_blocks: bodyBlocks,
    youtube_url: youtubeUrl,
    audio_url: audioUrl,
    cover_image_url: text(input.coverImageUrl),
    duration_seconds: duration,
    sort_order: sortOrder,
    status,
  };
}

export async function listAllSleepContentsForAdmin(): Promise<SleepContent[]> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const { data, error } = await contentsFrom(supabase)
    .select(CONTENT_SELECT)
    .order("category", { ascending: true })
    .order("subcategory", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[sleep-content] listAll:", error.message);
    missingTableError(error);
  }
  return ((data as unknown[]) ?? []).map((row) => mapContent(asRow(row)));
}

async function getRowById(
  id: string,
  supabase: Client,
): Promise<SleepContent | null> {
  const { data, error } = await contentsFrom(supabase)
    .select(CONTENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) missingTableError(error);
  return mapOne(data);
}

export async function getSleepContentByIdForAdmin(
  id: string,
): Promise<SleepContent | null> {
  await requireAdminProfile();
  const supabase = await requireClient();
  return getRowById(id, supabase);
}

export async function createSleepContentAsAdmin(
  input: SleepContentInput,
  status: SleepContentStatus,
): Promise<SleepContent> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const slug = normalizeSlug(input.slug ?? "");
  if (!slug) throw new Error("slug を入力してください");
  if (!isValidSlug(slug)) {
    throw new Error("slug は英小文字・数字・ハイフンのみです");
  }

  const payload = {
    ...fieldsFromInput(input, status),
    slug,
    created_by: user.id,
  };
  const { data, error } = await contentsFrom(supabase)
    .insert(payload as never)
    .select(CONTENT_SELECT)
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("この slug は既に使われています");
    }
    missingTableError(error);
  }
  const created = mapOne(data);
  if (!created) throw new Error("コンテンツの登録に失敗しました");
  return created;
}

export async function updateSleepContentAsAdmin(
  id: string,
  input: SleepContentInput,
  status: SleepContentStatus,
): Promise<SleepContent> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getRowById(id, supabase);
  if (!existing) throw new Error("コンテンツが見つかりません");

  const { data, error } = await contentsFrom(supabase)
    .update(fieldsFromInput(input, status) as never)
    .eq("id", id)
    .select(CONTENT_SELECT)
    .single();
  if (error) missingTableError(error);
  const saved = mapOne(data);
  if (!saved) throw new Error("コンテンツの保存に失敗しました");
  return saved;
}

export async function setSleepContentStatusAsAdmin(
  id: string,
  status: SleepContentStatus,
): Promise<SleepContent> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getRowById(id, supabase);
  if (!existing) throw new Error("コンテンツが見つかりません");
  if (status === "published") {
    fieldsFromInput(
      {
        category: existing.category,
        subcategory: existing.subcategory,
        kind: existing.kind,
        title: existing.title,
        summary: existing.summary,
        bodyBlocks: existing.bodyBlocks,
        youtubeUrl: existing.youtubeUrl,
        audioUrl: existing.audioUrl,
        coverImageUrl: existing.coverImageUrl,
        durationSeconds: existing.durationSeconds,
        sortOrder: existing.sortOrder,
      },
      status,
    );
  }
  const { data, error } = await contentsFrom(supabase)
    .update({ status } as never)
    .eq("id", id)
    .select(CONTENT_SELECT)
    .single();
  if (error) missingTableError(error);
  const saved = mapOne(data);
  if (!saved) throw new Error("コンテンツの保存に失敗しました");
  return saved;
}

export async function deleteSleepContentAsAdmin(id: string): Promise<void> {
  await requireAdminProfile();
  const supabase = await requireClient();
  const existing = await getRowById(id, supabase);
  if (!existing) throw new Error("コンテンツが見つかりません");
  const { error } = await contentsFrom(supabase).delete().eq("id", id);
  if (error) missingTableError(error);
}

export async function listPublishedScienceArticles(): Promise<SleepContent[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await requireClient();
    const { data, error } = await contentsFrom(supabase)
      .select(CONTENT_SELECT)
      .eq("published", true)
      .eq("status", "published")
      .eq("category", "science")
      .eq("kind", "article")
      .order("subcategory", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) {
      if (isMissingTable(error.message)) return [];
      console.error("[sleep-content] listPublishedScience:", error.message);
      return [];
    }
    return ((data as unknown[]) ?? []).map((row) => mapContent(asRow(row)));
  } catch (error) {
    console.error("[sleep-content] listPublishedScience:", error);
    return [];
  }
}

export async function listPublishedRestContentByKind(
  kind: "talk_video" | "nature_sound" | "practice_video" | "sleep_music",
): Promise<SleepContent[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await requireClient();
    const { data, error } = await contentsFrom(supabase)
      .select(CONTENT_SELECT)
      .eq("published", true)
      .eq("status", "published")
      .eq("category", "rest")
      .eq("kind", kind)
      .order("sort_order", { ascending: true });
    if (error) {
      if (isMissingTable(error.message)) return [];
      console.error("[sleep-content] listPublishedRestByKind:", error.message);
      return [];
    }
    return ((data as unknown[]) ?? []).map((row) => mapContent(asRow(row)));
  } catch (error) {
    console.error("[sleep-content] listPublishedRestByKind:", error);
    return [];
  }
}

export async function getPublishedScienceArticleBySlug(
  slug: string,
): Promise<SleepContent | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await requireClient();
    const { data, error } = await contentsFrom(supabase)
      .select(CONTENT_SELECT)
      .eq("slug", normalized)
      .eq("published", true)
      .eq("status", "published")
      .eq("category", "science")
      .eq("kind", "article")
      .maybeSingle();
    if (error) {
      if (isMissingTable(error.message)) return null;
      console.error("[sleep-content] getPublishedScienceBySlug:", error.message);
      return null;
    }
    return mapOne(data);
  } catch (error) {
    console.error("[sleep-content] getPublishedScienceBySlug:", error);
    return null;
  }
}
