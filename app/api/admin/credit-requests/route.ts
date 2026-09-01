import { NextResponse } from "next/server";
import {
  listAllCreditRequests,
  reviewCreditRequest,
  toJapaneseCreditRequestError,
} from "@/lib/platform/credit-request-service";
import {
  listDemoCreditRequests,
  reviewDemoCreditRequest,
} from "@/lib/platform/demo-credit-request-store";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        requests: listDemoCreditRequests(),
      });
    }
    const requests = await listAllCreditRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseCreditRequestError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

type Body = {
  id?: string;
  action?: string;
  adminMemo?: string;
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
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "操作が不正です" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      const actor = await requireAdminProfile();
      const requestRecord = reviewDemoCreditRequest(
        {
          id: body.id,
          action: body.action,
          adminMemo: body.adminMemo,
        },
        actor.id,
      );
      return NextResponse.json({ request: requestRecord });
    }

    const requestRecord = await reviewCreditRequest({
      id: body.id,
      action: body.action,
      adminMemo: body.adminMemo,
    });
    return NextResponse.json({ request: requestRecord });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新に失敗しました";
    const mapped = toJapaneseCreditRequestError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
