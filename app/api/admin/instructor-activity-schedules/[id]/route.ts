import { NextResponse } from "next/server";
import {
  deleteScheduleAsAdmin,
  getScheduleByIdForAdmin,
  setSchedulePublishedAsAdmin,
  updateScheduleAsAdmin,
} from "@/lib/instructor-activity-schedules/service";
import type { InstructorActivityScheduleInput } from "@/lib/instructor-activity-schedules/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Params = { params: Promise<{ id: string }> };

function errorStatus(message: string): number {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 400;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const { id } = await params;
    const schedule = await getScheduleByIdForAdmin(id);
    if (!schedule) {
      return NextResponse.json(
        { error: "活動予定が見つかりません" },
        { status: 404 },
      );
    }
    return NextResponse.json({ schedule });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const { id } = await params;
    const body = (await request.json()) as {
      schedule?: InstructorActivityScheduleInput;
      published?: boolean;
    };

    if (body.schedule) {
      const schedule = await updateScheduleAsAdmin(id, body.schedule);
      return NextResponse.json({ schedule });
    }

    if (typeof body.published === "boolean") {
      const schedule = await setSchedulePublishedAsAdmin(id, body.published);
      return NextResponse.json({ schedule });
    }

    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const { id } = await params;
    await deleteScheduleAsAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
