"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
} from "@/lib/audit/constants";
import type { AuditAction, AuditLogRecord } from "@/lib/audit/types";

export default function AdminAuditPage() {
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      action,
      q,
    });
    void fetch(`/api/admin/audit?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          logs?: AuditLogRecord[];
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setLogs(json.logs ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, [action, q]);

  return (
    <AdminShell
      title="監査ログ"
      description="ログイン・分析実行・レポート作成・クライアント追加・ライセンス更新を記録します。"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索（メール・摘要）"
          className="min-h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-[14px] outline-none focus:border-[#315f68]/40 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setAction("all")}
            className={`rounded-full px-3.5 py-2 text-[12px] font-semibold ${
              action === "all" ? "text-white" : "border border-slate-200 text-slate-500"
            }`}
            style={action === "all" ? { backgroundColor: NAVY } : undefined}
          >
            すべて
          </button>
          {AUDIT_ACTIONS.filter((a) =>
            ["login", "analysis_run", "report_create", "client_add", "license_update"].includes(
              a,
            ),
          ).map((item) => {
            const active = action === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setAction(item)}
                className={`rounded-full px-3.5 py-2 text-[12px] font-semibold ${
                  active ? "text-white" : "border border-slate-200 text-slate-500"
                }`}
                style={active ? { backgroundColor: NAVY } : undefined}
              >
                {AUDIT_ACTION_LABELS[item]}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      ) : logs.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">該当する監査ログはありません。</p>
      ) : (
        <div className="mt-6 space-y-3">
          {logs.map((log) => (
            <SectionCard key={log.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p
                    className="text-[10px] font-semibold tracking-[0.18em]"
                    style={{ color: GOLD }}
                  >
                    {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold" style={{ color: NAVY }}>
                    {log.summary}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {log.actorEmail ?? "—"}
                    {log.actorRole ? ` · ${log.actorRole}` : ""}
                  </p>
                </div>
                <p className="text-[12px] font-medium" style={{ color: SUCCESS }}>
                  {new Date(log.createdAt).toLocaleString("ja-JP")}
                </p>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
