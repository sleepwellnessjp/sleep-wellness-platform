import { NextResponse } from "next/server";
import {
  createOwnActivity,
  listOwnActivities,
} from "@/lib/instructor-activities/service";
import type {
  InstructorActivityInput,
  InstructorActivityStatus,
} from "@/lib/instructor-activities/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function asStatus(value: unknown): InstructorActivityStatus {
  if (value === "published" || value === "archived" || value === "draft") {
    return value;
  }
  return "draft";
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

export async function GET() {
  try {
    const auth = await requireUser();
    if ("error" in auth && auth.error) return auth.error;
    const activities = await listOwnActivities();
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("[api/instructor/activities GET]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "イベントの取得に失敗しました",
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
      activity?: InstructorActivityInput;
      status?: InstructorActivityStatus;
    };
    if (!body.activity) {
      return NextResponse.json(
        { error: "イベント内容がありません" },
        { status: 400 },
      );
    }
    const activity = await createOwnActivity(
      body.activity,
      asStatus(body.status),
    );
    return NextResponse.json({ activity });
  } catch (error) {
    console.error("[api/instructor/activities POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "イベントの登録に失敗しました",
      },
      { status: 400 },
    );
  }
}
