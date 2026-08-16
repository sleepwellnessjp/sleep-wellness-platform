import { NextResponse } from "next/server";
import {
  createActivityAsAdmin,
  listAllActivitiesForAdmin,
} from "@/lib/instructor-activities/service";
import type {
  InstructorActivityInput,
  InstructorActivityStatus,
} from "@/lib/instructor-activities/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function asStatus(value: unknown): InstructorActivityStatus {
  if (value === "published" || value === "archived" || value === "draft") {
    return value;
  }
  return "draft";
}

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
    const activities = await listAllActivitiesForAdmin();
    return NextResponse.json({ activities });
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
      activity?: InstructorActivityInput;
      status?: InstructorActivityStatus;
      instructorId?: string;
    };
    if (!body.activity) {
      return NextResponse.json(
        { error: "イベント内容がありません" },
        { status: 400 },
      );
    }
    const instructorId = body.instructorId || body.activity.instructorId || "";
    const activity = await createActivityAsAdmin(
      body.activity,
      asStatus(body.status),
      instructorId,
    );
    return NextResponse.json({ activity });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "イベントの登録に失敗しました";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

