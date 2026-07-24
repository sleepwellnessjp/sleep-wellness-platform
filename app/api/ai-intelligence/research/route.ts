import { NextResponse } from "next/server";
import {
  getResearchAiReport,
  toJapaneseAiIntelligenceError,
  type ResearchAiContext,
} from "@/lib/ai-intelligence";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ctx: ResearchAiContext = {
      topic: searchParams.get("topic") ?? undefined,
      periodLabel: searchParams.get("periodLabel") ?? undefined,
    };
    const report = await getResearchAiReport(ctx);
    return NextResponse.json({ report });
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResearchAiContext;
    const report = await getResearchAiReport(body);
    return NextResponse.json({ report });
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
