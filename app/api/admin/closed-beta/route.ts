import { NextResponse } from "next/server";
import { getDemoClosedBetaOpsBundle } from "@/lib/closed-beta";
import {
  getClosedBetaOpsBundle,
  toClosedBetaAuthError,
} from "@/lib/closed-beta/closed-beta-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        bundle: getDemoClosedBetaOpsBundle(),
        source: "demo",
      });
    }
    const bundle = await getClosedBetaOpsBundle();
    return NextResponse.json({ bundle, source: "live" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toClosedBetaAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}
