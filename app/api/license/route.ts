import { NextResponse } from "next/server";
import {
  getDemoLicenseActor,
  getDemoMyLicenseBundle,
} from "@/lib/license/demo-license-store";
import {
  getMyLicenseBundle,
  toJapaneseAuthError,
} from "@/lib/license/license-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      const actor = getDemoLicenseActor();
      return NextResponse.json({
        bundle: getDemoMyLicenseBundle(actor.userId),
      });
    }
    const bundle = await getMyLicenseBundle();
    return NextResponse.json({ bundle });
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
