import { NextResponse } from "next/server";
import {
  deleteActivityAsAdmin,
  getActivityByIdForAdmin,
  setActivityStatusAsAdmin,
  updateActivityAsAdmin,
} from "@/lib/instructor-activities/service";
import type {
  InstructorActivityInput,
  InstructorActivityStatus,
} from "@/lib/instructor-activities/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Params = { params: Promise<{ id: string }> };

function asStatus(value: unknown): InstructorActivityStatus | null {
  if (value === "published" || value === "archived" || value === "draft") {
    return value;
  }
  return null;
}

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
    const activity = await getActivityByIdForAdmin(id);
    if (!activity) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 },
      );
    }
    return NextResponse.json({ activity });
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
      activity?: InstructorActivityInput;
      status?: InstructorActivityStatus;
    };

    if (body.activity) {
      const status = asStatus(body.status) ?? "draft";
      const activity = await updateActivityAsAdmin(id, body.activity, status);
      return NextResponse.json({ activity });
    }

    const status = asStatus(body.status);
    if (status) {
      const activity = await setActivityStatusAsAdmin(id, status);
      return NextResponse.json({ activity });
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
    await deleteActivityAsAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
