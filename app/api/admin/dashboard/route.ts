import { NextResponse } from "next/server";
import { getDemoAdminDashboard } from "@/lib/admin/demo-admin-store";
import { getAdminDashboardStats } from "@/lib/admin/admin-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ stats: getDemoAdminDashboard() });
    }
    const stats = await getAdminDashboardStats();
    return NextResponse.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
