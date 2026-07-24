import { NextResponse } from "next/server";
import {
  isFeedbackPriority,
  isFeedbackStatus,
} from "@/lib/feedback/constants";
import {
  listDemoFeedback,
  updateDemoFeedback,
} from "@/lib/feedback/demo-feedback-store";
import {
  listAllFeedback,
  toJapaneseAuthError,
  updateFeedbackAdmin,
} from "@/lib/feedback/feedback-service";
import type { FeedbackPriority, FeedbackStatus } from "@/lib/feedback/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "all";
  const severity = searchParams.get("severity") ?? "all";
  const status = searchParams.get("status") ?? "all";

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        feedback: listDemoFeedback({ category, severity, status }),
      });
    }
    const feedback = await listAllFeedback({ category, severity, status });
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
  id?: string;
  status?: string;
  adminMemo?: string;
  priority?: string;
};

export async function PATCH(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "対象が指定されていません" },
      { status: 400 },
    );
  }

  if (body.status !== undefined && !isFeedbackStatus(body.status)) {
    return NextResponse.json(
      { error: "対応状況が不正です" },
      { status: 400 },
    );
  }

  if (body.priority !== undefined && !isFeedbackPriority(body.priority)) {
    return NextResponse.json(
      { error: "優先順位が不正です" },
      { status: 400 },
    );
  }

  try {
    if (!isSupabaseConfigured()) {
      const feedback = updateDemoFeedback({
        id: body.id,
        status: body.status as FeedbackStatus | undefined,
        adminMemo: body.adminMemo,
        priority: body.priority as FeedbackPriority | undefined,
      });
      return NextResponse.json({ feedback });
    }
    const feedback = await updateFeedbackAdmin({
      id: body.id,
      status: body.status as FeedbackStatus | undefined,
      adminMemo: body.adminMemo,
      priority: body.priority as FeedbackPriority | undefined,
    });
    return NextResponse.json({ feedback });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
