import { NextResponse } from "next/server";
import {
  getDemoAdminDashboard,
  getDemoAdminHqDashboard,
} from "@/lib/admin/demo-admin-store";
import { getAdminHqDashboard } from "@/lib/admin/admin-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        dashboard: getDemoAdminHqDashboard(),
        stats: getDemoAdminDashboard(),
      });
    }
    const { dashboard, stats } = await getAdminHqDashboard();
    return NextResponse.json({ dashboard, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
