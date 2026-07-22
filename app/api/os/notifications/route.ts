import { NextResponse } from "next/server";
import { demoOsNotifications } from "@/lib/os/notifications";
import { getPlatformMe } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        notifications: demoOsNotifications().map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          type: item.kind,
          readAt: item.readAt,
          createdAt: item.createdAt,
        })),
        source: "demo",
      });
    }

    const me = await getPlatformMe();
    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications =
      me.notifications.length > 0
        ? me.notifications
        : demoOsNotifications().map((item) => ({
            id: item.id,
            userId: me.profile.id,
            title: item.title,
            body: item.body,
            type: item.kind,
            readAt: item.readAt,
            createdAt: item.createdAt,
          }));

    return NextResponse.json({
      notifications: notifications.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        type: item.type,
        readAt: item.readAt,
        createdAt: item.createdAt,
      })),
      source: me.notifications.length > 0 ? "platform" : "demo",
    });
  } catch (error) {
    console.error("[api/os/notifications]", error);
    return NextResponse.json(
      { error: "通知の取得に失敗しました" },
      { status: 500 },
    );
  }
}
