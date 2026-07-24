import { NextResponse } from "next/server";
import {
  getAiIntelligenceBundle,
  getResearchAiReport,
  getSwijIntelligenceReport,
  toJapaneseAiIntelligenceError,
} from "@/lib/ai-intelligence";

/**
 * 本部向け AI Intelligence。
 * ?view=swij | research | bundle（default: bundle）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") ?? "bundle";

    if (view === "swij") {
      const report = await getSwijIntelligenceReport();
      return NextResponse.json({ report });
    }
    if (view === "research") {
      const report = await getResearchAiReport({
        topic: searchParams.get("topic") ?? undefined,
      });
      return NextResponse.json({ report });
    }

    const bundle = await getAiIntelligenceBundle();
    return NextResponse.json({ bundle });
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
