import { NextResponse } from "next/server";
import {
  createOwnActivitySchedule,
  listOwnActivitySchedules,
} from "@/lib/instructor-activity-schedules/service";
import type { InstructorActivityScheduleInput } from "@/lib/instructor-activity-schedules/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export async function GET() {
  try {
    const auth = await requireUser();
    if ("error" in auth && auth.error) return auth.error;
    const schedules = await listOwnActivitySchedules();
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("[api/instructor/activity-schedules GET]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "活動予定の取得に失敗しました",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if ("error" in auth && auth.error) return auth.error;
    const body = (await request.json()) as {
      schedule?: InstructorActivityScheduleInput;
    };
    if (!body.schedule) {
      return NextResponse.json(
        { error: "活動予定の内容がありません" },
        { status: 400 },
      );
    }
    const schedule = await createOwnActivitySchedule(body.schedule);
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("[api/instructor/activity-schedules POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "活動予定の登録に失敗しました",
      },
      { status: 400 },
    );
  }
}
