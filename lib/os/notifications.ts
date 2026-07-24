import type { NotificationRecord } from "@/lib/platform/types";

export type OsNotificationKind =
  | "homework_due"
  | "analysis_scheduled"
  | "certification_renewal"
  | "event"
  | "message"
  | "hq_announcement"
  | "material_update"
  | "ai_notice";

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
  event: "イベント案内",
  message: "メッセージ",
  hq_announcement: "本部からのお知らせ",
  material_update: "教材更新",
  ai_notice: "AIからのお知らせ",
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
  if (
    value.includes("hq") ||
    value.includes("announcement") ||
    value.includes("本部") ||
    value.includes("お知らせ")
  ) {
    return "hq_announcement";
  }
  if (
    value.includes("material") ||
    value.includes("教材") ||
    value.includes("knowledge")
  ) {
    return "material_update";
  }
  if (value.includes("ai") || value.includes("intelligence")) {
    return "ai_notice";
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
      id: "demo-hq-1",
      kind: "hq_announcement",
      title: "本部からのお知らせ",
      body: "Version 2.1 運営システムが公開されました。認定更新と通知センターをご確認ください。",
      createdAt: iso(3),
      readAt: null,
      href: "/notifications",
    },
    {
      id: "demo-cert-1",
      kind: "certification_renewal",
      title: "認定更新のリマインド",
      body: "認定講師資格の更新期限が30日以内です。",
      createdAt: iso(24),
      readAt: null,
      href: "/license",
    },
    {
      id: "demo-ev-1",
      kind: "event",
      title: "イベント案内",
      body: "全国認定講師ミーティングの参加登録を受け付けています。",
      createdAt: iso(36),
      readAt: iso(30),
      href: "/notifications",
    },
    {
      id: "demo-mat-1",
      kind: "material_update",
      title: "教材が更新されました",
      body: "Knowledge Base に新しい認定テキストを追加しました。",
      createdAt: iso(40),
      readAt: null,
      href: "/knowledge",
    },
    {
      id: "demo-ai-1",
      kind: "ai_notice",
      title: "AIからのお知らせ",
      body: "今週のフォローアップ推奨クライアントがあります。",
      createdAt: iso(8),
      readAt: null,
      href: "/dashboard",
    },
    {
      id: "demo-hw-1",
      kind: "homework_due",
      title: "宿題の期限が近づいています",
      body: "就寝前のメラトニンヨガ™（10分）の提出期限は明日です。",
      createdAt: iso(2),
      readAt: null,
      href: "/dashboard#priority",
    },
  ];
}
