import { NextResponse } from "next/server";
import { listCommercialSubscriptions } from "@/lib/subscription/subscription-service";
import { COMMERCIAL_PLANS } from "@/lib/subscription/constants";

export async function GET() {
  try {
    const subscriptions = await listCommercialSubscriptions();
    return NextResponse.json({
      plans: COMMERCIAL_PLANS,
      subscriptions,
      mock: true,
      note: "課金ゲートウェイ未接続 — Version 2.2 モック",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
