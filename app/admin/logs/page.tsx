"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import type { AdminLogRecord } from "@/lib/platform/types";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/admin/logs", { cache: "no-store" })
      .then((response) => response.json())
      .then((json: { logs?: AdminLogRecord[] }) => setLogs(json.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="ADMIN LOGS" />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              ADMIN LOGS
            </p>
            <h1
              className="mt-3 text-3xl font-semibold tracking-[-0.04em]"
              style={{ color: NAVY }}
            >
              管理ログ
            </h1>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold"
            style={{ color: NAVY }}
          >
            管理画面へ
          </Link>
        </div>

        {loading ? (
          <p className="mt-16 text-center text-sm text-slate-400">読み込み中...</p>
        ) : logs.length === 0 ? (
          <p className="mt-16 text-center text-sm text-slate-400">
            管理ログはまだありません。
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5"
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
          </ul>
        )}
      </div>
    </main>
  );
}
