import { NextResponse } from "next/server";
import {
  createDemoSessionEvidence,
  getDemoEvidenceActor,
  isEvidenceRating,
  isNextAppointmentIntent,
} from "@/lib/evidence";
import type { CreateSessionEvidenceInput } from "@/lib/evidence";
import {
  createSessionEvidence,
  toEvidenceAuthError,
} from "@/lib/evidence/evidence-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Body = {
  analysisId?: string | null;
  clientId?: string | null;
  satisfaction?: number;
  understanding?: number;
  homeworkLikelihood?: number;
  nextAppointment?: string;
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

  if (!isEvidenceRating(body.satisfaction)) {
    return NextResponse.json(
      { error: "満足度を選択してください" },
      { status: 400 },
    );
  }
  if (!isEvidenceRating(body.understanding)) {
    return NextResponse.json(
      { error: "理解度を選択してください" },
      { status: 400 },
    );
  }
  if (!isEvidenceRating(body.homeworkLikelihood)) {
    return NextResponse.json(
      { error: "宿題実施見込みを選択してください" },
      { status: 400 },
    );
  }
  const nextAppointment = body.nextAppointment ?? "";
  if (!isNextAppointmentIntent(nextAppointment)) {
    return NextResponse.json(
      { error: "次回予約を選択してください" },
      { status: 400 },
    );
  }

  const input: CreateSessionEvidenceInput = {
    analysisId: body.analysisId,
    clientId: body.clientId,
    satisfaction: body.satisfaction,
    understanding: body.understanding,
    homeworkLikelihood: body.homeworkLikelihood,
    nextAppointment,
    freeComment: body.freeComment,
  };

  try {
    if (!isSupabaseConfigured()) {
      const survey = createDemoSessionEvidence(
        input,
        getDemoEvidenceActor("instructor"),
      );
      return NextResponse.json({ survey }, { status: 201 });
    }
    const survey = await createSessionEvidence(input);
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
