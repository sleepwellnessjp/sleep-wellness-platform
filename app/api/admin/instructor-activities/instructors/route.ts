import { NextResponse } from "next/server";
import { listAssignableInstructorsForAdmin } from "@/lib/instructor-activities/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const instructors = await listAssignableInstructorsForAdmin();
    return NextResponse.json({ instructors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
