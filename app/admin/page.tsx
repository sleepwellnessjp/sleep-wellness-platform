"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import {
  CERTIFICATION_LABELS,
  MEMBERSHIP_STATUS_LABELS,
} from "@/lib/platform/constants";
import type { InstructorSummary, MembershipStatus } from "@/lib/platform/types";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

export default function SuperAdminPage() {
  const [instructors, setInstructors] = useState<InstructorSummary[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/instructors", { cache: "no-store" });
      const json = (await response.json()) as {
        instructors?: InstructorSummary[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setInstructors(json.instructors ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return instructors.filter((item) => {
      const name = item.profile.displayName ?? item.profile.email ?? "";
      const cert = item.membership
        ? CERTIFICATION_LABELS[item.membership.certificationType]
        : "";
      const matchesQuery =
        !query ||
        name.toLowerCase().includes(query.toLowerCase()) ||
        cert.toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        item.membership?.status === statusFilter ||
        (statusFilter === "none" && !item.membership);
      return matchesQuery && matchesStatus;
    });
  }, [instructors, query, statusFilter]);

  const act = async (payload: Record<string, unknown>) => {
    setMessage(null);
    const response = await fetch("/api/admin/instructors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "操作に失敗しました");
      return;
    }
    setMessage("更新しました");
    await load();
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="SUPER ADMIN" />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              SUPER ADMIN
            </p>
            <h1
              className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
              style={{ color: NAVY }}
            >
              インストラクター管理
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-600">
              クレジット付与・資格管理・利用状況を外出先でも30秒以内に操作できます。
            </p>
          </div>
          <Link
            href="/admin/logs"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold"
            style={{ color: NAVY }}
          >
            管理ログ
          </Link>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前・資格で検索"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
          >
            <option value="all">すべての状態</option>
            <option value="active">有効</option>
            <option value="renewal_pending">更新待ち</option>
            <option value="suspended">停止</option>
            <option value="expired">失効</option>
            <option value="none">未登録</option>
          </select>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-sm text-[#315f68]">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-16 text-center text-sm text-slate-400">読み込み中...</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {filtered.map((item) => (
              <AdminInstructorCard key={item.profile.id} item={item} onAction={act} />
            ))}
            {filtered.length === 0 && (
              <li className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-400">
                該当するインストラクターがいません。
              </li>
            )}
          </ul>
        )}
      </div>
    </main>
  );
}

function AdminInstructorCard({
  item,
  onAction,
}: {
  item: InstructorSummary;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [memo, setMemo] = useState(item.membership?.adminMemo ?? "");
  const [expiresAt, setExpiresAt] = useState(item.membership?.expiresAt ?? "");

  const name = item.profile.displayName ?? item.profile.email ?? "—";
  const cert = item.membership
    ? CERTIFICATION_LABELS[item.membership.certificationType]
    : "未登録";
  const status = item.membership
    ? MEMBERSHIP_STATUS_LABELS[item.membership.status]
    : "—";

  return (
    <li className="rounded-[28px] border border-slate-200/90 bg-white px-4 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)] sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-[-0.03em]" style={{ color: NAVY }}>
            {name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{item.profile.email}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
            <Badge label={cert} />
            <Badge label={status} />
            <Badge label={`残 ${item.remainingCredits} cr`} />
            <Badge label={`今月 ${item.analysesThisMonth} 件`} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[10, 30, 100].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() =>
              void onAction({ userId: item.profile.id, amount })
            }
            className="min-h-12 rounded-2xl text-sm font-semibold text-white sm:min-h-14 sm:text-base"
            style={{ backgroundColor: NAVY }}
          >
            +{amount}
          </button>
        ))}
        {(
          [
            ["renewal_pending", "更新待ち"],
            ["suspended", "停止"],
            ["expired", "失効"],
            ["active", "有効化"],
          ] as const
        ).map(([statusKey, label]) => (
          <button
            key={statusKey}
            type="button"
            onClick={() =>
              void onAction({
                userId: item.profile.id,
                status: statusKey as MembershipStatus,
              })
            }
            className="min-h-12 rounded-2xl border border-slate-200 bg-[#fafaf8] text-[12px] font-semibold text-slate-700 sm:min-h-14 sm:text-sm"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-slate-600">有効期限</span>
          <input
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold text-slate-600">管理者メモ</span>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            rows={2}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() =>
          void onAction({
            userId: item.profile.id,
            expiresAt: expiresAt || null,
            adminMemo: memo,
          })
        }
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white sm:min-h-14 sm:text-base"
        style={{ backgroundColor: GOLD }}
      >
        有効期限・メモを保存
      </button>
    </li>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-[#fafaf8] px-3 py-1 font-medium text-slate-600">
      {label}
    </span>
  );
}
