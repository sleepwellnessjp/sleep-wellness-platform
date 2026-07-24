import { NextResponse } from "next/server";
import { safeAudit } from "@/lib/audit/audit-service";
import type { AuditAction } from "@/lib/audit/types";
import { isAuditAction } from "@/lib/audit/constants";

function clientMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent");
  return { ipAddress, userAgent };
}

/** クライアント／サーバー双方から重要操作を記録（actor はサーバーで確定） */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      summary?: string;
      resourceType?: string | null;
      resourceId?: string | null;
      payload?: Record<string, unknown>;
    };

    if (!body.action || !isAuditAction(body.action) || !body.summary?.trim()) {
      return NextResponse.json(
        { error: "action と summary は必須です" },
        { status: 400 },
      );
    }

    const { ipAddress, userAgent } = clientMeta(request);

    await safeAudit({
      action: body.action as AuditAction,
      summary: body.summary.trim(),
      resourceType: body.resourceType ?? null,
      resourceId: body.resourceId ?? null,
      payload: body.payload ?? {},
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "記録に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
