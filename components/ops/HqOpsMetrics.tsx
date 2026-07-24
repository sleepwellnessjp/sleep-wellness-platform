"use client";

import Link from "next/link";
import {
  formatCount,
  formatPercent,
} from "@/lib/ops/constants";
import type { HqOpsDashboard } from "@/lib/ops/types";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";

function Metric({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <article className="rounded-[24px] border border-[rgba(7,20,38,0.1)] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(7,20,38,0.04),0_12px_40px_-24px_rgba(7,20,38,0.18)] sm:px-6">
      <p className="text-[10px] font-semibold tracking-[0.18em]" style={{ color: GOLD }}>
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
  if (!href) return inner;
  return (
    <Link href={href} className="block transition hover:opacity-95">
      {inner}
    </Link>
  );
}

export default function HqOpsMetrics({ data }: { data: HqOpsDashboard }) {
  return (
    <section aria-label="SWIJ本部KPI">
      <div
        className="mb-5 rounded-[24px] border px-5 py-4 sm:px-6"
        style={{
          borderColor: "rgba(138,106,45,0.28)",
          backgroundColor: SURFACE_WARM,
        }}
      >
        <p className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: GOLD }}>
          SWIJ HEADQUARTERS
        </p>
        <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em]" style={{ color: NAVY }}>
          Sleep Wellness Institute Japan 本部ダッシュボード
        </p>
        <p className="mt-1 text-[13px] leading-6 text-slate-500">
          全国の認定講師・認定校・分析・改善・イベントを一元把握します。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="全国認定講師数"
          value={formatCount(data.instructorCount)}
          hint={`更新間近 ${formatCount(data.renewingSoonCount)} · 停止 ${formatCount(data.suspendedCount)}`}
          href="/admin/certification"
        />
        <Metric
          label="認定校数"
          value={formatCount(data.schoolCount)}
          href="/admin/schools"
        />
        <Metric
          label="分析件数"
          value={formatCount(data.analysisCount)}
          href="/admin/analytics"
        />
        <Metric
          label="平均改善率"
          value={formatPercent(data.averageImprovementRate, 1)}
        />
        <Metric
          label="アクティブ率"
          value={formatPercent(data.activeRate, 0)}
          hint="有効ステータスの認定講師比率"
        />
        <Metric
          label="イベント数"
          value={formatCount(data.eventCount)}
          hint="開催予定・受付中"
          href="/admin/notifications"
        />
      </div>
    </section>
  );
}

export function HqOpsMetricsLoading() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-[24px] bg-slate-100/80"
        />
      ))}
    </div>
  );
}
