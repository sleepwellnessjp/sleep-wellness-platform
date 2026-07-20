import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listDemoAdminLogs } from "@/lib/platform/demo-platform-store";
import {
  listAdminLogs,
  requireSuperAdminProfile,
} from "@/lib/platform/platform-service";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ logs: listDemoAdminLogs() });
    }
    await requireSuperAdminProfile();
    const logs = await listAdminLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
