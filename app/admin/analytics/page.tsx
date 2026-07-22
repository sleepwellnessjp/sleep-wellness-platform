"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { AdminAnalyticsOverview } from "@/lib/admin/types";

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverview | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/analytics", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          analytics?: AdminAnalyticsOverview;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setAnalytics(json.analytics ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const maxCount = useMemo(() => {
    if (!analytics?.monthly.length) return 1;
    return Math.max(...analytics.monthly.map((item) => item.count), 1);
  }, [analytics]);

  return (
    <AdminShell
      title="分析統計"
      description="月別件数・平均Score・改善率・分析時間を簡易グラフで確認します。"
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[28px]" />
          ))}
        </div>
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "期間内分析件数",
                value: String(analytics.totalAnalyses),
              },
              {
                label: "平均 Score",
                value:
                  analytics.averageScore != null
                    ? analytics.averageScore.toFixed(1)
                    : "—",
              },
              {
                label: "改善率",
                value:
                  analytics.improvementRate != null
                    ? `${analytics.improvementRate}%`
                    : "—",
              },
              {
                label: "平均分析時間",
                value:
                  analytics.averageAnalysisMinutes != null
                    ? `${analytics.averageAnalysisMinutes} 分`
                    : "—",
              },
            ].map((card) => (
              <article
                key={card.label}
                className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6"
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  {card.label.toUpperCase()}
                </p>
                <p
                  className="mt-4 text-3xl font-semibold tracking-[-0.04em]"
                  style={{ color: NAVY }}
                >
                  {card.value}
                </p>
              </article>
            ))}
          </div>

          <SectionCard className="mt-6" eyebrow="MONTHLY" title="月別分析件数">
            <div className="flex h-56 items-end gap-2 sm:gap-3">
              {analytics.monthly.map((item) => {
                const height = Math.max(8, (item.count / maxCount) * 100);
                return (
                  <div
                    key={item.yearMonth}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <p className="text-[11px] font-semibold text-slate-500">
                      {item.count}
                    </p>
                    <div
                      className="w-full rounded-t-xl transition"
                      style={{
                        height: `${height}%`,
                        background: `linear-gradient(180deg, ${TEAL} 0%, ${NAVY} 100%)`,
                        minHeight: 8,
                      }}
                      title={`${item.label}: ${item.count}件`}
                    />
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard className="mt-6" eyebrow="SCORE" title="月別平均 Score">
            <div className="flex h-40 items-end gap-2 sm:gap-3">
              {analytics.monthly.map((item) => {
                const score = item.averageScore ?? 0;
                const height = Math.max(8, (score / 100) * 100);
                return (
                  <div
                    key={`score-${item.yearMonth}`}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <p className="text-[11px] font-semibold text-slate-500">
                      {item.averageScore != null
                        ? item.averageScore.toFixed(0)
                        : "—"}
                    </p>
                    <div
                      className="w-full rounded-t-xl"
                      style={{
                        height: `${height}%`,
                        backgroundColor: GOLD,
                        opacity: item.averageScore != null ? 0.85 : 0.25,
                        minHeight: 8,
                      }}
                    />
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      ) : null}
    </AdminShell>
  );
}
