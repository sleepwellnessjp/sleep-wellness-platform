import { NextResponse } from "next/server";
import { fetchPlatformMe } from "@/lib/platform/analysis-gate";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  const data = await fetchPlatformMe();
  if (!data) {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Platform data unavailable" },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(data);
}
