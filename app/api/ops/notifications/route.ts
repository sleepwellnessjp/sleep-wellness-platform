import { NextResponse } from "next/server";
import {
  listDemoOpsNotifications,
  markDemoOpsNotificationRead,
} from "@/lib/ops/demo-ops-store";
import {
  listOpsNotifications,
  toJapaneseAuthError,
} from "@/lib/ops/ops-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? "all";

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        notifications: listDemoOpsNotifications(kind),
      });
    }
    return NextResponse.json({
      notifications: await listOpsNotifications(kind),
    });
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
  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "id は必須です" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      const notification = markDemoOpsNotificationRead(body.id);
      if (!notification) {
        return NextResponse.json(
          { error: "通知が見つかりません" },
          { status: 404 },
        );
      }
      return NextResponse.json({ notification });
    }

    // 本番は既読テーブル未実装のため一覧再取得のみ
    const notifications = await listOpsNotifications();
    const notification = notifications.find((n) => n.id === body.id) ?? null;
    return NextResponse.json({ notification });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "処理に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}
