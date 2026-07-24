import { NextResponse } from "next/server";
import { listAuditLogs } from "@/lib/audit/audit-service";
import { isAuditAction } from "@/lib/audit/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const actionParam = searchParams.get("action") ?? "all";
  const q = searchParams.get("q") ?? "";

  try {
    const action =
      actionParam === "all" || !isAuditAction(actionParam)
        ? "all"
        : actionParam;
    const logs = await listAuditLogs({ action, q, limit: 150 });
    return NextResponse.json({ logs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
