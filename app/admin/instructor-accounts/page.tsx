"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";
import type { AdminInstructorRow } from "@/lib/admin/types";
import type { MembershipStatus } from "@/lib/platform/types";

type SortKey =
  | "name"
  | "clients"
  | "analyses"
  | "lastLogin"
  | "status";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<AdminInstructorRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/instructors", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        instructors?: AdminInstructorRow[];
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
    const list = instructors.filter((item) => {
      const haystack = [
        item.displayName ?? "",
        item.email ?? "",
        item.certificationLabel,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery =
        !query || haystack.includes(query.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter ||
        (statusFilter === "none" && !item.status);
      return matchesQuery && matchesStatus;
    });

    list.sort((a, b) => {
      switch (sortKey) {
        case "clients":
          return b.clientCount - a.clientCount;
        case "analyses":
          return b.analysisCount - a.analysisCount;
        case "lastLogin":
          return (b.lastLoginAt ?? "").localeCompare(a.lastLoginAt ?? "");
        case "status":
          return a.statusLabel.localeCompare(b.statusLabel, "ja");
        default:
          return (a.displayName ?? a.email ?? "").localeCompare(
            b.displayName ?? b.email ?? "",
            "ja",
          );
      }
    });
    return list;
  }, [instructors, query, statusFilter, sortKey]);

  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

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
    <AdminShell
      title="認定講師一覧"
      description="氏名・資格・担当人数・分析件数・最終ログインを横断で確認し、クレジットと資格状態を管理します。"
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="氏名・メール・資格で検索"
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
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
        >
          <option value="name">氏名順</option>
          <option value="clients">担当人数順</option>
          <option value="analyses">分析件数順</option>
          <option value="lastLogin">最終ログイン順</option>
          <option value="status">ステータス順</option>
        </select>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-sm text-[#315f68]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <SectionCard eyebrow="INSTRUCTORS" title="一覧">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    <th className="py-3 pr-4 font-semibold">氏名</th>
                    <th className="py-3 pr-4 font-semibold">資格</th>
                    <th className="py-3 pr-4 font-semibold">担当</th>
                    <th className="py-3 pr-4 font-semibold">分析</th>
                    <th className="py-3 pr-4 font-semibold">最終ログイン</th>
                    <th className="py-3 font-semibold">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const active = selected?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="cursor-pointer border-b border-slate-50 transition hover:bg-[#fafaf8]"
                        style={
                          active
                            ? { backgroundColor: "rgba(138,106,45,0.06)" }
                            : undefined
                        }
                        onClick={() => setSelectedId(item.id)}
                      >
                        <td className="py-3.5 pr-4">
                          <p className="font-semibold" style={{ color: NAVY }}>
                            {item.displayName ?? "—"}
                          </p>
                          <p className="text-[12px] text-slate-500">
                            {item.email}
                          </p>
                        </td>
                        <td className="py-3.5 pr-4 text-slate-600">
                          {item.certificationLabel}
                        </td>
                        <td className="py-3.5 pr-4">{item.clientCount}</td>
                        <td className="py-3.5 pr-4">{item.analysisCount}</td>
                        <td className="py-3.5 pr-4 text-slate-500">
                          {formatDateTime(item.lastLoginAt)}
                        </td>
                        <td className="py-3.5">
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              backgroundColor: SURFACE_WARM,
                              color: GOLD,
                            }}
                          >
                            {item.statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  該当する認定講師がいません。
                </p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard eyebrow="DETAIL" title="詳細">
            {selected ? (
              <InstructorDetail item={selected} onAction={act} />
            ) : (
              <p className="text-sm text-slate-400">講師を選択してください。</p>
            )}
          </SectionCard>
        </div>
      )}
    </AdminShell>
  );
}

function InstructorDetail({
  item,
  onAction,
}: {
  item: AdminInstructorRow;
  onAction: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [memo, setMemo] = useState(item.adminMemo);
  const [expiresAt, setExpiresAt] = useState(item.expiresAt ?? "");

  useEffect(() => {
    setMemo(item.adminMemo);
    setExpiresAt(item.expiresAt ?? "");
  }, [item]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xl font-semibold tracking-[-0.03em]" style={{ color: NAVY }}>
          {item.displayName ?? "—"}
        </p>
        <p className="mt-1 text-sm text-slate-500">{item.email}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-400">資格</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {item.certificationLabel}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">残クレジット</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {item.remainingCredits}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">担当人数</dt>
          <dd className="mt-1 font-medium text-slate-700">{item.clientCount}</dd>
        </div>
        <div>
          <dt className="text-slate-400">今月の分析</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {item.analysesThisMonth}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-3 gap-2">
        {[10, 30, 100].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => void onAction({ userId: item.id, amount })}
            className="min-h-11 rounded-2xl text-sm font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            +{amount}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
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
                userId: item.id,
                status: statusKey as MembershipStatus,
              })
            }
            className="min-h-11 rounded-2xl border border-slate-200 bg-[#fafaf8] text-[12px] font-semibold text-slate-700"
          >
            {label}
          </button>
        ))}
      </div>

      <label className="block text-sm">
        <span className="font-semibold text-slate-600">有効期限</span>
        <input
          type="date"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 px-4"
        />
      </label>
      <label className="block text-sm">
        <span className="font-semibold text-slate-600">管理者メモ</span>
        <textarea
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
        />
      </label>

      <Button
        className="w-full"
        style={{ backgroundColor: GOLD }}
        onClick={() =>
          void onAction({
            userId: item.id,
            expiresAt: expiresAt || null,
            adminMemo: memo,
          })
        }
      >
        有効期限・メモを保存
      </Button>

      <Link
        href={`/clients`}
        className="block text-center text-[12px] font-semibold text-slate-500"
      >
        クライアント管理へ
      </Link>
    </div>
  );
}
