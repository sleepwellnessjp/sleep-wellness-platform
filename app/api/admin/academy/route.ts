import { NextResponse } from "next/server";
import { getDemoAdminAcademy } from "@/lib/admin/demo-admin-store";
import { getAdminAcademyOverview } from "@/lib/admin/admin-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ academy: getDemoAdminAcademy() });
    }
    const academy = await getAdminAcademyOverview();
    return NextResponse.json({ academy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
