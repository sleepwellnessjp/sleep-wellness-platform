import { NextResponse } from "next/server";
import { getDemoAdminJourneyDashboard } from "@/lib/journey/demo-journey-store";
import {
  getAdminJourneyDashboard,
  toJapaneseJourneyError,
} from "@/lib/journey/journey-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        dashboard: getDemoAdminJourneyDashboard(),
      });
    }
    const dashboard = await getAdminJourneyDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseJourneyError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}
