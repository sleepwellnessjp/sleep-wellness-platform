import { NextResponse } from "next/server";
import {
  isFeedbackCategory,
  isFeedbackSeverity,
  isFeedbackTargetScreen,
  isUsabilityRating,
} from "@/lib/feedback/constants";
import {
  createDemoFeedback,
  getDemoFeedbackActor,
  listDemoFeedback,
} from "@/lib/feedback/demo-feedback-store";
import {
  createFeedback,
  listMyFeedback,
  toJapaneseAuthError,
} from "@/lib/feedback/feedback-service";
import type { CreateFeedbackInput } from "@/lib/feedback/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      const actor = getDemoFeedbackActor();
      return NextResponse.json({
        feedback: listDemoFeedback({ userId: actor.userId }),
      });
    }
    const feedback = await listMyFeedback();
    return NextResponse.json({ feedback });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

type Body = {
  category?: string;
  targetScreen?: string;
  severity?: string;
  content?: string;
  reproductionSteps?: string;
  device?: string;
  browser?: string;
  currentUrl?: string;
  screenName?: string;
  deviceType?: string;
  browserInfo?: string;
  appVersion?: string;
  usabilityRating?: number | null;
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

  const category = body.category ?? "";
  const targetScreen = body.targetScreen ?? "";
  const severity = body.severity ?? "medium";

  if (!isFeedbackCategory(category)) {
    return NextResponse.json(
      { error: "カテゴリーを選択してください" },
      { status: 400 },
    );
  }
  if (!isFeedbackTargetScreen(targetScreen)) {
    return NextResponse.json(
      { error: "対象画面を選択してください" },
      { status: 400 },
    );
  }
  if (!isFeedbackSeverity(severity)) {
    return NextResponse.json(
      { error: "重要度を選択してください" },
      { status: 400 },
    );
  }
  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "内容を入力してください" },
      { status: 400 },
    );
  }

  let usabilityRating: number | null = null;
  if (body.usabilityRating != null) {
    const rating = Number(body.usabilityRating);
    if (!isUsabilityRating(rating)) {
      return NextResponse.json(
        { error: "使いやすさ評価は1〜5で選択してください" },
        { status: 400 },
      );
    }
    usabilityRating = rating;
  }

  const input: CreateFeedbackInput = {
    category,
    targetScreen,
    severity,
    content: body.content,
    reproductionSteps: body.reproductionSteps,
    device: body.device,
    browser: body.browser,
    currentUrl: body.currentUrl,
    screenName: body.screenName,
    deviceType:
      body.deviceType === "pc" ||
      body.deviceType === "mobile" ||
      body.deviceType === "tablet"
        ? body.deviceType
        : "",
    browserInfo: body.browserInfo,
    appVersion: body.appVersion,
    usabilityRating,
  };

  try {
    if (!isSupabaseConfigured()) {
      const feedback = createDemoFeedback(input, getDemoFeedbackActor());
      return NextResponse.json({ feedback }, { status: 201 });
    }
    const feedback = await createFeedback(input);
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "送信に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
