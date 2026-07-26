import { NextResponse } from "next/server";
import { getPublicInstructor } from "@/lib/instructors/instructor-profile-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "IDが不正です" }, { status: 400 });
    }

    const instructor = await getPublicInstructor(id);
    if (!instructor) {
      return NextResponse.json(
        { error: "公開プロフィールが見つかりません" },
        { status: 404 },
      );
    }

    return NextResponse.json({ instructor });
  } catch (error) {
    console.error("[api/instructors/[id]]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "プロフィールの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}
