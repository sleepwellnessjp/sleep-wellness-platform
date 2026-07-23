import { NextResponse } from "next/server";
import { runBetaDataVerify } from "@/lib/beta-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Version 1.0 Beta — 保存/読み込み実機確認（要ログイン） */
export async function POST() {
  try {
    const result = await runBetaDataVerify();
    return NextResponse.json(result, {
      status: result.overall === "pass" ? 200 : 422,
    });
  } catch (error) {
    console.error("[api/setup/beta-verify]", error);
    return NextResponse.json(
      {
        ranAt: new Date().toISOString(),
        overall: "fail",
        publishable: false,
        summary:
          error instanceof Error
            ? error.message
            : "検証中に予期しないエラーが発生しました。",
        checks: [],
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return POST();
}
