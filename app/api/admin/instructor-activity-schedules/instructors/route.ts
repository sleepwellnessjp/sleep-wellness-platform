import { NextResponse } from "next/server";
import { listInstructorsForScheduleAdmin } from "@/lib/instructor-activity-schedules/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function errorStatus(message: string): number {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 400;
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const instructors = await listInstructorsForScheduleAdmin();
    return NextResponse.json({ instructors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
