import { NextResponse } from "next/server";
import { requireDeveloperAdmin } from "@/lib/api-platform/auth";
import { apiPlatformService } from "@/lib/api-platform/service";
import type { ApiKeyScope } from "@/lib/api-platform/types";
import { ALL_API_SCOPES } from "@/lib/api-platform/types";

export async function GET() {
  try {
    await requireDeveloperAdmin();
    return NextResponse.json(apiPlatformService.getDashboard());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireDeveloperAdmin();
    const body = (await request.json()) as {
      name?: string;
      appName?: string;
      scopes?: string[];
      expiresAt?: string | null;
      rateLimitPerMinute?: number;
    };

    const scopes = (body.scopes ?? ["*"]).filter((s): s is ApiKeyScope =>
      ALL_API_SCOPES.includes(s as ApiKeyScope),
    );

    const issued = apiPlatformService.createKey({
      name: body.name?.trim() || "Untitled Key",
      appName: body.appName?.trim() || "Untitled App",
      scopes: scopes.length > 0 ? scopes : ["*"],
      expiresAt: body.expiresAt ?? null,
      rateLimitPerMinute: body.rateLimitPerMinute,
      createdBy: admin.id,
    });

    return NextResponse.json({ key: issued }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
