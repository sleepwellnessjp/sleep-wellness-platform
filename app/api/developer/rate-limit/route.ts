import { NextResponse } from "next/server";
import { requireDeveloperAdmin } from "@/lib/api-platform/auth";
import { apiPlatformService } from "@/lib/api-platform/service";

export async function GET() {
  try {
    await requireDeveloperAdmin();
    return NextResponse.json({ rateLimit: apiPlatformService.getRateLimit() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    await requireDeveloperAdmin();
    const body = (await request.json()) as {
      defaultPerMinute?: number;
      burstPerMinute?: number;
      authenticatedPerMinute?: number;
    };
    const rateLimit = apiPlatformService.updateRateLimit(body);
    return NextResponse.json({ rateLimit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
