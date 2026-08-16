import { NextResponse } from "next/server";
import {
  deleteOwnActivitySchedule,
  updateOwnActivitySchedule,
} from "@/lib/instructor-activity-schedules/service";
import type { InstructorActivityScheduleInput } from "@/lib/instructor-activity-schedules/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireUser();
    if ("error" in auth && auth.error) return auth.error;
    const { id } = await params;
    const body = (await request.json()) as {
      schedule?: InstructorActivityScheduleInput;
    };
    if (!body.schedule) {
      return NextResponse.json(
        { error: "更新内容がありません" },
        { status: 400 },
      );
    }
    const schedule = await updateOwnActivitySchedule(id, body.schedule);
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("[api/instructor/activity-schedules/:id PATCH]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "活動予定の更新に失敗しました",
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
    await deleteOwnActivitySchedule(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/instructor/activity-schedules/:id DELETE]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "活動予定の削除に失敗しました",
      },
      { status: 400 },
    );
  }
}
