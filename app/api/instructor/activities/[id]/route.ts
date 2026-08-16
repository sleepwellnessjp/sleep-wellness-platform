import { NextResponse } from "next/server";
import {
  deleteOwnActivity,
  getOwnActivityById,
  setOwnActivityStatus,
  updateOwnActivity,
} from "@/lib/instructor-activities/service";
import type {
  InstructorActivityInput,
  InstructorActivityStatus,
} from "@/lib/instructor-activities/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

function asStatus(value: unknown): InstructorActivityStatus | null {
  if (value === "published" || value === "archived" || value === "draft") {
    return value;
  }
  return null;
}

async function requireUser() {
  if (!isSupabaseConfigured()) {
    return {
      error: NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      ),
    };
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user) {
    return {
      error: NextResponse.json({ error: "ログインが必要です" }, { status: 401 }),
    };
  }
  return { user };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if ("error" in auth && auth.error) return auth.error;
    const { id } = await params;
    const activity = await getOwnActivityById(id);
    if (!activity) {
      return NextResponse.json(
        { error: "イベントが見つからないか、閲覧できません" },
        { status: 404 },
      );
    }
    return NextResponse.json({ activity });
  } catch (error) {
    console.error("[api/instructor/activities/:id GET]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "イベントの取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if ("error" in auth && auth.error) return auth.error;
    const { id } = await params;
    const body = (await request.json()) as {
      activity?: InstructorActivityInput;
      status?: InstructorActivityStatus;
    };

    if (body.activity) {
      const status = asStatus(body.status) ?? "draft";
      const activity = await updateOwnActivity(id, body.activity, status);
      return NextResponse.json({ activity });
    }

    const status = asStatus(body.status);
    if (status) {
      const activity = await setOwnActivityStatus(id, status);
      return NextResponse.json({ activity });
    }

    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  } catch (error) {
    console.error("[api/instructor/activities/:id PATCH]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "イベントの更新に失敗しました",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if ("error" in auth && auth.error) return auth.error;
    const { id } = await params;
    await deleteOwnActivity(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/instructor/activities/:id DELETE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "イベントの削除に失敗しました",
      },
      { status: 400 },
    );
  }
}
