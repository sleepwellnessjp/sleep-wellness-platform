import type { NotificationRecord } from "@/lib/platform/types";

export type OsNotificationKind =
  | "homework_due"
  | "analysis_scheduled"
  | "certification_renewal"
  | "event"
  | "message";

export type OsNotification = {
  id: string;
  kind: OsNotificationKind;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  href?: string;
};

export const OS_NOTIFICATION_KIND_LABELS: Record<OsNotificationKind, string> = {
  homework_due: "宿題期限",
  analysis_scheduled: "分析予定",
  certification_renewal: "認定更新",
  event: "イベント",
  message: "メッセージ",
};

export function categorizeNotificationType(
  type: string | null | undefined,
): OsNotificationKind {
  const value = (type ?? "").toLowerCase();
  if (
    value.includes("homework") ||
    value.includes("due") ||
    value.includes("宿題")
  ) {
    return "homework_due";
  }
  if (
    value.includes("analysis") ||
    value.includes("appointment") ||
    value.includes("分析") ||
    value.includes("予約")
  ) {
    return "analysis_scheduled";
  }
  if (
    value.includes("cert") ||
    value.includes("renew") ||
    value.includes("認定") ||
    value.includes("更新")
  ) {
    return "certification_renewal";
  }
  if (value.includes("event") || value.includes("イベント")) {
    return "event";
  }
  return "message";
}

export function mapPlatformNotification(
  record: NotificationRecord,
): OsNotification {
  return {
    id: record.id,
    kind: categorizeNotificationType(record.type),
    title: record.title,
    body: record.body,
    createdAt: record.createdAt,
    readAt: record.readAt,
  };
}

/** デモ / フォールバック用の通知サンプル */
export function demoOsNotifications(now = new Date()): OsNotification[] {
  const iso = (hoursAgo: number) =>
    new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();

  return [
    {
      id: "demo-hw-1",
      kind: "homework_due",
      title: "宿題の期限が近づいています",
      body: "就寝前のメラトニンヨガ™（10分）の提出期限は明日です。",
      createdAt: iso(2),
      readAt: null,
      href: "/dashboard#priority",
    },
    {
      id: "demo-an-1",
      kind: "analysis_scheduled",
      title: "本日の分析予定",
      body: "14:00 にクライアント分析セッションが予定されています。",
      createdAt: iso(5),
      readAt: null,
      href: "/dashboard#schedule",
    },
    {
      id: "demo-cert-1",
      kind: "certification_renewal",
      title: "認定更新のリマインド",
      body: "メラトニンヨガ™インストラクター資格の更新期限が30日以内です。",
      createdAt: iso(24),
      readAt: null,
      href: "/academy?tab=renewal",
    },
    {
      id: "demo-ev-1",
      kind: "event",
      title: "コミュニティイベント",
      body: "週末のケーススタディ勉強会への参加登録を受け付けています。",
      createdAt: iso(36),
      readAt: iso(30),
      href: "/community?tab=events",
    },
    {
      id: "demo-msg-1",
      kind: "message",
      title: "新しいメッセージ",
      body: "アカデミー事務局から学習進捗についてのメッセージがあります。",
      createdAt: iso(48),
      readAt: iso(40),
      href: "/community?tab=messages",
    },
  ];
}
