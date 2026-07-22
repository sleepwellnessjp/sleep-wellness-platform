"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import Card from "@/design-system/Card";
import Badge from "@/design-system/Badge";
import Loading from "@/design-system/Loading";
import ErrorView from "@/design-system/ErrorView";
import { useNotifications } from "@/hooks/useNotifications";
import { OS_NOTIFICATION_KIND_LABELS } from "@/lib/os/notifications";

export default function NotificationsPage() {
  const { data, loading, error } = useNotifications();

  return (
    <ModulePageShell title="Notifications" eyebrow="NOTIFICATIONS">
      <Card title="通知センター" eyebrow="INBOX">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loading />
          </div>
        ) : error ? (
          <ErrorView title={error} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {(data ?? []).map((item) => (
              <li key={item.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.readAt ? "neutral" : "navy"}>
                    {OS_NOTIFICATION_KIND_LABELS[item.kind]}
                  </Badge>
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.createdAt).toLocaleString("ja-JP")}
                  </span>
                </div>
                <p className="font-semibold text-[#071426]">{item.title}</p>
                <p className="text-sm text-slate-600">{item.body}</p>
              </li>
            ))}
            {(data ?? []).length === 0 ? (
              <li className="py-8 text-center text-sm text-slate-500">
                通知はありません
              </li>
            ) : null}
          </ul>
        )}
      </Card>
    </ModulePageShell>
  );
}
