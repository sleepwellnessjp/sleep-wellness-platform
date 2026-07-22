import { NextResponse } from "next/server";
import { requireDeveloperAdmin } from "@/lib/api-platform/auth";
import { apiPlatformService } from "@/lib/api-platform/service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireDeveloperAdmin();
    const { id } = await context.params;
    const revoked = apiPlatformService.revokeKey(id);
    if (!revoked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ key: revoked });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Revoke via POST for form clients. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return DELETE(request, context);
}
