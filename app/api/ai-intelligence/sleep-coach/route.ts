import { NextResponse } from "next/server";
import {
  getSleepCoachBriefing,
  toJapaneseAiIntelligenceError,
  type SleepCoachContext,
} from "@/lib/ai-intelligence";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ctx: Partial<SleepCoachContext> = {
      clientId: searchParams.get("clientId") ?? undefined,
      clientName: searchParams.get("clientName") ?? undefined,
      sleepScore: num(searchParams.get("sleepScore")),
      sleepEfficiency: num(searchParams.get("sleepEfficiency")),
      stress: num(searchParams.get("stress")),
      hrv: num(searchParams.get("hrv")),
      streakDays: num(searchParams.get("streakDays")) ?? 0,
    };
    const briefing = await getSleepCoachBriefing(ctx);
    return NextResponse.json({ briefing });
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
    const body = (await request.json()) as Partial<SleepCoachContext>;
    const briefing = await getSleepCoachBriefing(body);
    return NextResponse.json({ briefing });
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

function num(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
