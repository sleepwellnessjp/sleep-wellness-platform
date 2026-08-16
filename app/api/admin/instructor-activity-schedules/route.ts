import { NextResponse } from "next/server";
import {
  createScheduleAsAdmin,
  listAllSchedulesForAdmin,
} from "@/lib/instructor-activity-schedules/service";
import type { InstructorActivityScheduleInput } from "@/lib/instructor-activity-schedules/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function errorStatus(message: string): number {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 400;
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const schedules = await listAllSchedulesForAdmin();
    return NextResponse.json({ schedules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const body = (await request.json()) as {
      schedule?: InstructorActivityScheduleInput;
      instructorId?: string;
    };
    if (!body.schedule) {
      return NextResponse.json(
        { error: "活動予定の内容がありません" },
        { status: 400 },
      );
    }
    const instructorId = body.instructorId || body.schedule.instructorId || "";
    const schedule = await createScheduleAsAdmin(body.schedule, instructorId);
    return NextResponse.json({ schedule });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "活動予定の登録に失敗しました";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
