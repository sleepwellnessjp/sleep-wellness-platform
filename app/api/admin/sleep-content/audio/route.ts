import { NextResponse } from "next/server";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import {
  SLEEP_CONTENT_AUDIO_BUCKET,
  SLEEP_CONTENT_AUDIO_MAX_BYTES,
  SLEEP_CONTENT_AUDIO_MIME_TYPES,
} from "@/lib/sleep-content/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function mimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "";
}

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

type SignRequest = {
  filename?: string;
  contentType?: string;
  size?: number;
};

/**
 * 音声ファイル本体は Vercel のリクエスト上限（約 4.5MB）を超えるため、
 * ここでは署名付きアップロード URL だけを発行する。
 * ファイルはブラウザから Supabase Storage へ直接送る。
 */
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

    let payload: SignRequest = {};
    try {
      payload = (await request.json()) as SignRequest;
    } catch {
      return NextResponse.json(
        { error: "リクエスト形式が不正です" },
        { status: 400 },
      );
    }

    const filename = (payload.filename ?? "").trim();
    const size =
      typeof payload.size === "number" && Number.isFinite(payload.size)
        ? payload.size
        : 0;
    const detectedMime = normalizeAudioMime(
      payload.contentType || mimeFromFilename(filename),
    );

    if (!filename) {
      return NextResponse.json(
        { error: "音声ファイルを指定してください" },
        { status: 400 },
      );
    }
    if (!isAllowedMime(detectedMime)) {
      return NextResponse.json(
        {
          error:
            "対応形式は MP3 / M4A / WAV / OGG / WEBM のみです（ファイル形式を確認してください）",
        },
        { status: 400 },
      );
    }
    if (size <= 0) {
      return NextResponse.json(
        { error: "音声ファイルのサイズが不正です" },
        { status: 400 },
      );
    }
    if (size > SLEEP_CONTENT_AUDIO_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `音声が大きすぎます（上限 ${Math.round(SLEEP_CONTENT_AUDIO_MAX_BYTES / (1024 * 1024))}MB）`,
        },
        { status: 400 },
      );
    }

    const path = `${user.id}/${crypto.randomUUID()}.${extensionForMime(detectedMime)}`;
    const { data, error: signError } = await supabase.storage
      .from(SLEEP_CONTENT_AUDIO_BUCKET)
      .createSignedUploadUrl(path);
    if (signError || !data?.token || !data.path) {
      throw new Error(
        signError?.message ||
          "アップロード用 URL の発行に失敗しました。管理者権限と Storage ポリシーを確認してください。",
      );
    }

    const { data: publicData } = supabase.storage
      .from(SLEEP_CONTENT_AUDIO_BUCKET)
      .getPublicUrl(data.path);

    return NextResponse.json({
      bucket: SLEEP_CONTENT_AUDIO_BUCKET,
      path: data.path,
      token: data.token,
      contentType: detectedMime,
      publicUrl: publicData.publicUrl,
    });
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
