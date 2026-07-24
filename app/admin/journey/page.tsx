"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { AdminJourneyDashboard } from "@/lib/journey";

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#071426]/08 bg-[#fafaf8] px-4 py-4 sm:px-5">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p
        className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] tabular-nums"
        style={{ color: NAVY }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[12px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

function formatPct(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export default function AdminJourneyPage() {
  const [dashboard, setDashboard] = useState<AdminJourneyDashboard | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/journey", { cache: "no-store" });
      const json = (await response.json()) as {
        dashboard?: AdminJourneyDashboard;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setDashboard(json.dashboard ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "取得に失敗しました",
      );
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      eyebrow="JOURNEY"
      title="Sleep Wellness Journey™"
      description="全認定講師の平均改善率・継続率・修了率を確認します。"
    >
      {message ? (
        <p className="mb-4 text-[14px] text-[#a33a3a]" role="alert">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : !dashboard ? (
        <SectionCard eyebrow="EMPTY" title="データがありません">
          <p className="text-[14px] leading-7 text-slate-500">
            Journey 指標を表示できません。権限または接続設定を確認してください。
          </p>
        </SectionCard>
      ) : (
        <>
          <SectionCard eyebrow="SUMMARY" title="全体サマリー">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricTile
                label="認定講師数"
                value={String(dashboard.summary.instructorCount)}
              />
              <MetricTile
                label="クライアント数"
                value={String(dashboard.summary.clientCount)}
              />
              <MetricTile
                label="平均改善率"
                value={formatPct(dashboard.summary.averageImprovementRate)}
                hint="初回分析からのスコア改善"
              />
              <MetricTile
                label="平均継続率"
                value={formatPct(dashboard.summary.averageRetentionRate)}
                hint="直近45日のアクティブ率"
              />
              <MetricTile
                label="平均修了率"
                value={formatPct(dashboard.summary.averageCompletionRate)}
                hint="Stage 5（Sleep Wellness）到達"
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="INSTRUCTORS"
            title="認定講師別 Journey 指標"
          >
            <ul className="space-y-3">
              {dashboard.instructors.map((item) => (
                <li
                  key={item.instructorId}
                  className="rounded-[22px] border border-[#071426]/08 bg-white px-4 py-4 sm:px-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className="text-[15px] font-semibold tracking-[-0.02em]"
                        style={{ color: NAVY }}
                      >
                        {item.instructorName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-400">
                        {item.instructorEmail ?? "—"}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]"
                      style={{
                        color: TEAL,
                        background: "rgba(49, 95, 104, 0.12)",
                      }}
                    >
                      {item.clientCount} CLIENTS
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] text-slate-400">平均改善率</p>
                      <p
                        className="mt-1 text-[1.1rem] font-semibold tabular-nums"
                        style={{ color: NAVY }}
                      >
                        {formatPct(item.averageImprovementRate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">継続率</p>
                      <p
                        className="mt-1 text-[1.1rem] font-semibold tabular-nums"
                        style={{ color: NAVY }}
                      >
                        {formatPct(item.retentionRate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">修了率</p>
                      <p
                        className="mt-1 text-[1.1rem] font-semibold tabular-nums"
                        style={{ color: GOLD }}
                      >
                        {formatPct(item.completionRate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">平均ステージ</p>
                      <p
                        className="mt-1 text-[1.1rem] font-semibold tabular-nums"
                        style={{ color: NAVY }}
                      >
                        {item.averageStageNumber == null
                          ? "—"
                          : item.averageStageNumber.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}
    </AdminShell>
  );
}
