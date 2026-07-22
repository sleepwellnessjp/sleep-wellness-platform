"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SURFACE_WARM, TEAL } from "@/components/ui/tokens";
import {
  formatExecutiveMetric,
  formatTimelineClock,
  getDemoExecutiveDashboard,
  computeExecutiveDashboardFromClients,
  type ExecutiveActivityKind,
  type ExecutiveDashboardData,
} from "@/lib/executive-dashboard";
import { loadClients } from "@/lib/repositories/client-repository";

function StatTile({
  label,
  value,
  hint,
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  delay?: number;
}) {
  return (
    <article
      className="animate-fade-up rounded-[24px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)] sm:px-6 sm:py-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[1.75rem] font-semibold tracking-[-0.04em] tabular-nums sm:text-3xl"
        style={{ color: NAVY }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-[12px] leading-5 text-slate-400">{hint}</p>
      ) : null}
    </article>
  );
}

function kindAccent(kind: ExecutiveActivityKind): string {
  switch (kind) {
    case "analysis":
      return NAVY;
    case "homework":
      return TEAL;
    case "journey":
      return GOLD;
    case "certification":
      return "#4a5568";
    case "login":
    default:
      return "#64748b";
  }
}

export function ExecutiveDashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[24px]" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-[28px]" />
      <Skeleton className="h-32 rounded-[28px]" />
      <Skeleton className="h-48 rounded-[28px]" />
    </div>
  );
}

export default function ExecutiveDashboard({
  initialData,
  className = "",
}: {
  initialData?: ExecutiveDashboardData | null;
  className?: string;
}) {
  const [data, setData] = useState<ExecutiveDashboardData | null>(
    initialData ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/executive", { cache: "no-store" });
        const json = (await response.json()) as {
          dashboard?: ExecutiveDashboardData;
          error?: string;
        };

        if (response.ok && json.dashboard) {
          if (!cancelled) {
            setData(json.dashboard);
            setError(null);
          }
          return;
        }

        // API 不可時はローカルクライアントで補強、なければデモ
        const clients = await loadClients().catch(() => []);
        if (!cancelled) {
          if (clients.length > 0) {
            setData(computeExecutiveDashboardFromClients(clients));
          } else {
            setData(getDemoExecutiveDashboard("platform"));
          }
          if (json.error) setError(null);
        }
      } catch {
        try {
          const clients = await loadClients();
          if (!cancelled) {
            setData(
              clients.length > 0
                ? computeExecutiveDashboardFromClients(clients)
                : getDemoExecutiveDashboard("platform"),
            );
          }
        } catch {
          if (!cancelled) {
            setData(getDemoExecutiveDashboard("platform"));
            setError(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  if (loading) return <ExecutiveDashboardLoading />;

  if (!data) {
    return (
      <SectionCard title="Executive Dashboard" eyebrow="EXECUTIVE">
        <p className="text-sm text-slate-600">
          {error ?? "ダッシュボードを表示できませんでした。"}
        </p>
      </SectionCard>
    );
  }

  const { overview, improvement, today, successStory, timeline } = data;

  return (
    <div className={`space-y-5 sm:space-y-6 ${className}`}>
      <header className="animate-fade-up">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          EXECUTIVE DASHBOARD
        </p>
        <h2
          className="mt-2 text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-3xl"
          style={{ color: NAVY }}
        >
          何が、どれだけ改善されているか
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-slate-500 sm:text-[15px]">
          既存の分析・宿題・Journey・認定データを、プラットフォーム価値として一目で把握します。
        </p>
      </header>

      {/* ① Platform Overview */}
      <section aria-labelledby="exec-overview">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3
            id="exec-overview"
            className="text-[13px] font-semibold tracking-[0.08em]"
            style={{ color: NAVY }}
          >
            Platform Overview
          </h3>
          <span
            className="text-[10px] font-semibold tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            {data.scope === "platform" ? "PLATFORM" : "MY CLIENTS"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="認定講師数"
            value={String(overview.instructorCount)}
            delay={40}
          />
          <StatTile
            label="クライアント数"
            value={String(overview.clientCount)}
            delay={80}
          />
          <StatTile
            label="分析件数"
            value={String(overview.analysisCount)}
            delay={120}
          />
          <StatTile
            label="平均 Sleep Wellness Score"
            value={formatExecutiveMetric(overview.averageSleepWellnessScore)}
            delay={160}
          />
        </div>
      </section>

      {/* ② Improvement Summary */}
      <SectionCard eyebrow="IMPROVEMENT" title="Improvement Summary">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "平均 Score 改善",
              value: formatExecutiveMetric(improvement.averageScoreDelta, {
                sign: true,
              }),
            },
            {
              label: "平均睡眠効率",
              value: formatExecutiveMetric(improvement.averageSleepEfficiency, {
                suffix: "%",
              }),
            },
            {
              label: "平均 HRV",
              value: formatExecutiveMetric(improvement.averageHrv),
            },
            {
              label: "宿題達成率",
              value: formatExecutiveMetric(improvement.homeworkCompletionRate, {
                digits: 0,
                suffix: "%",
              }),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: SURFACE_WARM }}
            >
              <p className="text-[11px] font-medium text-slate-500">
                {item.label}
              </p>
              <p
                className="mt-2 text-2xl font-semibold tracking-[-0.03em] tabular-nums"
                style={{ color: NAVY }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ③ Today */}
      <SectionCard eyebrow="TODAY" title="Today">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "今日の分析件数", value: String(today.analysesCount) },
            {
              label: "今日の宿題完了",
              value: String(today.homeworkCompleted),
            },
            { label: "今日のログイン数", value: String(today.loginCount) },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-4 sm:flex-col sm:items-start sm:justify-start"
            >
              <p className="text-[12px] font-medium text-slate-500">
                {item.label}
              </p>
              <p
                className="text-2xl font-semibold tabular-nums tracking-[-0.03em]"
                style={{ color: NAVY }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ④ Success Story */}
      <SectionCard eyebrow="SUCCESS STORY" title="Success Story">
        {!successStory ? (
          <div
            className="rounded-2xl px-4 py-8 text-center"
            style={{ backgroundColor: SURFACE_WARM }}
          >
            <p className="text-sm leading-7 text-slate-500">
              まだ比較可能な Journey 改善例がありません。
            </p>
            <p className="mt-1 text-[13px] text-slate-400">
              分析が2回以上蓄積されると、匿名の改善ストーリーが表示されます。
            </p>
          </div>
        ) : (
          <article className="rounded-[22px] border border-slate-100 bg-gradient-to-br from-white to-[#fafaf8] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.16em]"
                style={{
                  color: GOLD,
                  backgroundColor: "rgba(138,106,45,0.12)",
                }}
              >
                ANONYMOUS
              </span>
              <span className="text-[12px] text-slate-400">
                {successStory.anonymousLabel}
              </span>
            </div>
            <h4
              className="mt-4 text-lg font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              {successStory.title}
            </h4>
            <p className="mt-3 text-[14px] leading-7 text-slate-600">
              {successStory.summary}
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-[11px] text-slate-400">Score</p>
                <p
                  className="mt-1 text-xl font-semibold tabular-nums"
                  style={{ color: NAVY }}
                >
                  {formatExecutiveMetric(successStory.scoreFrom, { digits: 0 })}
                  <span className="mx-2 text-slate-300">→</span>
                  {formatExecutiveMetric(successStory.scoreTo, { digits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">改善</p>
                <p
                  className="mt-1 text-xl font-semibold tabular-nums"
                  style={{ color: TEAL }}
                >
                  {formatExecutiveMetric(successStory.scoreDelta, {
                    digits: 0,
                    sign: true,
                  })}
                </p>
              </div>
            </div>
            {successStory.badges.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {successStory.badges.map((badge) => (
                  <li
                    key={badge.id}
                    className="rounded-full px-3 py-1 text-[11px] font-semibold"
                    style={{
                      color: NAVY,
                      backgroundColor: "rgba(7,20,38,0.06)",
                    }}
                  >
                    {badge.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        )}
      </SectionCard>

      {/* ⑤ Activity Timeline */}
      <SectionCard eyebrow="ACTIVITY" title="Activity Timeline">
        {timeline.length === 0 ? (
          <div
            className="rounded-2xl px-4 py-8 text-center"
            style={{ backgroundColor: SURFACE_WARM }}
          >
            <p className="text-sm leading-7 text-slate-500">
              今日の活動はまだありません。
            </p>
          </div>
        ) : (
          <ol className="relative space-y-0">
            {timeline.map((item, index) => {
              const isLast = index === timeline.length - 1;
              const accent = kindAccent(item.kind);
              return (
                <li key={item.id} className="relative flex gap-4 pb-5">
                  <div className="flex w-12 shrink-0 flex-col items-end pt-0.5">
                    <time
                      dateTime={item.at}
                      className="text-[12px] font-semibold tabular-nums text-slate-500"
                    >
                      {formatTimelineClock(item.at)}
                    </time>
                  </div>
                  <div className="relative flex flex-col items-center">
                    <span
                      className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    {!isLast ? (
                      <span
                        className="mt-1 w-px flex-1 bg-slate-200"
                        style={{ minHeight: 28 }}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 pt-0">
                    <p
                      className="text-[11px] font-semibold tracking-[0.14em]"
                      style={{ color: accent }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="mt-1 text-[14px] font-medium tracking-[-0.02em]"
                      style={{ color: NAVY }}
                    >
                      {item.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
