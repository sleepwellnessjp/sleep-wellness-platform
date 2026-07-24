import { NextResponse } from "next/server";
import {
  createDemoMorningEvidence,
  getDemoEvidenceActor,
  getDemoMorningEvidenceForToday,
  isEvidenceRating,
} from "@/lib/evidence";
import type { CreateMorningEvidenceInput } from "@/lib/evidence";
import {
  createMorningEvidence,
  getMyMorningEvidenceToday,
  toEvidenceAuthError,
} from "@/lib/evidence/evidence-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        survey: getDemoMorningEvidenceForToday(
          getDemoEvidenceActor("client"),
        ),
      });
    }
    const survey = await getMyMorningEvidenceToday();
    return NextResponse.json({ survey });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toEvidenceAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

type Body = {
  surveyDate?: string;
  sleepSatisfaction?: number;
  morningMood?: number;
  daytimeCondition?: number;
  freeComment?: string;
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

  if (!isEvidenceRating(body.sleepSatisfaction)) {
    return NextResponse.json(
      { error: "睡眠満足度を選択してください" },
      { status: 400 },
    );
  }
  if (!isEvidenceRating(body.morningMood)) {
    return NextResponse.json(
      { error: "起床時気分を選択してください" },
      { status: 400 },
    );
  }
  if (!isEvidenceRating(body.daytimeCondition)) {
    return NextResponse.json(
      { error: "日中の調子を選択してください" },
      { status: 400 },
    );
  }

  const input: CreateMorningEvidenceInput = {
    surveyDate: body.surveyDate,
    sleepSatisfaction: body.sleepSatisfaction,
    morningMood: body.morningMood,
    daytimeCondition: body.daytimeCondition,
    freeComment: body.freeComment,
  };

  try {
    if (!isSupabaseConfigured()) {
      const survey = createDemoMorningEvidence(
        input,
        getDemoEvidenceActor("client"),
      );
      return NextResponse.json({ survey }, { status: 201 });
    }
    const survey = await createMorningEvidence(input);
    return NextResponse.json({ survey }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "送信に失敗しました";
    const mapped = toEvidenceAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
