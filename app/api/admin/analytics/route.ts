import { NextResponse } from "next/server";
import { getDemoAdminAnalytics } from "@/lib/admin/demo-admin-store";
import { getAdminAnalyticsOverview } from "@/lib/admin/admin-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ analytics: getDemoAdminAnalytics() });
    }
    const analytics = await getAdminAnalyticsOverview();
    return NextResponse.json({ analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
