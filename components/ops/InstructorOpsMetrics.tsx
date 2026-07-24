"use client";

import Link from "next/link";
import { formatCount, formatPercent } from "@/lib/ops/constants";
import type { InstructorOpsDashboard } from "@/lib/ops/types";
import { GOLD, NAVY, SURFACE_WARM } from "@/components/ui/tokens";

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-[22px] border border-[rgba(7,20,38,0.1)] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(7,20,38,0.04),0_12px_40px_-24px_rgba(7,20,38,0.18)]">
      <p className="text-[10px] font-semibold tracking-[0.16em]" style={{ color: GOLD }}>
        {label}
      </p>
      <p
        className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] tabular-nums"
        style={{ color: NAVY }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-5 text-slate-400">{hint}</p>
      ) : null}
    </article>
  );
}

export default function InstructorOpsMetrics({
  data,
}: {
  data: InstructorOpsDashboard;
}) {
  const renewalHint =
    data.daysUntilRenewal == null
      ? undefined
      : data.daysUntilRenewal < 0
        ? "期限超過"
        : `残り ${data.daysUntilRenewal} 日`;

  return (
    <section
      className="rounded-[28px] border border-[rgba(7,20,38,0.1)] bg-white px-4 py-5 shadow-[0_1px_2px_rgba(7,20,38,0.04),0_12px_40px_-24px_rgba(7,20,38,0.18)] sm:px-6 sm:py-6"
      aria-label="認定講師KPI"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em]" style={{ color: GOLD }}>
            CERTIFIED INSTRUCTOR
          </p>
          <h2
            className="mt-1 text-lg font-semibold tracking-[-0.03em] sm:text-xl"
            style={{ color: NAVY }}
          >
            今月の運営サマリー
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-slate-500">
            {[data.levelLabel, data.schoolName, data.instructorNumber]
              .filter(Boolean)
              .join(" · ") || "認定情報を確認できます"}
          </p>
        </div>
        <Link
          href="/license"
          className="rounded-full px-4 py-2 text-[12px] font-semibold text-white"
          style={{ backgroundColor: NAVY }}
        >
          ライセンス詳細
        </Link>
      </div>

      <div
        className="mb-4 rounded-2xl border px-4 py-3"
        style={{
          borderColor: "rgba(138,106,45,0.25)",
          backgroundColor: SURFACE_WARM,
        }}
      >
        <p className="text-[12px] font-semibold" style={{ color: NAVY }}>
          ライセンス状況 · {data.licenseStatusLabel}
        </p>
        <p className="mt-1 text-[12px] text-slate-500">
          更新期限 {data.renewsAt ?? "—"}
          {renewalHint ? `（${renewalHint}）` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="今月のクライアント数" value={formatCount(data.clientsThisMonth)} />
        <Tile label="分析件数" value={formatCount(data.analysesThisMonth)} />
        <Tile label="改善率" value={formatPercent(data.improvementRate, 0)} />
        <Tile label="継続率" value={formatPercent(data.retentionRate, 0)} />
        <Tile
          label="ライセンス状況"
          value={data.licenseStatusLabel}
          hint={data.levelLabel ?? undefined}
        />
        <Tile
          label="更新期限"
          value={data.renewsAt ?? "—"}
          hint={renewalHint}
        />
      </div>
    </section>
  );
}
