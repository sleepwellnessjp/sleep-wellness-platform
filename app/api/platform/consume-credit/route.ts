import { NextResponse } from "next/server";
import { recordAnalysisUsage } from "@/lib/platform/analysis-gate";

type Body = {
  clientName?: string;
  measurementDate?: string;
  sleepScore?: number | null;
  clientId?: string;
  analysisId?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.clientName?.trim()) {
    return NextResponse.json(
      { error: "clientName is required" },
      { status: 400 },
    );
  }

  try {
    const result = await recordAnalysisUsage({
      clientName: body.clientName.trim(),
      measurementDate: body.measurementDate,
      sleepScore: body.sleepScore,
      clientId: body.clientId,
      analysisId: body.analysisId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "クレジット処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
