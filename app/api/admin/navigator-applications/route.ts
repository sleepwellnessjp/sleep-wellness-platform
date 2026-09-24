import { NextResponse } from "next/server";
import {
  isNavigatorApplicationStatus,
  type NavigatorApplicationRecord,
} from "@/lib/navigator/application-types";
import {
  listNavigatorApplications,
  navigatorApplicationErrorStatus,
  updateNavigatorApplication,
} from "@/lib/navigator/application-service";

export async function GET() {
  try {
    const applications = await listNavigatorApplications();
    return NextResponse.json({ applications });
  } catch (error) {
    const mapped = navigatorApplicationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

type Body = {
  id?: string;
  status?: string;
  reviewMemo?: string;
};

export async function PATCH(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "対象が指定されていません" },
      { status: 400 },
    );
  }
  if (!body.status || !isNavigatorApplicationStatus(body.status)) {
    return NextResponse.json({ error: "状態が不正です" }, { status: 400 });
  }

  try {
    const result: {
      application: NavigatorApplicationRecord;
      inviteAttempt: "sent" | "existing_account" | "failed" | "skipped";
    } = await updateNavigatorApplication({
      id: body.id,
      status: body.status,
      reviewMemo: typeof body.reviewMemo === "string" ? body.reviewMemo : "",
    });
    return NextResponse.json({
      application: result.application,
      inviteAttempt: result.inviteAttempt,
    });
  } catch (error) {
    const mapped = navigatorApplicationErrorStatus(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
