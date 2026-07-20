"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import AuthStatusBar from "@/components/AuthStatusBar";
import NewClientModal from "@/components/NewClientModal";
import PlatformStatusCard from "@/components/PlatformStatusCard";
import SchemaSetupBanner from "@/components/SchemaSetupBanner";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import { formatDisplayDate, loadClients } from "@/lib/repositories/client-repository";
import {
  computeDashboardStatsFromClients,
  type DashboardStats,
  type RecentAnalysisItem,
  type ScoreBucketKey,
} from "@/lib/dashboard-stats";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const BUCKET_LABELS: Array<{ key: ScoreBucketKey; label: string }> = [
  { key: "80+", label: "80以上" },
  { key: "70-79", label: "70〜79" },
  { key: "60-69", label: "60〜69" },
  { key: "59-", label: "59以下" },
];

function emptyStats(): DashboardStats {
  return {
    clientCount: 0,
    analysesThisMonth: 0,
    averageSleepScore: null,
    improvement: { improvedCount: 0, comparableCount: 0, rate: null },
    followUpCount: 0,
    followUps: [],
    recentAnalyses: [],
    distribution: { "80+": 0, "70-79": 0, "60-69": 0, "59-": 0 },
    compareClientId: null,
  };
}

function TrendGlyph({ item }: { item: RecentAnalysisItem }) {
  if (item.trend === "improved") {
    return (
      <span className="inline-flex items-center gap-1 text-[#0f6b5c]">
        <span aria-hidden>↑</span>
        <span className="font-semibold">+{item.delta}</span>
      </span>
    );
  }
  if (item.trend === "worsened") {
    return (
      <span className="inline-flex items-center gap-1 text-[#a33a3a]">
        <span aria-hidden>↓</span>
        <span className="font-semibold">{item.delta}</span>
      </span>
    );
  }
  if (item.trend === "unchanged") {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400">
        <span aria-hidden>→</span>
        <span className="font-semibold">0</span>
      </span>
    );
  }
  return <span className="text-slate-300">—</span>;
}

export default function InstructorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { data: platformMe } = usePlatformMe();

  const refresh = async () => {
    try {
      const clients = await loadClients();
      setStats(computeDashboardStatsFromClients(clients));
    } catch (error) {
      console.error("[dashboard] loadClients failed:", error);
      setStats(emptyStats());
    }
  };

  useEffect(() => {
    void refresh();
    setReady(true);
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, []);

  const distributionMax = useMemo(() => {
    const values = Object.values(stats.distribution);
    return Math.max(1, ...values);
  }, [stats.distribution]);

  const compareHref = stats.compareClientId
    ? `/clients/${stats.compareClientId}/compare`
    : "/clients";

  const summaryCards = [
    {
      label: "登録クライアント数",
      value: String(stats.clientCount),
      hint: "名",
    },
    {
      label: "今月の分析件数",
      value: String(stats.analysesThisMonth),
      hint: "件",
    },
    {
      label: "平均睡眠スコア",
      value:
        stats.averageSleepScore != null ? String(stats.averageSleepScore) : "—",
      hint: "最新平均",
    },
    {
      label: "改善率",
      value:
        stats.improvement.rate != null ? `${stats.improvement.rate}%` : "—",
      hint:
        stats.improvement.comparableCount > 0
          ? `${stats.improvement.improvedCount}/${stats.improvement.comparableCount}名`
          : "比較可能なし",
    },
    {
      label: "要フォロー人数",
      value: String(stats.followUpCount),
      hint: "名",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="DASHBOARD" />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16">
        <AuthStatusBar />
        <SchemaSetupBanner />

        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              INSTRUCTOR DASHBOARD
            </p>
            <h1
              className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] sm:mt-5 sm:text-4xl lg:text-5xl"
              style={{ color: NAVY }}
            >
              ダッシュボード
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
              担当クライアントの状態、最近の分析、要フォロー対象、改善状況を
              一画面で確認できます。
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            <Link
              href="/analysis/new"
              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90 sm:text-sm"
              style={{ backgroundColor: NAVY }}
            >
              新しい睡眠分析
            </Link>
            <Link
              href="/clients"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold transition hover:bg-slate-50 sm:text-sm"
              style={{ color: NAVY }}
            >
              クライアント一覧
            </Link>
            <Link
              href={compareHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold transition hover:bg-slate-50 sm:text-sm"
              style={{ color: NAVY }}
            >
              比較レポート
            </Link>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-[#faf7f1] px-5 py-2.5 text-[13px] font-semibold transition hover:bg-[#f5efe4] sm:text-sm"
              style={{ color: GOLD }}
            >
              新規クライアント登録
            </button>
          </div>
        </header>

        {!ready ? (
          <p className="mt-16 py-10 text-center text-sm text-slate-400">
            読み込み中...
          </p>
        ) : (
          <>
            {platformMe && (
              <section className="mt-10 sm:mt-12">
                <PlatformStatusCard data={platformMe} compact />
              </section>
            )}

            <section className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-5">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[24px] border border-slate-200/90 bg-white px-4 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-5 sm:py-6"
                >
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 sm:tracking-[0.16em]">
                    {card.label}
                  </p>
                  <p
                    className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
                    style={{ color: NAVY }}
                  >
                    {card.value}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">{card.hint}</p>
                </div>
              ))}
            </section>

            <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
              <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-7 sm:py-8">
                <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
                  <h2
                    className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                    style={{ color: NAVY }}
                  >
                    要フォローのクライアント
                  </h2>
                  <p
                    className="text-[10px] font-semibold tracking-[0.22em]"
                    style={{ color: GOLD }}
                  >
                    FOLLOW-UP
                  </p>
                </div>

                {stats.followUps.length === 0 ? (
                  <p className="py-10 text-center text-sm leading-7 text-slate-400">
                    現在、要フォローのクライアントはいません。
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {stats.followUps.map((item) => (
                      <li
                        key={item.clientId}
                        className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <p
                                className="text-base font-semibold tracking-[-0.02em]"
                                style={{ color: NAVY }}
                              >
                                {item.name}
                              </p>
                              <p className="text-[12px] text-slate-400">
                                {formatDisplayDate(item.latestAnalysisDate)}
                              </p>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                              睡眠スコア{" "}
                              <span
                                className="text-lg font-semibold tracking-[-0.03em]"
                                style={{ color: NAVY }}
                              >
                                {item.sleepScore ?? "—"}
                              </span>
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {item.reasons.map((reason) => (
                                <span
                                  key={reason}
                                  className="rounded-full border border-[#a33a3a]/15 bg-[#a33a3a]/06 px-2.5 py-1 text-[11px] font-medium text-[#a33a3a]"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </div>
                          <Link
                            href={`/clients/${item.clientId}`}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90"
                            style={{ backgroundColor: NAVY }}
                          >
                            詳細を見る
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="space-y-6 lg:space-y-8">
                <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-7 sm:py-8">
                  <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
                    <h2
                      className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                      style={{ color: NAVY }}
                    >
                      改善率
                    </h2>
                    <p
                      className="text-[10px] font-semibold tracking-[0.22em]"
                      style={{ color: GOLD }}
                    >
                      IMPROVEMENT
                    </p>
                  </div>

                  <p
                    className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl"
                    style={{ color: NAVY }}
                  >
                    {stats.improvement.rate != null
                      ? `${stats.improvement.rate}%`
                      : "—"}
                  </p>
                  <dl className="mt-5 space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between gap-3">
                      <dt>改善したクライアント</dt>
                      <dd className="font-semibold" style={{ color: NAVY }}>
                        {stats.improvement.improvedCount}名
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>比較可能なクライアント</dt>
                      <dd className="font-semibold" style={{ color: NAVY }}>
                        {stats.improvement.comparableCount}名
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-[12px] leading-5 text-slate-400">
                    2件以上の分析があり、最新スコアが初回より3点以上高い場合を改善と定義しています。
                  </p>
                </section>

                <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-7 sm:py-8">
                  <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
                    <h2
                      className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                      style={{ color: NAVY }}
                    >
                      睡眠スコア分布
                    </h2>
                    <p
                      className="text-[10px] font-semibold tracking-[0.22em]"
                      style={{ color: GOLD }}
                    >
                      DISTRIBUTION
                    </p>
                  </div>

                  <ul className="space-y-4">
                    {BUCKET_LABELS.map(({ key, label }) => {
                      const count = stats.distribution[key];
                      const width = Math.round((count / distributionMax) * 100);
                      return (
                        <li key={key}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                            <span className="font-medium text-slate-600">
                              {label}
                            </span>
                            <span
                              className="font-semibold tabular-nums"
                              style={{ color: NAVY }}
                            >
                              {count}名
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: `${width}%`,
                                background:
                                  key === "59-"
                                    ? "linear-gradient(90deg, #a33a3a, #c45c5c)"
                                    : key === "60-69"
                                      ? "linear-gradient(90deg, #9a7b12, #c4a43a)"
                                      : `linear-gradient(90deg, ${NAVY}, #315f68)`,
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            </div>

            <section className="mt-6 rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:mt-8 sm:px-7 sm:py-8">
              <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
                <h2
                  className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
                  style={{ color: NAVY }}
                >
                  最近の分析
                </h2>
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  RECENT
                </p>
              </div>

              {stats.recentAnalyses.length === 0 ? (
                <p className="py-10 text-center text-sm leading-7 text-slate-400">
                  まだ分析がありません。新しい睡眠分析から開始してください。
                </p>
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                          <th className="pb-3 pr-4 font-semibold">氏名</th>
                          <th className="pb-3 pr-4 font-semibold">分析日</th>
                          <th className="pb-3 pr-4 font-semibold">睡眠スコア</th>
                          <th className="pb-3 pr-4 font-semibold">前回との差</th>
                          <th className="pb-3 pr-4 font-semibold">総合評価</th>
                          <th className="pb-3 font-semibold">詳細</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentAnalyses.map((item) => (
                          <tr
                            key={`${item.clientId}-${item.analysisId}`}
                            className="border-b border-slate-50 last:border-b-0"
                          >
                            <td
                              className="py-4 pr-4 text-[15px] font-semibold"
                              style={{ color: NAVY }}
                            >
                              {item.name}
                            </td>
                            <td className="py-4 pr-4 text-sm text-slate-500">
                              {formatDisplayDate(item.analysisDate)}
                            </td>
                            <td
                              className="py-4 pr-4 text-lg font-semibold tracking-[-0.03em]"
                              style={{ color: NAVY }}
                            >
                              {item.sleepScore ?? "—"}
                            </td>
                            <td className="py-4 pr-4 text-sm">
                              <TrendGlyph item={item} />
                            </td>
                            <td className="max-w-[240px] py-4 pr-4 text-sm leading-6 text-slate-500">
                              {item.summary}
                            </td>
                            <td className="py-4">
                              <Link
                                href={`/analysis/result?analysisId=${encodeURIComponent(item.analysisId)}`}
                                className="text-[13px] font-semibold underline-offset-4 transition hover:underline"
                                style={{ color: GOLD }}
                              >
                                詳細を見る
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="space-y-3 md:hidden">
                    {stats.recentAnalyses.map((item) => (
                      <li
                        key={`${item.clientId}-${item.analysisId}-m`}
                        className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p
                              className="font-semibold"
                              style={{ color: NAVY }}
                            >
                              {item.name}
                            </p>
                            <p className="mt-1 text-[12px] text-slate-400">
                              {formatDisplayDate(item.analysisDate)}
                            </p>
                          </div>
                          <p
                            className="text-xl font-semibold tracking-[-0.04em]"
                            style={{ color: NAVY }}
                          >
                            {item.sleepScore ?? "—"}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <TrendGlyph item={item} />
                          <Link
                            href={`/analysis/result?analysisId=${encodeURIComponent(item.analysisId)}`}
                            className="text-[13px] font-semibold"
                            style={{ color: GOLD }}
                          >
                            詳細を見る →
                          </Link>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                          {item.summary}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <NewClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          void refresh();
        }}
      />
    </main>
  );
}
