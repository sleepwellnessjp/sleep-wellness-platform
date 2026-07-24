import { NextResponse } from "next/server";
import {
  searchKnowledgeBase,
  toJapaneseAiIntelligenceError,
} from "@/lib/ai-intelligence";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string; limit?: number };
    const answer = await searchKnowledgeBase(
      body.query ?? "",
      body.limit,
    );
    return NextResponse.json({ answer });
  } catch (error) {
    const mapped = toJapaneseAiIntelligenceError(
      error instanceof Error ? error.message : "検索に失敗しました",
    );
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? searchParams.get("query") ?? "";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const answer = await searchKnowledgeBase(
      query,
      Number.isFinite(limit) ? limit : undefined,
    );
    return NextResponse.json({ answer });
  } catch (error) {
    const mapped = toJapaneseAiIntelligenceError(
      error instanceof Error ? error.message : "検索に失敗しました",
    );
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
