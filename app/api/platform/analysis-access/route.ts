import { NextResponse } from "next/server";
import { checkAnalysisAccess } from "@/lib/platform/analysis-gate";

export async function GET() {
  try {
    const access = await checkAnalysisAccess();
    return NextResponse.json(access);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "分析アクセスの確認に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
