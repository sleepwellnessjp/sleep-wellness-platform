import { NextResponse } from "next/server";
import {
  getDemoClientPortalActor,
  listDemoNotifications,
  markDemoNotificationRead,
} from "@/lib/client-portal/demo-client-portal-store";
import {
  listMyNotifications,
  markNotificationRead,
  toJapaneseAuthError,
} from "@/lib/client-portal/client-portal-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;

    if (!isSupabaseConfigured()) {
      const actor = getDemoClientPortalActor();
      return NextResponse.json({
        notifications: listDemoNotifications(clientId ?? actor.clientId),
      });
    }

    const notifications = await listMyNotifications(clientId);
    return NextResponse.json({ notifications });
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

export async function PATCH(request: Request) {
  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.id?.trim()) {
    return NextResponse.json(
      { error: "通知IDが必要です" },
      { status: 400 },
    );
  }

  try {
    if (!isSupabaseConfigured()) {
      const notification = markDemoNotificationRead(body.id);
      if (!notification) {
        return NextResponse.json(
          { error: "通知が見つかりません" },
          { status: 404 },
        );
      }
      return NextResponse.json({ notification });
    }

    const notification = await markNotificationRead(body.id);
    return NextResponse.json({ notification });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
