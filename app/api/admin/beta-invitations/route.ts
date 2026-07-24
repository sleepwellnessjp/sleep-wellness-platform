import { NextResponse } from "next/server";
import {
  createBetaInstructorInvitation,
  listBetaInstructorInvitations,
  revokeBetaInstructorInvitation,
  sendBetaInstructorInvitation,
} from "@/lib/closed-beta/beta-invitation-service";
import { toClosedBetaAuthError } from "@/lib/closed-beta/closed-beta-service";

/** HQ: 認定講師 Closed Beta 招待の一覧・作成・送信（モック）・取消 */
export async function GET() {
  try {
    const invitations = await listBetaInstructorInvitations();
    return NextResponse.json({ invitations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toClosedBetaAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      id?: string;
      instructorName?: string;
      instructorEmail?: string;
      startDate?: string;
      termsRequired?: boolean;
    };

    if (body.action === "send" && body.id) {
      const invitation = await sendBetaInstructorInvitation(body.id);
      return NextResponse.json({ invitation });
    }

    if (body.action === "revoke" && body.id) {
      const invitation = await revokeBetaInstructorInvitation(body.id);
      return NextResponse.json({ invitation });
    }

    if (!body.instructorName || !body.instructorEmail || !body.startDate) {
      return NextResponse.json(
        { error: "氏名・メール・利用開始日は必須です" },
        { status: 400 },
      );
    }

    const invitation = await createBetaInstructorInvitation({
      instructorName: body.instructorName,
      instructorEmail: body.instructorEmail,
      startDate: body.startDate,
      termsRequired: body.termsRequired !== false,
    });
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "操作に失敗しました";
    const mapped = toClosedBetaAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 400 : mapped.status },
    );
  }
}
