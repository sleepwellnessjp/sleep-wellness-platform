import { NextResponse } from "next/server";
import { listPublicMelatoninYogaSessions } from "@/lib/melatonin-yoga/public-session-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "現在、日程を取得できません" },
        { status: 503 },
      );
    }
    const sessions = await listPublicMelatoninYogaSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "日程の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
