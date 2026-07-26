import { NextResponse } from "next/server";
import {
  getOwnInstructorProfile,
  updateOwnInstructorProfile,
} from "@/lib/instructors/instructor-profile-service";
import type { InstructorProfileUpdateInput } from "@/lib/instructors/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const profile = await getOwnInstructorProfile();
    if (!profile) {
      return NextResponse.json(
        {
          error:
            "認定講師レコードが見つかりません。ログイン中のアカウントに紐づく認定講師情報がありません。",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[api/instructor/profile GET]", error);
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

export async function PATCH(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as InstructorProfileUpdateInput;
    const profile = await updateOwnInstructorProfile(body);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[api/instructor/profile PATCH]", error);
    const message =
      error instanceof Error ? error.message : "プロフィールの保存に失敗しました";
    const status = message.includes("ログイン") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
