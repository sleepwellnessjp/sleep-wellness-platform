import { NextResponse } from "next/server";
import {
  createDemoGoal,
  getDemoClientPortalActor,
  listDemoGoals,
  updateDemoGoalProgress,
} from "@/lib/client-portal/demo-client-portal-store";
import {
  createGoal,
  listMyGoals,
  toJapaneseAuthError,
  updateGoalProgress,
} from "@/lib/client-portal/client-portal-service";
import { isClientGoalCategory, isClientGoalStatus } from "@/lib/client-portal/constants";
import type { ClientGoalCategory, ClientGoalStatus } from "@/lib/client-portal/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function parseCategory(value: string | undefined): ClientGoalCategory {
  const v = value ?? "";
  if (isClientGoalCategory(v)) return v;
  return "sleep";
}

function parseStatus(value: string | undefined): ClientGoalStatus | undefined {
  const v = value ?? "";
  if (isClientGoalStatus(v)) return v;
  return undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;

    if (!isSupabaseConfigured()) {
      const actor = getDemoClientPortalActor();
      return NextResponse.json({
        goals: listDemoGoals(clientId ?? actor.clientId),
      });
    }

    const goals = await listMyGoals(clientId);
    return NextResponse.json({ goals });
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

export async function POST(request: Request) {
  let body: {
    clientId?: string;
    title?: string;
    description?: string;
    category?: string;
    targetValue?: number | null;
    currentValue?: number | null;
    unit?: string;
    progressPercent?: number;
    startsOn?: string | null;
    targetOn?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "目標タイトルを入力してください" },
      { status: 400 },
    );
  }

  try {
    if (!isSupabaseConfigured()) {
      const actor = getDemoClientPortalActor();
      const category = parseCategory(body.category);
      const goal = createDemoGoal({
        clientId: body.clientId ?? actor.clientId,
        title: body.title,
        description: body.description,
        category,
        targetValue: body.targetValue,
        currentValue: body.currentValue,
        unit: body.unit,
        progressPercent: body.progressPercent,
        startsOn: body.startsOn,
        targetOn: body.targetOn,
      });
      return NextResponse.json({ goal }, { status: 201 });
    }

    const category = parseCategory(body.category);
    const goal = await createGoal({
      clientId: body.clientId ?? "",
      title: body.title,
      description: body.description,
      category,
      targetValue: body.targetValue,
      currentValue: body.currentValue,
      unit: body.unit,
      progressPercent: body.progressPercent,
      startsOn: body.startsOn,
      targetOn: body.targetOn,
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "作成に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}

export async function PATCH(request: Request) {
  let body: {
    id?: string;
    currentValue?: number | null;
    progressPercent?: number;
    status?: string;
    title?: string;
    description?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.id?.trim()) {
    return NextResponse.json({ error: "目標IDが必要です" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      const status = parseStatus(body.status);
      const goal = updateDemoGoalProgress(body.id, {
        currentValue: body.currentValue,
        progressPercent: body.progressPercent,
        status,
        title: body.title,
        description: body.description,
      });
      if (!goal) {
        return NextResponse.json(
          { error: "目標が見つかりません" },
          { status: 404 },
        );
      }
      return NextResponse.json({ goal });
    }

    const status = parseStatus(body.status);
    const goal = await updateGoalProgress(body.id, {
      currentValue: body.currentValue,
      progressPercent: body.progressPercent,
      status,
      title: body.title,
      description: body.description,
    });
    return NextResponse.json({ goal });
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
