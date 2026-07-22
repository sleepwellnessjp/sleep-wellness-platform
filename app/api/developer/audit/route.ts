import { NextResponse } from "next/server";
import { requireDeveloperAdmin } from "@/lib/api-platform/auth";
import { apiPlatformService } from "@/lib/api-platform/service";

export async function GET(request: Request) {
  try {
    await requireDeveloperAdmin();
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? "100");
    return NextResponse.json({
      logs: apiPlatformService.listAudit(
        Number.isFinite(limit) ? Math.min(limit, 500) : 100,
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
