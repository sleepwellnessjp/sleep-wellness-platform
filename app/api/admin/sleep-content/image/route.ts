import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import {
  SLEEP_CONTENT_IMAGE_BUCKET,
  SLEEP_CONTENT_IMAGE_MAX_BYTES,
  SLEEP_CONTENT_IMAGE_MIME_TYPES,
} from "@/lib/sleep-content/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function isAllowedMime(type: string): boolean {
  const normalized = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type;
  return (SLEEP_CONTENT_IMAGE_MIME_TYPES as readonly string[]).includes(
    normalized,
  );
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    await requireAdminProfile();
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
        { error: "対応形式は JPG / JPEG / PNG / WebP / SVG のみです" },
        { status: 400 },
      );
    }
    if (file.size > SLEEP_CONTENT_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `画像が大きすぎます（上限 ${Math.round(SLEEP_CONTENT_IMAGE_MAX_BYTES / (1024 * 1024))}MB）`,
        },
        { status: 400 },
      );
    }

    const mime =
      file.type.toLowerCase() === "image/jpg" ? "image/jpeg" : file.type;
    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/svg+xml"
            ? "svg"
            : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(SLEEP_CONTENT_IMAGE_BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: false });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    const { data } = supabase.storage
      .from(SLEEP_CONTENT_IMAGE_BUCKET)
      .getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[api/admin/sleep-content/image POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "画像のアップロードに失敗しました",
      },
      { status: 500 },
    );
  }
}
