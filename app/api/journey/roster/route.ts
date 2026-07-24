import { NextResponse } from "next/server";
import {
  listDemoInstructorJourneyRoster,
} from "@/lib/journey/demo-journey-store";
import {
  listInstructorJourneyRoster,
  toJapaneseJourneyError,
} from "@/lib/journey/journey-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        roster: listDemoInstructorJourneyRoster(),
      });
    }
    const roster = await listInstructorJourneyRoster();
    return NextResponse.json({ roster });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseJourneyError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
