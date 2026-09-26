import { NextResponse } from "next/server";
import {
  deleteSessionAsAdmin,
  getSessionByIdForAdmin,
  setSessionPublishedAsAdmin,
  setSessionRegistrationClosedAsAdmin,
  updateSessionAsAdmin,
} from "@/lib/melatonin-yoga/session-service";
import type { MelatoninYogaSessionInput } from "@/lib/melatonin-yoga/types";
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
    const session = await getSessionByIdForAdmin(id);
    if (!session) {
      return NextResponse.json(
        { error: "開催日程が見つかりません" },
        { status: 404 },
      );
    }
    return NextResponse.json({ session });
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
      session?: MelatoninYogaSessionInput;
      published?: boolean;
      registrationClosed?: boolean;
    };

    if (body.session) {
      const session = await updateSessionAsAdmin(id, body.session);
      return NextResponse.json({ session });
    }

    if (typeof body.published === "boolean") {
      const session = await setSessionPublishedAsAdmin(id, body.published);
      return NextResponse.json({ session });
    }

    if (typeof body.registrationClosed === "boolean") {
      const session = await setSessionRegistrationClosedAsAdmin(
        id,
        body.registrationClosed,
      );
      return NextResponse.json({ session });
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
    await deleteSessionAsAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
