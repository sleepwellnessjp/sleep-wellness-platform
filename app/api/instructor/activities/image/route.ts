import { NextResponse } from "next/server";
import { getOwnInstructorProfile } from "@/lib/instructors/instructor-profile-service";
import {
  ACTIVITY_IMAGE_MAX_BYTES,
  ACTIVITY_IMAGE_MIME_TYPES,
  INSTRUCTOR_ACTIVITY_BUCKET,
} from "@/lib/instructor-activities/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function isAllowedMime(type: string): boolean {
  const normalized = type.toLowerCase() === "image/jpg" ? "image/jpeg" : type;
  return (ACTIVITY_IMAGE_MIME_TYPES as readonly string[]).includes(normalized);
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const role =
        profile && typeof profile === "object" && "role" in profile
          ? String((profile as { role?: unknown }).role ?? "")
          : "";
      if (role !== "admin" && role !== "super_admin") {
        return NextResponse.json(
          { error: "認定講師レコードが見つかりません" },
          { status: 404 },
        );
      }
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
    if (file.size > ACTIVITY_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `画像が大きすぎます（上限 ${Math.round(ACTIVITY_IMAGE_MAX_BYTES / (1024 * 1024))}MB）`,
        },
        { status: 400 },
      );
    }

    const mime =
      file.type.toLowerCase() === "image/jpg" ? "image/jpeg" : file.type;
    const ext =
      mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(INSTRUCTOR_ACTIVITY_BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: false });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    const { data } = supabase.storage
      .from(INSTRUCTOR_ACTIVITY_BUCKET)
      .getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("[api/instructor/activities/image POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "画像のアップロードに失敗しました",
      },
      { status: 500 },
    );
  }
}
