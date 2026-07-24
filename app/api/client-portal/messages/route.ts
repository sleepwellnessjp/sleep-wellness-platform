import { NextResponse } from "next/server";
import {
  createDemoMessage,
  getDemoClientPortalActor,
  listDemoMessages,
  markDemoMessagesRead,
} from "@/lib/client-portal/demo-client-portal-store";
import {
  listMyMessages,
  markMessagesRead,
  sendMessage,
  toJapaneseAuthError,
} from "@/lib/client-portal/client-portal-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const markRead = searchParams.get("markRead") === "1";

    if (!isSupabaseConfigured()) {
      const actor = getDemoClientPortalActor();
      const id = clientId ?? actor.clientId;
      if (markRead) markDemoMessagesRead(id);
      return NextResponse.json({ messages: listDemoMessages(id) });
    }

    if (markRead) {
      await markMessagesRead(clientId);
    }
    const messages = await listMyMessages(clientId);
    return NextResponse.json({ messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

export async function POST(request: Request) {
  let body: { clientId?: string; body?: string; asRole?: string };
  try {
    body = (await request.json()) as {
      clientId?: string;
      body?: string;
      asRole?: string;
    };
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  const text = body.body?.trim() ?? "";
  if (!text) {
    return NextResponse.json(
      { error: "メッセージを入力してください" },
      { status: 400 },
    );
  }

  try {
    if (!isSupabaseConfigured()) {
      const actor = getDemoClientPortalActor();
      const message = createDemoMessage(
        {
          clientId: body.clientId ?? actor.clientId,
          body: text,
          asRole:
            body.asRole === "instructor" || body.asRole === "client"
              ? body.asRole
              : actor.role,
        },
        actor,
      );
      return NextResponse.json({ message }, { status: 201 });
    }

    const message = await sendMessage({
      clientId: body.clientId ?? "",
      body: text,
      asRole:
        body.asRole === "instructor" || body.asRole === "client"
          ? body.asRole
          : undefined,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "送信に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
