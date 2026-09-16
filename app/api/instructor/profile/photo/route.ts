import { NextResponse } from "next/server";
import {
  getOwnInstructorProfile,
  updateOwnInstructorProfile,
} from "@/lib/instructors/instructor-profile-service";
import {
  deleteInstructorProfilePhotos,
  uploadInstructorProfilePhoto,
} from "@/lib/instructors/profile-photo-storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

    const { url } = await uploadInstructorProfilePhoto({
      supabase,
      ownerUserId: user.id,
      file,
    });

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

    await deleteInstructorProfilePhotos({
      supabase,
      ownerUserId: user.id,
    });

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
