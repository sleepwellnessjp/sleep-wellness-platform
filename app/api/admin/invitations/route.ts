import { NextResponse } from "next/server";
import { listAdminInvitations } from "@/lib/invitations/invitation-service";
import { isInvitationStatus } from "@/lib/invitations/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "all";
  const q = searchParams.get("q") ?? "";

  try {
    const status =
      statusParam === "all" || !isInvitationStatus(statusParam)
        ? "all"
        : statusParam;
    const invitations = await listAdminInvitations({ status, q });
    return NextResponse.json({ invitations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
