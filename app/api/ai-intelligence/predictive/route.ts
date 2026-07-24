import { NextResponse } from "next/server";
import {
  getPredictiveAnalysisBriefing,
  toJapaneseAiIntelligenceError,
  type PredictiveAnalysisContext,
} from "@/lib/ai-intelligence";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PredictiveAnalysisContext>;
    const analysis = await getPredictiveAnalysisBriefing(body);
    return NextResponse.json({ analysis });
  } catch (error) {
    const mapped = toJapaneseAiIntelligenceError(
      error instanceof Error ? error.message : "取得に失敗しました",
    );
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}

export async function GET() {
  try {
    const analysis = await getPredictiveAnalysisBriefing();
    return NextResponse.json({ analysis });
  } catch (error) {
    const mapped = toJapaneseAiIntelligenceError(
      error instanceof Error ? error.message : "取得に失敗しました",
    );
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
