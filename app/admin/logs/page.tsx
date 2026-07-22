"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type {
  ActivityLogCategory,
  AdminLogBundle,
} from "@/lib/admin/types";

const TABS: Array<{ id: ActivityLogCategory | "all" | "admin_ops"; label: string }> =
  [
    { id: "all", label: "すべて" },
    { id: "login", label: "ログイン" },
    { id: "analysis", label: "分析実行" },
    { id: "pdf", label: "PDF生成" },
    { id: "ai", label: "AI利用" },
    { id: "admin_ops", label: "管理操作" },
  ];

export default function AdminLogsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [bundle, setBundle] = useState<AdminLogBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const category = tab === "admin_ops" ? "all" : tab;
    void fetch(`/api/admin/logs?category=${category}`, { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as AdminLogBundle & {
          error?: string;
          logs?: AdminLogBundle["adminLogs"];
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setBundle({
          activityLogs: json.activityLogs ?? [],
          adminLogs: json.adminLogs ?? json.logs ?? [],
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <AdminShell
      title="ログ管理"
      description="ログイン履歴・分析実行・PDF生成・AI利用・管理操作を確認します。"
    >
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                active ? "text-white" : "bg-white text-slate-500 border border-slate-200"
              }`}
              style={active ? { backgroundColor: NAVY } : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <SectionCard className="mt-6" title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : tab === "admin_ops" ? (
        <SectionCard className="mt-6" eyebrow="ADMIN" title="管理操作ログ">
          <ul className="space-y-3">
            {(bundle?.adminLogs ?? []).map((log) => (
              <li
                key={log.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold" style={{ color: NAVY }}>
                    {log.action}
                  </p>
                  <p className="text-[12px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  target: {log.targetUserId ?? "—"}
                </p>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-[#fafaf8] p-3 text-[12px] text-slate-600">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </li>
            ))}
            {(bundle?.adminLogs ?? []).length === 0 ? (
              <li className="py-10 text-center text-sm text-slate-400">
                管理ログはまだありません。
              </li>
            ) : null}
          </ul>
        </SectionCard>
      ) : (
        <SectionCard className="mt-6" eyebrow="ACTIVITY" title="活動ログ">
          <ul className="space-y-3">
            {(bundle?.activityLogs ?? []).map((log) => (
              <li
                key={log.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                        style={{
                          backgroundColor: "rgba(138,106,45,0.1)",
                          color: GOLD,
                        }}
                      >
                        {log.category}
                      </span>
                      <p className="font-semibold" style={{ color: NAVY }}>
                        {log.action}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {log.summary || "—"}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      {log.actorName ?? log.actorId ?? "system"}
                      {log.targetId ? ` · ${log.targetType}:${log.targetId}` : ""}
                    </p>
                  </div>
                  <p className="text-[12px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
              </li>
            ))}
            {(bundle?.activityLogs ?? []).length === 0 ? (
              <li className="py-10 text-center text-sm text-slate-400">
                該当するログはありません。
              </li>
            ) : null}
          </ul>
          <p className="mt-4 text-[12px]" style={{ color: TEAL }}>
            ※ ログイン / 分析 / PDF / AI
            の記録は、各処理から system_activity_logs へ追記されます。
          </p>
        </SectionCard>
      )}
    </AdminShell>
  );
}
