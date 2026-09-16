import type { SupabaseClient } from "@supabase/supabase-js";
import {
  INSTRUCTOR_PROFILE_BUCKET,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_MIME_TYPES,
} from "@/lib/instructors/types";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** 管理画面・API 共通: アカウント未連携時の拒否メッセージ */
export const INSTRUCTOR_PHOTO_ACCOUNT_UNLINKED_ERROR =
  "この講師はアカウント未連携のため、写真を登録できません";

function isAllowedMime(type: string): boolean {
  const normalized = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type;
  return (PROFILE_IMAGE_MIME_TYPES as readonly string[]).includes(normalized);
}

export function assertProfilePhotoFile(file: File): {
  mime: string;
  ext: "png" | "webp" | "jpg";
} {
  if (!isAllowedMime(file.type)) {
    throw new Error("対応形式は JPG / JPEG / PNG / WebP のみです");
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error(
      `画像が大きすぎます（上限 ${Math.round(PROFILE_IMAGE_MAX_BYTES / (1024 * 1024))}MB）`,
    );
  }
  const mime =
    file.type.toLowerCase() === "image/jpg" ? "image/jpeg" : file.type;
  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return { mime, ext };
}

export function requireLinkedOwnerUserId(
  userId: string | null | undefined,
): string {
  const id = (userId ?? "").trim();
  if (!id) {
    throw new Error(INSTRUCTOR_PHOTO_ACCOUNT_UNLINKED_ERROR);
  }
  return id;
}

/**
 * Storage へプロフィール写真を保存する（パス: {ownerUserId}/profile.{ext}）。
 * DB 更新は呼び出し側で行う。
 */
export async function uploadInstructorProfilePhoto(params: {
  supabase: Client;
  ownerUserId: string | null | undefined;
  file: File;
}): Promise<{ url: string; path: string }> {
  const ownerUserId = requireLinkedOwnerUserId(params.ownerUserId);
  const { mime, ext } = assertProfilePhotoFile(params.file);
  const path = `${ownerUserId}/profile.${ext}`;

  const { data: existing } = await params.supabase.storage
    .from(INSTRUCTOR_PROFILE_BUCKET)
    .list(ownerUserId);
  if (existing && existing.length > 0) {
    const toRemove = existing
      .map((item) => `${ownerUserId}/${item.name}`)
      .filter((name) => name !== path);
    if (toRemove.length > 0) {
      await params.supabase.storage
        .from(INSTRUCTOR_PROFILE_BUCKET)
        .remove(toRemove);
    }
  }

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error: uploadError } = await params.supabase.storage
    .from(INSTRUCTOR_PROFILE_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(
      uploadError.message.includes("Bucket not found")
        ? "Storage バケット未設定です。supabase/instructor-profile-storage.sql を実行してください。"
        : uploadError.message,
    );
  }

  const { data: publicUrl } = params.supabase.storage
    .from(INSTRUCTOR_PROFILE_BUCKET)
    .getPublicUrl(path);

  return {
    path,
    url: `${publicUrl.publicUrl}?v=${Date.now()}`,
  };
}

/**
 * 講師フォルダ内のプロフィール写真をすべて削除する。
 * DB 更新は呼び出し側で行う。
 */
export async function deleteInstructorProfilePhotos(params: {
  supabase: Client;
  ownerUserId: string | null | undefined;
}): Promise<void> {
  const ownerUserId = requireLinkedOwnerUserId(params.ownerUserId);
  const { data: existing } = await params.supabase.storage
    .from(INSTRUCTOR_PROFILE_BUCKET)
    .list(ownerUserId);
  if (existing && existing.length > 0) {
    await params.supabase.storage
      .from(INSTRUCTOR_PROFILE_BUCKET)
      .remove(existing.map((item) => `${ownerUserId}/${item.name}`));
  }
}
