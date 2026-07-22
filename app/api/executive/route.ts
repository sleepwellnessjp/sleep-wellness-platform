import { NextResponse } from "next/server";
import { getDemoExecutiveDashboard } from "@/lib/executive-dashboard";
import { getExecutiveDashboard } from "@/lib/executive-dashboard-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        dashboard: getDemoExecutiveDashboard("platform"),
      });
    }

    const dashboard = await getExecutiveDashboard();
    return NextResponse.json({ dashboard });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    // デモ環境や権限境界ではデモデータへフォールバック（画面は常に価値を見せる）
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: message }, { status });
    }

    console.error("[executive] getExecutiveDashboard failed:", error);
    return NextResponse.json({
      dashboard: getDemoExecutiveDashboard("platform"),
      warning: message,
    });
  }
}
