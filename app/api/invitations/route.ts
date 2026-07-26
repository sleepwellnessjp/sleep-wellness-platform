import { NextResponse } from "next/server";
import { safeAudit } from "@/lib/audit/audit-service";
import {
  createInvitation,
  listMyInvitations,
  revokeInvitation,
  sendInvitation,
  acceptInvitationByCode,
  peekInvitationByCode,
} from "@/lib/invitations/invitation-service";
import { isInvitationStatus } from "@/lib/invitations/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const statusParam = searchParams.get("status") ?? "all";
  const q = searchParams.get("q") ?? "";

  try {
    if (code) {
      const invitation = await peekInvitationByCode(code);
      return NextResponse.json({ invitation });
    }

    const status =
      statusParam === "all" || !isInvitationStatus(statusParam)
        ? "all"
        : statusParam;
    const invitations = await listMyInvitations({ status, q });
    return NextResponse.json({ invitations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const status =
      message === "Unauthorized"
        ? 401
        : message.startsWith("Forbidden")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      clientName?: string;
      clientEmail?: string;
      clientId?: string | null;
      expiresInDays?: number;
      id?: string;
      code?: string;
    };

    const origin = new URL(request.url).origin;

    if (body.action === "accept" && body.code) {
      const result = await acceptInvitationByCode(body.code);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    if (body.action === "send" && body.id) {
      const result = await sendInvitation(body.id);
      await safeAudit({
        action: "invitation_send",
        resourceType: "invitation",
        resourceId: result.invitation.id,
        summary: result.emailSent
          ? `招待メールを送信しました（${result.invitation.clientEmail}）`
          : `招待を発行しました（メール未送信: ${result.invitation.clientEmail}）`,
        payload: {
          code: result.invitation.code,
          emailSent: result.emailSent,
        },
      });
      return NextResponse.json({
        invitation: result.invitation,
        emailSent: result.emailSent,
        message: result.message,
      });
    }

    if (body.action === "revoke" && body.id) {
      const invitation = await revokeInvitation(body.id);
      return NextResponse.json({ invitation });
    }

    if (!body.clientName?.trim() || !body.clientEmail?.trim()) {
      return NextResponse.json(
        { error: "氏名とメールアドレスは必須です" },
        { status: 400 },
      );
    }

    const invitation = await createInvitation(
      {
        clientName: body.clientName,
        clientEmail: body.clientEmail,
        clientId: body.clientId ?? null,
        expiresInDays: body.expiresInDays,
      },
      origin,
    );

    await safeAudit({
      action: "invitation_create",
      resourceType: "invitation",
      resourceId: invitation.id,
      summary: `クライアント招待を作成しました（${invitation.clientEmail}）`,
      payload: { code: invitation.code },
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "処理に失敗しました";
    const status =
      message === "Unauthorized"
        ? 401
        : message.startsWith("Forbidden")
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
