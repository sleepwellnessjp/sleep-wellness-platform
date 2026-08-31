import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  getInstructorAssistantBriefing,
  toJapaneseAiIntelligenceError,
  type InstructorAssistantContext,
} from "@/lib/ai-intelligence";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const body = (await request.json()) as Partial<InstructorAssistantContext>;
    const briefing = await getInstructorAssistantBriefing(body);
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

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const briefing = await getInstructorAssistantBriefing();
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
