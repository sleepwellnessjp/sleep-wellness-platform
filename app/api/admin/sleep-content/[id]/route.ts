import { NextResponse } from "next/server";
import {
  deleteSleepContentAsAdmin,
  getSleepContentByIdForAdmin,
  setSleepContentStatusAsAdmin,
  updateSleepContentAsAdmin,
} from "@/lib/sleep-content/service";
import {
  isSleepContentStatus,
  type SleepContentInput,
  type SleepContentStatus,
} from "@/lib/sleep-content/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Params = { params: Promise<{ id: string }> };

function asStatus(value: unknown): SleepContentStatus | null {
  if (typeof value === "string" && isSleepContentStatus(value)) return value;
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
    const content = await getSleepContentByIdForAdmin(id);
    if (!content) {
      return NextResponse.json(
        { error: "コンテンツが見つかりません" },
        { status: 404 },
      );
    }
    return NextResponse.json({ content });
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
      content?: SleepContentInput;
      status?: SleepContentStatus;
    };

    if (body.content) {
      const status = asStatus(body.status) ?? "draft";
      const content = await updateSleepContentAsAdmin(id, body.content, status);
      return NextResponse.json({ content });
    }

    const status = asStatus(body.status);
    if (status) {
      const content = await setSleepContentStatusAsAdmin(id, status);
      return NextResponse.json({ content });
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
    await deleteSleepContentAsAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
