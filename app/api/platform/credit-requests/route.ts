import { NextResponse } from "next/server";
import {
  CREDIT_PACK_MAX_SETS,
  CREDIT_PACK_MIN_SETS,
} from "@/lib/platform/credit-pack-constants";
import {
  createCreditRequest,
  listMyCreditRequests,
  toJapaneseCreditRequestError,
} from "@/lib/platform/credit-request-service";
import {
  createDemoCreditRequest,
  listDemoCreditRequests,
} from "@/lib/platform/demo-credit-request-store";
import { getCurrentProfile } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      const profile = await getCurrentProfile();
      const userId = profile?.id ?? "demo-instructor";
      return NextResponse.json({
        requests: listDemoCreditRequests({ userId }),
      });
    }
    const requests = await listMyCreditRequests();
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
  sets?: number;
  note?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  const sets = Math.floor(Number(body.sets));
  if (
    !Number.isFinite(sets) ||
    sets < CREDIT_PACK_MIN_SETS ||
    sets > CREDIT_PACK_MAX_SETS
  ) {
    return NextResponse.json(
      { error: "セット数は1〜5の範囲で選択してください" },
      { status: 400 },
    );
  }

  try {
    if (!isSupabaseConfigured()) {
      const profile = await getCurrentProfile();
      const requestRecord = createDemoCreditRequest(
        { sets, note: body.note },
        {
          userId: profile?.id ?? "demo-instructor",
          displayName: profile?.displayName ?? "デモ インストラクター",
          email: profile?.email ?? "demo@swij.local",
        },
      );
      return NextResponse.json({ request: requestRecord }, { status: 201 });
    }

    const requestRecord = await createCreditRequest({ sets, note: body.note });
    return NextResponse.json({ request: requestRecord }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "送信に失敗しました";
    const mapped = toJapaneseCreditRequestError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
