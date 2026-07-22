import { NextResponse } from "next/server";
import { listDemoAdminClients } from "@/lib/admin/demo-admin-store";
import { listAdminClients } from "@/lib/admin/admin-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ clients: listDemoAdminClients() });
    }
    const clients = await listAdminClients();
    return NextResponse.json({ clients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
