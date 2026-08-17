import { NextResponse } from "next/server";
import {
  createSleepContentAsAdmin,
  listAllSleepContentsForAdmin,
} from "@/lib/sleep-content/service";
import {
  isSleepContentStatus,
  type SleepContentInput,
  type SleepContentStatus,
} from "@/lib/sleep-content/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function asStatus(value: unknown): SleepContentStatus {
  if (typeof value === "string" && isSleepContentStatus(value)) return value;
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
    const contents = await listAllSleepContentsForAdmin();
    return NextResponse.json({ contents });
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
      content?: SleepContentInput;
      status?: SleepContentStatus;
    };
    if (!body.content) {
      return NextResponse.json(
        { error: "コンテンツ内容がありません" },
        { status: 400 },
      );
    }
    const content = await createSleepContentAsAdmin(
      body.content,
      asStatus(body.status),
    );
    return NextResponse.json({ content });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "コンテンツの登録に失敗しました";
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
