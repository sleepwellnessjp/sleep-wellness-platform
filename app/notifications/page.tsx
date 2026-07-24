"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE, SURFACE_WARM } from "@/components/ui/tokens";
import { SWIJ_EYEBROW_INSTRUCTOR } from "@/lib/brand/swij-brand";
import {
  OPS_NOTIFICATION_KIND_LABELS,
  OPS_NOTIFICATION_KINDS,
} from "@/lib/ops/constants";
import type { OpsNotificationRecord } from "@/lib/ops/types";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [items, setItems] = useState<OpsNotificationRecord[]>([]);
  const [kind, setKind] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/ops/notifications?kind=${encodeURIComponent(kind)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as {
        notifications?: OpsNotificationRecord[];
      };
      setItems(json.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <InstructorNav eyebrow={SWIJ_EYEBROW_INSTRUCTOR} />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-8">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            NOTIFICATION CENTER
          </p>
          <h1
            className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            通知センター
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
            本部からのお知らせ、認定更新、イベント案内、教材更新、AIからのお知らせを確認できます。
          </p>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setKind("all")}
            className={`rounded-full px-3.5 py-2 text-[12px] font-semibold ${
              kind === "all" ? "text-white" : "text-slate-500"
            }`}
            style={
              kind === "all"
                ? { backgroundColor: NAVY }
                : { backgroundColor: SURFACE_WARM }
            }
          >
            すべて
          </button>
          {OPS_NOTIFICATION_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-3.5 py-2 text-[12px] font-semibold ${
                kind === k ? "text-white" : "text-slate-500"
              }`}
              style={
                kind === k
                  ? { backgroundColor: NAVY }
                  : { backgroundColor: SURFACE_WARM }
              }
            >
              {OPS_NOTIFICATION_KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <SectionCard title="受信トレイ" eyebrow="SWIJ">
          {loading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{ backgroundColor: SURFACE_WARM, color: GOLD }}
                    >
                      {OPS_NOTIFICATION_KIND_LABELS[item.kind]}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatWhen(item.publishedAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] font-semibold" style={{ color: NAVY }}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-slate-500">{item.body}</p>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-2 inline-block text-[12px] font-semibold"
                      style={{ color: GOLD }}
                    >
                      詳細を見る →
                    </Link>
                  ) : null}
                </li>
              ))}
              {items.length === 0 ? (
                <li className="py-10 text-center text-sm text-slate-400">
                  表示できる通知はありません
                </li>
              ) : null}
            </ul>
          )}
        </SectionCard>

        <div className="mt-6">
          <Button href="/dashboard" variant="secondary" size="sm">
            ダッシュボードへ戻る
          </Button>
        </div>
      </div>
    </main>
  );
}
