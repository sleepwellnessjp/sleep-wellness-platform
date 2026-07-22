"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM, TEAL } from "@/components/ui/tokens";
import type { AdminClientRow } from "@/lib/admin/types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/clients", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          clients?: AdminClientRow[];
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setClients(json.clients ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return clients.filter((item) => {
      const haystack = `${item.name} ${item.instructorName}`.toLowerCase();
      const matchesQuery =
        !query || haystack.includes(query.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [clients, query, statusFilter]);

  return (
    <AdminShell
      title="クライアント一覧"
      description="担当講師・Sleep Wellness Score・最終分析日・継続日数を横断で把握します。"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="氏名・担当講師で検索"
          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
        >
          <option value="all">すべての状態</option>
          <option value="active">継続中</option>
          <option value="inactive">休眠</option>
          <option value="new">新規</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <SectionCard className="mt-6" title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : (
        <SectionCard className="mt-6" eyebrow="CLIENTS" title="登録クライアント">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  <th className="py-3 pr-4 font-semibold">氏名</th>
                  <th className="py-3 pr-4 font-semibold">担当講師</th>
                  <th className="py-3 pr-4 font-semibold">Score</th>
                  <th className="py-3 pr-4 font-semibold">最終分析日</th>
                  <th className="py-3 pr-4 font-semibold">継続日数</th>
                  <th className="py-3 font-semibold">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-50 hover:bg-[#fafaf8]"
                  >
                    <td className="py-3.5 pr-4 font-semibold" style={{ color: NAVY }}>
                      {item.name}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-600">
                      {item.instructorName}
                    </td>
                    <td className="py-3.5 pr-4">
                      {item.sleepWellnessScore != null
                        ? item.sleepWellnessScore
                        : "—"}
                    </td>
                    <td className="py-3.5 pr-4 text-slate-500">
                      {formatDate(item.lastAnalysisAt)}
                    </td>
                    <td className="py-3.5 pr-4">{item.continuityDays}日</td>
                    <td className="py-3.5">
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          backgroundColor: SURFACE_WARM,
                          color:
                            item.status === "active"
                              ? TEAL
                              : item.status === "inactive"
                                ? GOLD
                                : NAVY,
                        }}
                      >
                        {item.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                該当するクライアントがいません。
              </p>
            ) : null}
          </div>
        </SectionCard>
      )}
    </AdminShell>
  );
}
