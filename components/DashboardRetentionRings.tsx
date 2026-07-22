"use client";

import { useEffect, useState } from "react";
import type { RetentionStats } from "@/lib/dashboard-stats";

const NAVY = "#071426";
const TEAL = "#315f68";
const GOLD = "#8a6a2d";
const CHURN = "#9a5b4a";

type RingSpec = {
  label: string;
  rate: number | null;
  color: string;
  track: string;
  size: number;
  stroke: number;
};

function Ring({
  label,
  rate,
  color,
  track,
  size,
  stroke,
  animate,
}: RingSpec & { animate: boolean }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = rate == null ? 0 : Math.max(0, Math.min(100, rate)) / 100;
  const offset = circumference * (1 - (animate ? progress : 0));

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={track}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            className="text-[1.65rem] font-semibold tracking-[-0.05em] tabular-nums sm:text-[1.85rem]"
            style={{ color: NAVY }}
          >
            {rate != null ? rate : "—"}
            {rate != null ? (
              <span className="ml-0.5 text-sm font-medium text-slate-400">%</span>
            ) : null}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function formatFrequency(stats: RetentionStats["frequency"]): string {
  if (stats.perMonth != null) {
    return `月${stats.perMonth}回`;
  }
  if (stats.avgDaysBetween != null) {
    return `平均${stats.avgDaysBetween}日`;
  }
  return "—";
}

export default function DashboardRetentionRings({
  retention,
}: {
  retention: RetentionStats;
}) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, [retention]);

  const rings: RingSpec[] = [
    {
      label: "3か月継続",
      rate: retention.months3.rate,
      color: TEAL,
      track: "rgba(49, 95, 104, 0.12)",
      size: 118,
      stroke: 11,
    },
    {
      label: "6か月継続",
      rate: retention.months6.rate,
      color: GOLD,
      track: "rgba(138, 106, 45, 0.14)",
      size: 118,
      stroke: 11,
    },
  ];

  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-7 sm:py-8">
      <div className="mb-6 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2
            className="text-lg font-semibold tracking-[-0.03em]"
            style={{ color: NAVY }}
          >
            継続率
          </h2>
          <p className="mt-1 text-[13px] text-slate-400">
            直近45日以内に分析がある割合
          </p>
        </div>
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          RETENTION
        </p>
      </div>

      <div className="flex items-center justify-center gap-10 sm:gap-16">
        {rings.map((ring) => (
          <Ring key={ring.label} {...ring} animate={animate} />
        ))}
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
        <div className="rounded-2xl bg-[#fafaf8] px-4 py-4">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CHURN }}
              aria-hidden
            />
            <p className="text-[12px] font-medium text-slate-500">離脱率</p>
          </div>
          <p
            className="mt-2 text-[1.65rem] font-semibold tracking-[-0.05em] tabular-nums"
            style={{ color: NAVY }}
          >
            {retention.churnRate != null ? retention.churnRate : "—"}
            {retention.churnRate != null ? (
              <span className="ml-0.5 text-sm font-medium text-slate-400">%</span>
            ) : null}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">60日以上未分析</p>
        </div>

        <div className="rounded-2xl bg-[#fafaf8] px-4 py-4">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: TEAL }}
              aria-hidden
            />
            <p className="text-[12px] font-medium text-slate-500">分析頻度</p>
          </div>
          <p
            className="mt-2 text-[1.65rem] font-semibold tracking-[-0.05em] tabular-nums"
            style={{ color: NAVY }}
          >
            {formatFrequency(retention.frequency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {retention.frequency.avgDaysBetween != null
              ? `平均${retention.frequency.avgDaysBetween}日ごと`
              : "複数回分析から算出"}
          </p>
        </div>
      </div>
    </section>
  );
}
