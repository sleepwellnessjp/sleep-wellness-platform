import { NextResponse } from "next/server";
import { getDemoInstructorOpsDashboard } from "@/lib/ops/demo-ops-store";
import {
  getInstructorOpsDashboard,
  toJapaneseAuthError,
} from "@/lib/ops/ops-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        dashboard: getDemoInstructorOpsDashboard(),
      });
    }
    return NextResponse.json({
      dashboard: await getInstructorOpsDashboard(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}
