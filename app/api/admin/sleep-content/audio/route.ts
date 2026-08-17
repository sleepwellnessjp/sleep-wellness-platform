import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import {
  SLEEP_CONTENT_AUDIO_BUCKET,
  SLEEP_CONTENT_AUDIO_MAX_BYTES,
  SLEEP_CONTENT_AUDIO_MIME_TYPES,
} from "@/lib/sleep-content/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function normalizeAudioMime(type: string): string {
  const lower = type.toLowerCase();
  if (lower === "audio/mp3") return "audio/mpeg";
  if (lower === "audio/x-wav" || lower === "audio/wave") return "audio/wav";
  return lower;
}

function isAllowedMime(type: string): boolean {
  return (SLEEP_CONTENT_AUDIO_MIME_TYPES as readonly string[]).includes(
    normalizeAudioMime(type),
  );
}

function extensionForMime(mime: string): string {
  if (mime === "audio/mp4") return "m4a";
  if (mime === "audio/wav") return "wav";
  if (mime === "audio/ogg") return "ogg";
  if (mime === "audio/webm") return "webm";
  return "mp3";
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
        { error: "音声ファイルを指定してください" },
        { status: 400 },
      );
    }
    if (!isAllowedMime(file.type)) {
      return NextResponse.json(
        { error: "対応形式は MP3 / M4A / WAV / OGG / WEBM のみです" },
        { status: 400 },
      );
    }
    if (file.size > SLEEP_CONTENT_AUDIO_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `音声が大きすぎます（上限 ${Math.round(SLEEP_CONTENT_AUDIO_MAX_BYTES / (1024 * 1024))}MB）`,
        },
        { status: 400 },
      );
    }

    const mime = normalizeAudioMime(file.type);
    const path = `${user.id}/${crypto.randomUUID()}.${extensionForMime(mime)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(SLEEP_CONTENT_AUDIO_BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: false });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    const { data } = supabase.storage
      .from(SLEEP_CONTENT_AUDIO_BUCKET)
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
    console.error("[api/admin/sleep-content/audio POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "音声のアップロードに失敗しました",
      },
      { status: 500 },
    );
  }
}
