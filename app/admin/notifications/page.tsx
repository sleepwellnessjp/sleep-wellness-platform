"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";
import { SWIJ_EYEBROW_OPS } from "@/lib/brand/swij-brand";
import {
  OPS_NOTIFICATION_KIND_LABELS,
  OPS_NOTIFICATION_KINDS,
} from "@/lib/ops/constants";
import type {
  OpsNotificationKind,
  OpsNotificationRecord,
} from "@/lib/ops/types";

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

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<OpsNotificationRecord[]>([]);
  const [kind, setKind] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: "hq_announcement" as OpsNotificationKind,
    title: "",
    body: "",
    href: "",
    isPinned: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/ops?resource=notifications&kind=${encodeURIComponent(kind)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as {
        notifications?: OpsNotificationRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setItems(json.notifications ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const publish = async () => {
    setMessage(null);
    const response = await fetch("/api/admin/ops?resource=notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: form.kind,
        title: form.title,
        body: form.body,
        href: form.href || null,
        isPinned: form.isPinned,
      }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "配信に失敗しました");
      return;
    }
    setForm({
      kind: "hq_announcement",
      title: "",
      body: "",
      href: "",
      isPinned: false,
    });
    setMessage("お知らせを配信しました");
    await load();
  };

  return (
    <AdminShell
      eyebrow={SWIJ_EYEBROW_OPS}
      title="通知センター"
      description="本部からのお知らせ・認定更新・イベント・教材・AI通知を管理します。"
      actions={
        <Button href="/notifications" variant="secondary" size="sm">
          講師向け表示を確認
        </Button>
      }
    >
      {message ? (
        <p className="mb-4 text-sm" style={{ color: GOLD }}>
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="新規配信" eyebrow="PUBLISH">
          <div className="space-y-3">
            <label className="block text-[12px] text-slate-500">
              種別
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[14px]"
                value={form.kind}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    kind: e.target.value as OpsNotificationKind,
                  }))
                }
              >
                {OPS_NOTIFICATION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {OPS_NOTIFICATION_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] text-slate-500">
              タイトル
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px]"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </label>
            <label className="block text-[12px] text-slate-500">
              本文
              <textarea
                className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px]"
                value={form.body}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, body: e.target.value }))
                }
              />
            </label>
            <label className="block text-[12px] text-slate-500">
              リンク（任意）
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px]"
                value={form.href}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, href: e.target.value }))
                }
                placeholder="/license"
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isPinned: e.target.checked }))
                }
              />
              ピン留めする
            </label>
            <Button size="sm" onClick={() => void publish()}>
              配信する
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="配信一覧" eyebrow="INBOX">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKind("all")}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
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
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
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

          {loading ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]"
                      style={{ backgroundColor: SURFACE_WARM, color: GOLD }}
                    >
                      {OPS_NOTIFICATION_KIND_LABELS[item.kind]}
                    </span>
                    {item.isPinned ? (
                      <span className="text-[10px] font-semibold text-slate-400">
                        PINNED
                      </span>
                    ) : null}
                    <span className="text-[11px] text-slate-400">
                      {formatWhen(item.publishedAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold" style={{ color: NAVY }}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-slate-500">{item.body}</p>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-2 inline-block text-[12px] font-semibold"
                      style={{ color: GOLD }}
                    >
                      リンクを開く →
                    </Link>
                  ) : null}
                </li>
              ))}
              {items.length === 0 ? (
                <li className="py-8 text-center text-sm text-slate-400">
                  通知はまだありません
                </li>
              ) : null}
            </ul>
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}
