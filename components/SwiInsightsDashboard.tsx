"use client";

import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { SwiInsightsOverview } from "@/lib/swi/types";

function fmt(value: number | null | undefined, digits = 1, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}${suffix}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6">
      <p
        className="text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        {label.toUpperCase()}
      </p>
      <p
        className="mt-4 text-3xl font-semibold tracking-[-0.04em]"
        style={{ color: NAVY }}
      >
        {value}
      </p>
    </article>
  );
}

function BarRow({
  label,
  valueLabel,
  ratio,
  tone = "navy",
}: {
  label: string;
  valueLabel: string;
  ratio: number;
  tone?: "navy" | "teal" | "gold";
}) {
  const color = tone === "gold" ? GOLD : tone === "teal" ? TEAL : NAVY;
  const width = Math.max(4, Math.min(100, ratio * 100));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-slate-800">
            {label}
          </p>
          <p className="shrink-0 text-sm font-semibold" style={{ color: NAVY }}>
            {valueLabel}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${width}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

export function SwiInsightsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-[28px]" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-[28px]" />
      <Skeleton className="h-56 rounded-[28px]" />
    </div>
  );
}

export default function SwiInsightsDashboard({
  insights,
}: {
  insights: SwiInsightsOverview;
}) {
  const maxIntervention =
    Math.max(
      ...insights.interventionRanking.map((item) => item.improvementRate ?? 0),
      1,
    ) || 1;
  const maxAgeImprove =
    Math.max(...insights.ageBands.map((item) => item.improvementRate ?? 0), 1) ||
    1;
  const maxRetention =
    Math.max(...insights.retention.map((item) => item.rate ?? 0), 1) || 1;
  const maxHomework =
    Math.max(
      ...insights.homeworkAchievement.map((item) => item.completionRate ?? 0),
      1,
    ) || 1;
  const maxJourney =
    Math.max(
      ...insights.journeyPatterns.map((item) => item.sharePercent ?? 0),
      1,
    ) || 1;

  const overallCards = [
    {
      label: "登録クライアント数",
      value: String(insights.overall.clientCount),
    },
    {
      label: "分析件数",
      value: String(insights.overall.analysisCount),
    },
    {
      label: "平均 Sleep Wellness Score",
      value: fmt(insights.overall.averageSleepWellnessScore),
    },
    {
      label: "平均睡眠時間",
      value: fmt(insights.overall.averageSleepDurationHours, 1, " h"),
    },
    {
      label: "平均睡眠効率",
      value: fmt(insights.overall.averageSleepEfficiency, 1, "%"),
    },
    {
      label: "平均 HRV",
      value: fmt(insights.overall.averageHrv, 1),
    },
    {
      label: "平均ストレス",
      value: fmt(insights.overall.averageStress, 1),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span
          className="rounded-full px-3 py-1 font-semibold tracking-[0.14em]"
          style={{ backgroundColor: "rgba(138,106,45,0.12)", color: GOLD }}
        >
          {insights.scope === "platform" ? "PLATFORM" : "MY CLIENTS"}
        </span>
        <span>匿名集計のみ · 個人情報は表示しません</span>
        <span aria-hidden>·</span>
        <span>{insights.source === "rules" ? "Rules engine" : "AI"}</span>
      </div>

      <section aria-labelledby="swi-overall">
        <h2 id="swi-overall" className="sr-only">
          全体統計
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overallCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="RANKING" title="改善ランキング">
          {insights.interventionRanking.length === 0 ? (
            <p className="text-sm text-slate-500">まだ介入データがありません。</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {insights.interventionRanking.map((item, index) => (
                <BarRow
                  key={item.id}
                  label={`${index + 1}. ${item.label}`}
                  valueLabel={
                    item.improvementRate != null
                      ? `${item.improvementRate}%`
                      : "—"
                  }
                  ratio={(item.improvementRate ?? 0) / maxIntervention}
                  tone={index === 0 ? "gold" : "navy"}
                />
              ))}
            </div>
          )}
          <p className="mt-4 text-[12px] leading-5 text-slate-400">
            改善率 = 当該介入の宿題があるクライアントのうち、Score が +3
            以上伸びた割合（匿名）。
          </p>
        </SectionCard>

        <SectionCard eyebrow="AGE" title="年代別分析">
          <div className="divide-y divide-slate-100">
            {insights.ageBands.map((item) => (
              <div
                key={item.band}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-3 sm:grid-cols-[5rem_minmax(0,1fr)_5rem]"
              >
                <p
                  className="text-sm font-semibold"
                  style={{ color: NAVY }}
                >
                  {item.label}
                </p>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12px] text-slate-500">
                      平均 Score {fmt(item.averageScore)}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: TEAL }}>
                      {item.improvementRate != null
                        ? `${item.improvementRate}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, ((item.improvementRate ?? 0) / maxAgeImprove) * 100)}%`,
                        backgroundColor: TEAL,
                      }}
                    />
                  </div>
                </div>
                <p className="hidden text-right text-[11px] text-slate-400 sm:block">
                  n={item.clientCount}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="GENDER" title="男女比較">
          <div className="space-y-4">
            {insights.genderComparison
              .filter((item) => item.gender === "female" || item.gender === "male")
              .map((item) => (
                <div
                  key={item.gender}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-base font-semibold" style={{ color: NAVY }}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.clientCount} 名 · {item.analysisCount} 件
                    </p>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <dt className="text-[10px] tracking-[0.14em] text-slate-400">
                        SCORE
                      </dt>
                      <dd
                        className="mt-1 text-lg font-semibold"
                        style={{ color: NAVY }}
                      >
                        {fmt(item.averageScore)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] tracking-[0.14em] text-slate-400">
                        効率
                      </dt>
                      <dd
                        className="mt-1 text-lg font-semibold"
                        style={{ color: NAVY }}
                      >
                        {fmt(item.averageSleepEfficiency, 0, "%")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] tracking-[0.14em] text-slate-400">
                        改善率
                      </dt>
                      <dd
                        className="mt-1 text-lg font-semibold"
                        style={{ color: TEAL }}
                      >
                        {item.improvementRate != null
                          ? `${item.improvementRate}%`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="RETENTION" title="継続率">
          <div className="divide-y divide-slate-100">
            {insights.retention.map((item) => (
              <BarRow
                key={item.days}
                label={item.label}
                valueLabel={item.rate != null ? `${item.rate}%` : "—"}
                ratio={(item.rate ?? 0) / maxRetention}
                tone="teal"
              />
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-5 text-slate-400">
            登録から N 日以上経過したクライアントのうち、直近 N
            日以内に分析がある割合。
          </p>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard eyebrow="HOMEWORK" title="宿題達成率">
          {insights.homeworkAchievement.length === 0 ? (
            <p className="text-sm text-slate-500">宿題データがありません。</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {insights.homeworkAchievement.map((item) => (
                <div key={item.title} className="py-3">
                  <BarRow
                    label={item.title}
                    valueLabel={
                      item.completionRate != null
                        ? `${item.completionRate}%`
                        : "—"
                    }
                    ratio={(item.completionRate ?? 0) / maxHomework}
                    tone="gold"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    実施 {item.completedCount}/{item.assignedCount}
                    {item.improvementRate != null
                      ? ` · 改善率 ${item.improvementRate}%`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard eyebrow="JOURNEY" title="Journey分析">
          {insights.journeyPatterns.length === 0 ? (
            <p className="text-sm text-slate-500">
              Journey 分類に必要な分析が不足しています。
            </p>
          ) : (
            <div className="space-y-4">
              {insights.journeyPatterns.map((item) => (
                <div key={item.id}>
                  <BarRow
                    label={item.label}
                    valueLabel={
                      item.sharePercent != null
                        ? `${item.sharePercent}%`
                        : "—"
                    }
                    ratio={(item.sharePercent ?? 0) / maxJourney}
                    tone="navy"
                  />
                  <p className="mt-1 text-[12px] leading-5 text-slate-500">
                    {item.description}
                    <span className="text-slate-400">
                      {" "}
                      · n={item.clientCount}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
