import { NextResponse } from "next/server";
import {
  acceptBetaInstructorInvitation,
  lookupBetaInstructorInvitation,
} from "@/lib/closed-beta/beta-invitation-service";

/** 公開: 認定講師 Beta 招待の照会・受諾（利用規約同意） */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";

  try {
    const invitation = await lookupBetaInstructorInvitation(code);
    if (!invitation) {
      return NextResponse.json(
        { error: "招待コードが見つかりません" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      invitation: {
        code: invitation.code,
        instructorName: invitation.instructorName,
        startDate: invitation.startDate,
        status: invitation.status,
        termsRequired: invitation.termsRequired,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      termsAccepted?: boolean;
    };
    if (!body.code) {
      return NextResponse.json(
        { error: "招待コードを入力してください" },
        { status: 400 },
      );
    }
    const invitation = await acceptBetaInstructorInvitation({
      code: body.code,
      termsAccepted: Boolean(body.termsAccepted),
    });
    return NextResponse.json({ ok: true, invitation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "受諾に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
