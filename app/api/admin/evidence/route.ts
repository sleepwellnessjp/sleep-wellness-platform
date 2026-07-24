import { NextResponse } from "next/server";
import { getDemoEvidenceCollectionBundle } from "@/lib/evidence";
import {
  getEvidenceCollectionBundle,
  toEvidenceAuthError,
} from "@/lib/evidence/evidence-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        bundle: getDemoEvidenceCollectionBundle(),
        source: "demo",
      });
    }
    const bundle = await getEvidenceCollectionBundle();
    return NextResponse.json({ bundle, source: "live" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toEvidenceAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}
