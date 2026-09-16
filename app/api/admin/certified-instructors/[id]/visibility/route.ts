import { NextResponse } from "next/server";
import {
  getInstructorProfileById,
  updateInstructorProfileAsAdmin,
} from "@/lib/instructors/instructor-profile-service";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type RouteContext = { params: Promise<{ id: string }> };

function mapAuthError(error: unknown): NextResponse | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (message === "Forbidden") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    await requireAdminProfile();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const { id: instructorId } = await context.params;
    if (!instructorId?.trim()) {
      return NextResponse.json(
        { error: "講師 ID が必要です" },
        { status: 400 },
      );
    }

    const current = await getInstructorProfileById(instructorId, supabase);
    if (!current) {
      return NextResponse.json(
        { error: "認定講師が見つかりません" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      instructorId: current.id,
      isPublic: Boolean(current.isPublic),
    });
  } catch (error) {
    const auth = mapAuthError(error);
    if (auth) return auth;
    console.error(
      "[api/admin/certified-instructors/[id]/visibility GET]",
      error,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "公開設定の取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    await requireAdminProfile();
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const { id: instructorId } = await context.params;
    if (!instructorId?.trim()) {
      return NextResponse.json(
        { error: "講師 ID が必要です" },
        { status: 400 },
      );
    }

    let body: { isPublic?: unknown };
    try {
      body = (await request.json()) as { isPublic?: unknown };
    } catch {
      return NextResponse.json(
        { error: "リクエストの形式が正しくありません" },
        { status: 400 },
      );
    }

    if (typeof body.isPublic !== "boolean") {
      return NextResponse.json(
        { error: "isPublic（boolean）が必要です" },
        { status: 400 },
      );
    }

    const profile = await updateInstructorProfileAsAdmin(
      instructorId,
      { isPublic: body.isPublic },
      supabase,
    );

    return NextResponse.json({
      instructorId: profile.id,
      isPublic: Boolean(profile.isPublic),
    });
  } catch (error) {
    const auth = mapAuthError(error);
    if (auth) return auth;
    console.error(
      "[api/admin/certified-instructors/[id]/visibility PATCH]",
      error,
    );
    const message =
      error instanceof Error
        ? error.message
        : "公開設定の更新に失敗しました";
    const status = message.includes("見つかりません") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
