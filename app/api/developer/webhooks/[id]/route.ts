import { NextResponse } from "next/server";
import { requireDeveloperAdmin } from "@/lib/api-platform/auth";
import { apiPlatformService } from "@/lib/api-platform/service";
import type { WebhookEventType } from "@/lib/api-platform/types";
import { WEBHOOK_EVENTS } from "@/lib/api-platform/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireDeveloperAdmin();
    const { id } = await context.params;
    const body = (await request.json()) as {
      url?: string;
      events?: string[];
      active?: boolean;
      description?: string;
    };
    const events = body.events
      ? body.events.filter((e): e is WebhookEventType =>
          WEBHOOK_EVENTS.includes(e as WebhookEventType),
        )
      : undefined;
    const webhook = apiPlatformService.updateWebhook(id, {
      url: body.url,
      events,
      active: body.active,
      description: body.description,
    });
    if (!webhook) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ webhook });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireDeveloperAdmin();
    const { id } = await context.params;
    const ok = apiPlatformService.deleteWebhook(id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
