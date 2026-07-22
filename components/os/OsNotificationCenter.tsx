"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  demoOsNotifications,
  mapPlatformNotification,
  OS_NOTIFICATION_KIND_LABELS,
  type OsNotification,
} from "@/lib/os/notifications";
import { GOLD, NAVY } from "@/components/ui/tokens";

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}分前`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}時間前`;
  return `${Math.round(hours / 24)}日前`;
}

export default function OsNotificationCenter({
  onClose,
}: {
  onClose: () => void;
}) {
  const [items, setItems] = useState<OsNotification[]>(demoOsNotifications());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/os/notifications", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (json: {
          notifications?: Array<{
            id: string;
            title: string;
            body: string;
            type: string;
            readAt: string | null;
            createdAt: string;
          }>;
        } | null) => {
          if (cancelled) return;
          const remote = json?.notifications ?? [];
          if (remote.length > 0) {
            setItems(
              remote.map((row) =>
                mapPlatformNotification({
                  id: row.id,
                  userId: "",
                  title: row.title,
                  body: row.body,
                  type: row.type,
                  readAt: row.readAt,
                  createdAt: row.createdAt,
                }),
              ),
            );
          }
        },
      )
      .catch(() => {
        // keep demo fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unread = items.filter((item) => !item.readAt).length;

  return (
    <div
      className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_28px_70px_-42px_rgba(7,20,38,0.5)]"
      role="dialog"
      aria-label="通知センター"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <div>
          <p
            className="text-[10px] font-semibold tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            NOTIFICATIONS
          </p>
          <p className="mt-1 text-[14px] font-semibold" style={{ color: NAVY }}>
            通知センター
          </p>
        </div>
        <p className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          {unread} 未読
        </p>
      </div>

      <div className="max-h-[24rem] overflow-y-auto">
        {loading ? (
          <p className="px-4 py-8 text-center text-[13px] text-slate-400">
            読み込み中…
          </p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-slate-400">
            新しい通知はありません
          </p>
        ) : (
          <ul>
            {items.map((item) => {
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className="text-[10px] font-semibold tracking-[0.16em]"
                      style={{ color: GOLD }}
                    >
                      {OS_NOTIFICATION_KIND_LABELS[item.kind]}
                    </p>
                    <p className="shrink-0 text-[11px] text-slate-400">
                      {formatRelative(item.createdAt)}
                    </p>
                  </div>
                  <p
                    className="mt-1.5 text-[13px] font-semibold leading-5"
                    style={{ color: NAVY }}
                  >
                    {item.title}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500">
                    {item.body}
                  </p>
                  {!item.readAt ? (
                    <span
                      className="mt-2 inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: NAVY }}
                      aria-label="未読"
                    />
                  ) : null}
                </>
              );

              return (
                <li key={item.id} className="border-b border-slate-100 last:border-0">
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="block px-4 py-3.5 transition hover:bg-slate-50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="px-4 py-3.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        <Link
          href="/settings#notifications"
          onClick={onClose}
          className="text-[12px] font-semibold"
          style={{ color: NAVY }}
        >
          通知設定 →
        </Link>
      </div>
    </div>
  );
}
