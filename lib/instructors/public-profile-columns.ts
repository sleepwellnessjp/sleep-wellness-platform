import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError } from "@/lib/supabase/errors";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** 公開プロフィール取得で使う列（存在するものだけ SELECT する） */
export const CERTIFIED_INSTRUCTOR_PUBLIC_COLUMNS = [
  "id",
  "user_id",
  "school_id",
  "level_id",
  "instructor_number",
  "display_name",
  "email",
  "status",
  "certified_at",
  "renews_at",
  "usage_start_date",
  "suspended_at",
  "withdrawn_at",
  "last_renewed_at",
  "status_history",
  "admin_memo",
  "created_at",
  "updated_at",
  "profile_image_url",
  "public_name",
  "public_display_name",
  "legal_name",
  "show_legal_name",
  "headline",
  "bio",
  "career",
  "activity_area",
  "service_area",
  "online_available",
  "yoga_specialties",
  "pilates_specialties",
  "specialties",
  "available_programs",
  "instagram_url",
  "website_url",
  "contact_email",
  "is_public",
  "recommendation_note",
  "display_order",
  "profile_updated_at",
] as const;

type ColumnCache = {
  columns: string[];
  select: string;
  hasIsPublic: boolean;
  hasDisplayOrder: boolean;
  hasPublicDisplayName: boolean;
};

let cache: ColumnCache | null = null;
let probing: Promise<ColumnCache> | null = null;

async function columnExists(client: Client, column: string): Promise<boolean> {
  const { error } = await client
    .from("certified_instructors")
    .select(column)
    .limit(1);
  if (!error) return true;
  if (isMissingColumnError(error)) return false;
  // 権限・RLS 等は「列はある」とみなし SELECT に含める
  return true;
}

/**
 * certified_instructors の利用可能列を解決（idempotent な probe、結果をキャッシュ）。
 * 本番 DB に公開プロフィール列が未適用でも、存在する列だけで一覧を返す。
 */
export async function resolveCertifiedInstructorPublicSelect(
  client: Client,
): Promise<ColumnCache> {
  if (cache) return cache;
  if (probing) return probing;

  probing = (async () => {
    const present: string[] = [];
    // 並列にすると PostgREST 負荷が高いのでチャンクで確認
    const chunkSize = 6;
    for (let i = 0; i < CERTIFIED_INSTRUCTOR_PUBLIC_COLUMNS.length; i += chunkSize) {
      const chunk = CERTIFIED_INSTRUCTOR_PUBLIC_COLUMNS.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (column) => ({
          column,
          ok: await columnExists(client, column),
        })),
      );
      for (const result of results) {
        if (result.ok) present.push(result.column);
      }
    }

    // 最低限 id は必要
    if (!present.includes("id")) {
      present.unshift("id");
    }

    const resolved: ColumnCache = {
      columns: present,
      select: present.join(", "),
      hasIsPublic: present.includes("is_public"),
      hasDisplayOrder: present.includes("display_order"),
      hasPublicDisplayName: present.includes("public_display_name"),
    };
    cache = resolved;
    probing = null;

    if (!resolved.hasIsPublic || !present.includes("profile_image_url")) {
      console.warn(
        "[instructors] 公開プロフィール列が不足しています。supabase/instructor-public-profiles.sql を適用してください。",
        {
          hasIsPublic: resolved.hasIsPublic,
          hasProfileImageUrl: present.includes("profile_image_url"),
        },
      );
    }

    return resolved;
  })();

  return probing;
}

/** マイグレーション適用後にキャッシュを破棄したい場合用 */
export function resetCertifiedInstructorPublicSelectCache(): void {
  cache = null;
  probing = null;
}
