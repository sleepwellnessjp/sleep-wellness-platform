import { NextResponse } from "next/server";
import { getDemoSwiInsights } from "@/lib/swi/demo-swi-store";
import { getSwiInsightsOverview } from "@/lib/swi/swi-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        insights: getDemoSwiInsights("instructor"),
      });
    }
    const insights = await getSwiInsightsOverview();
    return NextResponse.json({ insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
