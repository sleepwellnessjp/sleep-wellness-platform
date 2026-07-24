import { NextResponse } from "next/server";
import { safeAudit } from "@/lib/audit/audit-service";
import {
  getMyCommercialSubscription,
  selectMockCommercialPlan,
} from "@/lib/subscription/subscription-service";
import { COMMERCIAL_PLANS } from "@/lib/subscription/constants";

export async function GET() {
  try {
    const subscription = await getMyCommercialSubscription();
    await safeAudit({
      action: "subscription_view",
      resourceType: "commercial_subscription",
      resourceId: subscription?.id ?? null,
      summary: "課金プラン画面を閲覧しました",
    });
    return NextResponse.json({
      plans: COMMERCIAL_PLANS,
      subscription,
      mock: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Forbidden"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { planId?: string };
    if (
      body.planId !== "basic" &&
      body.planId !== "professional" &&
      body.planId !== "enterprise"
    ) {
      return NextResponse.json({ error: "不正なプランです" }, { status: 400 });
    }
    const subscription = await selectMockCommercialPlan(body.planId);
    return NextResponse.json({ subscription, mock: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新に失敗しました";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Forbidden"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
