"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatGlucoseClockTokyo,
  NIGHT_GLUCOSE_DISCLAIMER,
  type NightGlucoseReportPayload,
  type NightGlucoseReportPoint,
} from "@/lib/glucose/night-glucose-report";
import { GOLD, MUTED, NAVY, TEAL } from "@/components/ui/tokens";

const HISTORIC_COLOR = TEAL;
const SCAN_COLOR = GOLD;

function NightGlucoseChart({
  points,
  markers,
  startAtIso,
  endAtIso,
}: {
  points: NightGlucoseReportPoint[];
  markers: { sleepOnsetTime: string; wakeTime: string } | null;
  startAtIso: string;
  endAtIso: string;
}) {
  const width = 640;
  const height = 240;
  const padding = { top: 28, right: 20, bottom: 40, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[#071426]/15 bg-[#fafaf8] px-4 py-8 text-center">
        <p className="text-sm text-slate-500">この夜間帯のグルコース記録はありません</p>
      </div>
    );
  }

  const startMs = Date.parse(startAtIso);
  const endMs = Date.parse(endAtIso);
  const span = Math.max(1, endMs - startMs);
  const values = points.map((p) => p.glucoseMgDl);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad =
    rawMax === rawMin
      ? Math.max(10, Math.abs(rawMax) * 0.1 || 10)
      : (rawMax - rawMin) * 0.15;
  const minValue = Math.max(0, rawMin - pad);
  const maxValue = rawMax + pad;
  const range = Math.max(1, maxValue - minValue);

  const xAt = (iso: string) => {
    const t = Date.parse(iso);
    const ratio = (t - startMs) / span;
    return padding.left + Math.min(1, Math.max(0, ratio)) * innerW;
  };
  const yAt = (value: number) =>
    padding.top + (1 - (value - minValue) / range) * innerH;

  const historic = points.filter((p) => p.recordType === 0);
  const scans = points.filter((p) => p.recordType !== 0);

  const linePath = historic
    .map((p, i) => {
      const x = xAt(p.recordedAtIso);
      const y = yAt(p.glucoseMgDl);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const yTicks = [minValue, (minValue + maxValue) / 2, maxValue].map((v) =>
    Math.round(v),
  );
  const xLabels = [0, 0.5, 1].map((ratio) => {
    const ms = startMs + span * ratio;
    return {
      x: padding.left + ratio * innerW,
      label: formatGlucoseClockTokyo(new Date(ms).toISOString()),
    };
  });

  // markers があるとき window 端点＝入眠／起床
  const markerLines: Array<{ x: number; label: string }> = markers
    ? [
        { x: padding.left, label: `入眠 ${markers.sleepOnsetTime}` },
        { x: padding.left + innerW, label: `起床 ${markers.wakeTime}` },
      ]
    : [];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[280px]"
        role="img"
        aria-label="夜間帯のグルコース推移"
      >
        <rect
          x={padding.left}
          y={padding.top}
          width={innerW}
          height={innerH}
          fill="#fafaf8"
          stroke="rgba(7,20,38,0.08)"
        />
        {yTicks.map((tick) => {
          const y = yAt(tick);
          return (
            <g key={`y-${tick}`}>
              <line
                x1={padding.left}
                x2={padding.left + innerW}
                y1={y}
                y2={y}
                stroke="rgba(7,20,38,0.06)"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill={MUTED}
              >
                {tick}
              </text>
            </g>
          );
        })}
        {xLabels.map((item) => (
          <text
            key={`x-${item.label}-${item.x}`}
            x={item.x}
            y={height - 12}
            textAnchor="middle"
            fontSize="10"
            fill={MUTED}
          >
            {item.label}
          </text>
        ))}

        {markerLines.map((m) => (
          <g key={m.label}>
            <line
              x1={m.x}
              x2={m.x}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke={GOLD}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text
              x={m.x + (m.x > padding.left + innerW / 2 ? -4 : 4)}
              y={padding.top + 12}
              textAnchor={m.x > padding.left + innerW / 2 ? "end" : "start"}
              fontSize="9"
              fill={GOLD}
              fontWeight={600}
            >
              {m.label}
            </text>
          </g>
        ))}

        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke={HISTORIC_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {historic.map((p) => (
          <circle
            key={`h-${p.recordedAtIso}`}
            cx={xAt(p.recordedAtIso)}
            cy={yAt(p.glucoseMgDl)}
            r={3.2}
            fill={HISTORIC_COLOR}
          />
        ))}

        {scans.map((p) => {
          const cx = xAt(p.recordedAtIso);
          const cy = yAt(p.glucoseMgDl);
          const s = 4.5;
          return (
            <rect
              key={`s-${p.recordedAtIso}-${p.recordType}`}
              x={cx - s}
              y={cy - s}
              width={s * 2}
              height={s * 2}
              transform={`rotate(45 ${cx} ${cy})`}
              fill="#fff"
              stroke={SCAN_COLOR}
              strokeWidth={1.75}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: HISTORIC_COLOR }}
          />
          履歴（historic）
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rotate-45 border-2 bg-white"
            style={{ borderColor: SCAN_COLOR }}
          />
          スキャン
        </span>
      </div>
    </div>
  );
}

type Props = {
  clientId: string;
  analysisDate: string;
  sleepOnsetTime?: string | null;
  wakeTime?: string | null;
};

/**
 * 結果レポート用：夜間帯グルコース（グラフ・数値・料理リンク・注記）。
 * 仮説表示はステップ5。
 */
export function NightGlucoseReportView({
  payload,
}: {
  payload: NightGlucoseReportPayload;
}) {
  return (
    <div className="space-y-4">
      <NightGlucoseChart
        points={payload.points}
        markers={payload.markers}
        startAtIso={payload.window.startAtIso}
        endAtIso={payload.window.endAtIso}
      />

      {payload.stats ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          <StatCard
            label="平均"
            value={`${payload.stats.averageMgDl}`}
            unit="mg/dL"
          />
          <StatCard
            label="最低"
            value={`${payload.stats.min.glucoseMgDl}`}
            unit="mg/dL"
            sub={formatGlucoseClockTokyo(payload.stats.min.recordedAtIso)}
          />
          <StatCard
            label="最高"
            value={`${payload.stats.max.glucoseMgDl}`}
            unit="mg/dL"
            sub={formatGlucoseClockTokyo(payload.stats.max.recordedAtIso)}
          />
          <StatCard
            label="変動幅"
            value={`${payload.stats.rangeMgDl}`}
            unit="mg/dL"
          />
          <StatCard
            label="変動係数"
            value={`${payload.stats.cvPercent}`}
            unit="%"
          />
        </div>
      ) : payload.skipMessage ? (
        <p className="rounded-lg border border-[#071426]/08 bg-[#fafaf8] px-3 py-2.5 text-[12px] leading-5 text-slate-600 sm:text-[13px]">
          {payload.skipMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#071426]/08 pt-3">
        <Link
          href="/recipes"
          className="text-[13px] font-semibold underline-offset-4 hover:underline"
          style={{ color: NAVY }}
        >
          睡眠のための料理
        </Link>
      </div>

      <p className="whitespace-pre-line text-[11px] leading-5 text-slate-500 sm:text-[12px]">
        {NIGHT_GLUCOSE_DISCLAIMER}
      </p>
    </div>
  );
}

export default function NightGlucoseReportSection({
  clientId,
  analysisDate,
  sleepOnsetTime,
  wakeTime,
}: Props) {
  const [payload, setPayload] = useState<NightGlucoseReportPayload | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ analysisDate });
    if (sleepOnsetTime?.trim()) params.set("sleepOnset", sleepOnsetTime.trim());
    if (wakeTime?.trim()) params.set("wake", wakeTime.trim());

    void fetch(
      `/api/clients/${encodeURIComponent(clientId)}/glucose/night?${params}`,
    )
      .then(async (res) => {
        const json = (await res.json()) as NightGlucoseReportPayload & {
          ok?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "取得に失敗しました");
        if (!cancelled) setPayload(json);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "取得に失敗しました");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, analysisDate, sleepOnsetTime, wakeTime]);

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-sm text-slate-500">グルコースデータを読み込み中…</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-[#a33a3a]/20 bg-white px-3 py-2 text-sm text-[#a33a3a]">
          {error}
        </p>
      ) : null}
      {payload ? <NightGlucoseReportView payload={payload} /> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-[#071426]/08 bg-[#fafaf8] px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p
        className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em]"
        style={{ color: NAVY }}
      >
        {value}
        <span className="ml-1 text-[11px] font-medium text-slate-400">
          {unit}
        </span>
      </p>
      {sub ? (
        <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
      ) : null}
    </div>
  );
}
