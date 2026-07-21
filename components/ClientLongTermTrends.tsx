"use client";

import { useMemo, useState } from "react";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  buildTrendCommentary,
  buildTrendSeries,
  computeTrendStats,
  filterAnalysesByPeriod,
  TREND_METRICS,
  type TrendMetricId,
  type TrendPeriod,
} from "@/lib/trend-analysis";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const TEAL = "#315f68";

function MetricTrendChart({
  series,
  metricId,
}: {
  series: ReturnType<typeof buildTrendSeries>;
  metricId: TrendMetricId;
}) {
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 36, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const numericPoints = series.filter(
    (p): p is typeof p & { value: number } => p.value != null,
  );

  if (numericPoints.length === 0) {
    const hasText = series.some((p) => p.display && p.display !== "データ未取得");
    return (
      <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#fafaf8] text-sm text-slate-400">
        {hasText ? "数値化できない指標です（一覧は下の統計を参照）" : "データ未取得"}
      </div>
    );
  }

  const values = numericPoints.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = (maxV - minV) * 0.1 || 1;
  const yMin = minV - pad;
  const yMax = maxV + pad;
  const yRange = Math.max(1, yMax - yMin);

  const xAt = (index: number) => {
    if (series.length === 1) return padding.left + innerW / 2;
    return padding.left + (index / (series.length - 1)) * innerW;
  };

  const yAt = (value: number) =>
    padding.top + ((yMax - value) / yRange) * innerH;

  const segments: string[] = [];
  let current: string[] = [];

  series.forEach((point, index) => {
    if (point.value == null) {
      if (current.length > 0) {
        segments.push(current.join(" "));
        current = [];
      }
      return;
    }
    const x = xAt(index);
    const y = yAt(point.value);
    current.push(
      `${current.length === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`,
    );
  });
  if (current.length > 0) segments.push(current.join(" "));

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-2 py-3 sm:px-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="長期推移グラフ"
      >
        {[0, 0.5, 1].map((ratio) => {
          const v = yMin + yRange * (1 - ratio);
          const y = padding.top + innerH * ratio;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgba(7,20,38,0.08)"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
              >
                {Math.round(v * 10) / 10}
              </text>
            </g>
          );
        })}

        {segments.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke={TEAL}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {series.map((point, index) => {
          if (point.value == null) return null;
          const x = xAt(index);
          const y = yAt(point.value);
          return (
            <g key={`${point.date}-${index}`}>
              <circle
                cx={x}
                cy={y}
                r={5}
                fill={GOLD}
                stroke={NAVY}
                strokeWidth="1.5"
              />
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
              >
                {point.date.slice(5).replace("-", "/")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-3 py-3 sm:px-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className="mt-1 text-sm font-semibold tracking-[-0.02em] sm:text-[15px]"
        style={{ color: NAVY }}
      >
        {value}
      </p>
    </div>
  );
}

export default function ClientLongTermTrends({
  analyses,
}: {
  analyses: StoredAnalysis[];
}) {
  const [period, setPeriod] = useState<TrendPeriod>(30);
  const [metricId, setMetricId] = useState<TrendMetricId>("sleepScore");

  const filtered = useMemo(
    () => filterAnalysesByPeriod(analyses, period),
    [analyses, period],
  );

  const series = useMemo(
    () => buildTrendSeries(filtered, metricId),
    [filtered, metricId],
  );

  const stats = useMemo(
    () => computeTrendStats(series, metricId),
    [series, metricId],
  );

  const commentary = useMemo(
    () => buildTrendCommentary(analyses, period),
    [analyses, period],
  );

  const periods: { value: TrendPeriod; label: string }[] = [
    { value: 7, label: "7日" },
    { value: 30, label: "30日" },
    { value: 90, label: "90日" },
    { value: "all", label: "全期間" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <button
              key={String(p.value)}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                period === p.value
                  ? "text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              style={
                period === p.value ? { backgroundColor: NAVY } : undefined
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="block min-w-[200px]">
          <span className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">
            指標
          </span>
          <select
            value={metricId}
            onChange={(e) => setMetricId(e.target.value as TrendMetricId)}
            className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-2.5 text-sm font-medium text-[#071426] outline-none focus:border-[#315f68] focus:ring-2 focus:ring-[#315f68]/10"
          >
            {TREND_METRICS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-[#fafaf8] px-5 py-10 text-center text-sm text-slate-400">
          選択期間に分析データがありません
        </p>
      ) : (
        <>
          <MetricTrendChart series={series} metricId={metricId} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="最新値" value={stats.latest} />
            <StatTile label="平均値" value={stats.average} />
            <StatTile label="前回比" value={stats.previousDelta} />
            <StatTile label="期間内 最低" value={stats.min} />
            <StatTile label="期間内 最高" value={stats.max} />
          </div>
        </>
      )}

      <div className="rounded-2xl border border-[#071426]/10 bg-[#fafafa] px-4 py-5 sm:px-6">
        <p
          className="text-[11px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          LONG-TERM INSIGHT
        </p>
        <h3
          className="mt-2 text-base font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          長期分析コメント
        </h3>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          単日のデータだけで医療的な断定はせず、期間内の傾向としてお伝えします。継続確認が必要な項目があります。
        </p>

        {commentary.improving.length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] font-semibold text-[#0f6b5c]">
              改善している可能性がある項目
            </p>
            <ul className="mt-2 space-y-1.5">
              {commentary.improving.map((item) => (
                <li key={item} className="text-[13px] leading-6 text-slate-600">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {commentary.worsening.length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] font-semibold text-[#b45a1a]">
              悪化傾向が見られる項目
            </p>
            <ul className="mt-2 space-y-1.5">
              {commentary.worsening.map((item) => (
                <li key={item} className="text-[13px] leading-6 text-slate-600">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {commentary.stable.length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] font-semibold text-slate-600">
              変化が少ない項目
            </p>
            <ul className="mt-2 space-y-1.5">
              {commentary.stable.map((item) => (
                <li key={item} className="text-[13px] leading-6 text-slate-600">
                  · {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {commentary.priorities.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#8a6a2d]/20 bg-white px-4 py-3">
            <p
              className="text-[13px] font-semibold"
              style={{ color: GOLD }}
            >
              優先して取り組む項目
            </p>
            <p className="mt-1 text-[13px] leading-6 text-slate-600">
              {commentary.priorities.join("、")}
            </p>
          </div>
        )}

        <div className="mt-4 border-l-[3px] pl-4" style={{ borderColor: GOLD }}>
          <p
            className="text-[13px] font-semibold"
            style={{ color: NAVY }}
          >
            メラトニンヨガ™の提案
          </p>
          <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
            {commentary.melatoninYoga}
          </p>
        </div>
      </div>
    </div>
  );
}
