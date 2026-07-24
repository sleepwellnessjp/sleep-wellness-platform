"use client";

import type { WeeklyScorePoint } from "@/lib/client-portal/types";
import { GOLD, NAVY } from "@/components/ui/tokens";

export function WeeklyScoreTrendChart({
  points,
}: {
  points: WeeklyScorePoint[];
}) {
  const scored = points.filter((p) => p.score != null);
  if (scored.length === 0) {
    return (
      <p className="text-[14px] leading-7 text-slate-400">
        今週のスコア推移はまだありません
      </p>
    );
  }

  const values = scored.map((p) => p.score as number);
  const minY = Math.max(0, Math.min(...values) - 5);
  const maxY = Math.min(100, Math.max(...values) + 5);
  const range = maxY - minY || 1;
  const w = 100;
  const h = 48;
  const pad = 4;

  const coords = scored.map((p, i) => {
    const x = pad + (i / Math.max(1, scored.length - 1)) * (w - pad * 2);
    const y = pad + (1 - ((p.score as number) - minY) / range) * (h - pad * 2);
    return { x, y, label: p.label, score: p.score as number };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-28 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="今週の睡眠スコア推移"
      >
        <polyline
          fill="none"
          stroke={GOLD}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
        {coords.map((c) => (
          <circle
            key={`${c.label}-${c.score}`}
            cx={c.x}
            cy={c.y}
            r="1.8"
            fill={NAVY}
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between gap-1">
        {coords.map((c) => (
          <div key={c.label} className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-semibold tabular-nums" style={{ color: NAVY }}>
              {Math.round(c.score)}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressMeter({
  label,
  percent,
}: {
  label: string;
  percent: number | null;
}) {
  const value = percent == null ? null : Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-500">{label}</p>
        <p
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: NAVY }}
        >
          {value == null ? "—" : `${value}%`}
        </p>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(7,20,38,0.06)" }}
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: value == null ? "0%" : `${value}%`,
            backgroundColor: GOLD,
          }}
        />
      </div>
    </div>
  );
}
