import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/platform/constants";
import { getCurrentProfile } from "@/lib/platform/platform-service";
import { getDemoSwiInsights } from "@/lib/swi/demo-swi-store";
import { getSwiInsightsOverview } from "@/lib/swi/swi-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        insights: getDemoSwiInsights("platform"),
      });
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminRole(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
