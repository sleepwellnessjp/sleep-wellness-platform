"use client";

import { useEffect, useState } from "react";
import {
  categorizeNotificationType,
  type OsNotification,
} from "@/lib/os/notifications";
import {
  errorState,
  idleState,
  loadingState,
  successState,
  type AsyncState,
} from "@/modules/_shared/async-state";

type ApiNotification = {
  id: string;
  title: string;
  body: string;
  type?: string;
  kind?: OsNotification["kind"];
  readAt: string | null;
  createdAt: string;
  href?: string;
};

/**
 * Notifications Module hook — OS notification center feed.
 */
export function useNotifications() {
  const [state, setState] = useState<AsyncState<OsNotification[]>>(idleState());

  useEffect(() => {
    let cancelled = false;
    setState(loadingState());

    void (async () => {
      try {
        const res = await fetch("/api/os/notifications");
        if (!res.ok) {
          throw new Error(`Notifications API error (${res.status})`);
        }
        const json = (await res.json()) as { notifications?: ApiNotification[] };
        const items = (json.notifications ?? []).map(
          (item): OsNotification => ({
            id: item.id,
            title: item.title,
            body: item.body,
            kind: item.kind ?? categorizeNotificationType(item.type),
            readAt: item.readAt,
            createdAt: item.createdAt,
            href: item.href,
          }),
        );
        if (!cancelled) setState(successState(items));
      } catch (e) {
        if (!cancelled) {
          setState(
            errorState(
              e instanceof Error ? e.message : "通知の取得に失敗しました",
            ),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
