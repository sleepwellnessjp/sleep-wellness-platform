import { NextResponse } from "next/server";
import { getDemoAdminLogs } from "@/lib/admin/demo-admin-store";
import { getAdminLogBundle } from "@/lib/admin/admin-service";
import type { ActivityLogCategory } from "@/lib/admin/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const CATEGORIES = new Set([
  "login",
  "analysis",
  "pdf",
  "ai",
  "admin",
  "other",
  "all",
]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("category") ?? "all";
    const category = CATEGORIES.has(raw)
      ? (raw as ActivityLogCategory | "all")
      : "all";

    if (!isSupabaseConfigured()) {
      return NextResponse.json(getDemoAdminLogs(category));
    }

    const bundle = await getAdminLogBundle({ category });
    return NextResponse.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
