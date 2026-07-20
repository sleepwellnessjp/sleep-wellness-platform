import { NextResponse } from "next/server";
import { fetchPlatformMe } from "@/lib/platform/analysis-gate";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    const data = await fetchPlatformMe();
    if (!data) {
      if (!isSupabaseConfigured()) {
        console.error("[api/platform/me] Platform unavailable: Supabase not configured");
        return NextResponse.json(
          {
            error: "Platform data unavailable",
            errorType: "Config Error",
            details: "Supabase is not configured.",
          },
          { status: 500 },
        );
      }

      console.error(
        "[api/platform/me] Unauthorized: auth user or profiles row unavailable",
      );
      return NextResponse.json(
        {
          error: "プラットフォーム情報の取得に失敗しました。",
          errorType: "Unauthorized",
          details:
            "認証セッションまたは profiles 行を取得できませんでした。サーバーログを確認してください。",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/platform/me] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "プラットフォーム情報の取得に失敗しました。",
        errorType: "Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
