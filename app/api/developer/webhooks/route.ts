import { NextResponse } from "next/server";
import { requireDeveloperAdmin } from "@/lib/api-platform/auth";
import { apiPlatformService } from "@/lib/api-platform/service";
import type { WebhookEventType } from "@/lib/api-platform/types";
import { WEBHOOK_EVENTS } from "@/lib/api-platform/types";

export async function GET() {
  try {
    await requireDeveloperAdmin();
    return NextResponse.json({
      webhooks: apiPlatformService.listWebhooks(),
      events: WEBHOOK_EVENTS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireDeveloperAdmin();
    const body = (await request.json()) as {
      url?: string;
      events?: string[];
      description?: string;
    };
    if (!body.url?.trim()) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    const events = (body.events ?? []).filter((e): e is WebhookEventType =>
      WEBHOOK_EVENTS.includes(e as WebhookEventType),
    );
    if (events.length === 0) {
      return NextResponse.json(
        { error: "at least one event is required" },
        { status: 400 },
      );
    }
    const webhook = apiPlatformService.createWebhook({
      url: body.url.trim(),
      events,
      description: body.description,
    });
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
