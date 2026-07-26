import { NextResponse } from "next/server";
import {
  getOwnInstructorProfile,
  updateOwnInstructorProfile,
} from "@/lib/instructors/instructor-profile-service";
import {
  INSTRUCTOR_PROFILE_BUCKET,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_MIME_TYPES,
} from "@/lib/instructors/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function isAllowedMime(type: string): boolean {
  const normalized = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type;
  return (PROFILE_IMAGE_MIME_TYPES as readonly string[]).includes(normalized);
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const own = await getOwnInstructorProfile(supabase);
    if (!own) {
      return NextResponse.json(
        { error: "認定講師レコードが見つかりません" },
        { status: 404 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "画像ファイルを指定してください" },
        { status: 400 },
      );
    }

    if (!isAllowedMime(file.type)) {
      return NextResponse.json(
        { error: "対応形式は JPG / JPEG / PNG / WebP のみです" },
        { status: 400 },
      );
    }

    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `画像が大きすぎます（上限 ${Math.round(PROFILE_IMAGE_MAX_BYTES / (1024 * 1024))}MB）`,
        },
        { status: 400 },
      );
    }

    const mime =
      file.type.toLowerCase() === "image/jpg" ? "image/jpeg" : file.type;
    const ext =
      mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/profile.${ext}`;

    // 旧拡張子のファイルを掃除
    const { data: existing } = await supabase.storage
      .from(INSTRUCTOR_PROFILE_BUCKET)
      .list(user.id);
    if (existing && existing.length > 0) {
      const toRemove = existing
        .map((item) => `${user.id}/${item.name}`)
        .filter((name) => name !== path);
      if (toRemove.length > 0) {
        await supabase.storage.from(INSTRUCTOR_PROFILE_BUCKET).remove(toRemove);
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(INSTRUCTOR_PROFILE_BUCKET)
      .upload(path, buffer, {
        contentType: mime,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[api/instructor/profile/photo]", uploadError.message);
      return NextResponse.json(
        {
          error:
            uploadError.message.includes("Bucket not found")
              ? "Storage バケット未設定です。supabase/instructor-profile-storage.sql を実行してください。"
              : uploadError.message,
        },
        { status: 500 },
      );
    }

    const { data: publicUrl } = supabase.storage
      .from(INSTRUCTOR_PROFILE_BUCKET)
      .getPublicUrl(path);

    const url = `${publicUrl.publicUrl}?v=${Date.now()}`;
    const profile = await updateOwnInstructorProfile(
      { profileImageUrl: url },
      supabase,
    );

    return NextResponse.json({ profile, url });
  } catch (error) {
    console.error("[api/instructor/profile/photo POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "写真のアップロードに失敗しました",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const own = await getOwnInstructorProfile(supabase);
    if (!own) {
      return NextResponse.json(
        { error: "認定講師レコードが見つかりません" },
        { status: 404 },
      );
    }

    const { data: existing } = await supabase.storage
      .from(INSTRUCTOR_PROFILE_BUCKET)
      .list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage
        .from(INSTRUCTOR_PROFILE_BUCKET)
        .remove(existing.map((item) => `${user.id}/${item.name}`));
    }

    const profile = await updateOwnInstructorProfile(
      { profileImageUrl: null },
      supabase,
    );
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[api/instructor/profile/photo DELETE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "写真の削除に失敗しました",
      },
      { status: 500 },
    );
  }
}
