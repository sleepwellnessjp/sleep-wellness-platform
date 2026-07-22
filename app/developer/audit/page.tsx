"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { NAVY } from "@/components/ui/tokens";
import type { ApiAuditLog } from "@/lib/api-platform/types";

export default function DeveloperAuditPage() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/developer/audit?limit=200", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          logs?: ApiAuditLog[];
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setLogs(json.logs ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell
      eyebrow="DEVELOPER"
      title="API 監査ログ"
      description="REST API 呼び出しの認証方式・ステータス・所要時間を記録します。"
      actions={
        <Button href="/developer" variant="secondary" size="sm">
          Dashboard
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : (
        <SectionCard eyebrow="AUDIT" title={`${logs.length} events`}>
          <ul className="space-y-3">
            {logs.length === 0 ? (
              <li className="text-sm text-slate-500">ログはまだありません。</li>
            ) : (
              logs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-mono text-[13px]" style={{ color: NAVY }}>
                      <span className="font-semibold">{log.method}</span>{" "}
                      {log.path}
                    </p>
                    <p className="text-[12px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <p className="mt-1 text-[12px] text-slate-500">
                    status {log.statusCode} · auth {log.authMethod}
                    {log.role ? ` · role ${log.role}` : ""}
                    {log.appName ? ` · app ${log.appName}` : ""} · {log.durationMs}
                    ms
                    {log.error ? ` · ${log.error}` : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </SectionCard>
      )}
    </AdminShell>
  );
}
