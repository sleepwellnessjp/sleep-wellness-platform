"use client";

import { useEffect, useState } from "react";
import {
  formatGlucoseClockTokyo,
  NIGHT_GLUCOSE_ATTENTION_NOTE,
  NIGHT_GLUCOSE_DISCLAIMER,
  NIGHT_GLUCOSE_LOW_COVERAGE_NOTE,
  type NightGlucoseReportPayload,
  type NightGlucoseReportPoint,
} from "@/lib/glucose/night-glucose-report";
import { hasGlucoseChangeDuringAwake } from "@/lib/glucose/night-glucose-stats";
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
  const height = 248;
  const padding = { top: 32, right: 20, bottom: 44, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return null;
  }

  const startMs = Date.parse(startAtIso);
  const endMs = Date.parse(endAtIso);
  const span = Math.max(1, endMs - startMs);
  const values = points.map((p) => p.glucoseMgDl);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // 既定 60〜160。データがはみ出すときだけ広げる
  const minValue = Math.min(60, rawMin);
  const maxValue = Math.max(160, rawMax);
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

  const yTicks = [60, 100, 140].filter(
    (tick) => tick >= minValue && tick <= maxValue,
  );
  const bandTop = Math.min(140, maxValue);
  const bandBottom = Math.max(70, minValue);
  const showGuideBand = bandTop > bandBottom;
  const xLabels = [0, 0.5, 1].map((ratio) => {
    const ms = startMs + span * ratio;
    return {
      x: padding.left + ratio * innerW,
      label: formatGlucoseClockTokyo(new Date(ms).toISOString()),
    };
  });

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
        {showGuideBand ? (
          <rect
            x={padding.left}
            y={yAt(bandTop)}
            width={innerW}
            height={Math.max(0, yAt(bandBottom) - yAt(bandTop))}
            fill="rgba(49, 95, 104, 0.06)"
          />
        ) : null}
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
                className="fill-slate-400"
                style={{ fontSize: 10 }}
              >
                {tick}
              </text>
            </g>
          );
        })}
        {xLabels.map((label) => (
          <text
            key={`x-${label.x}`}
            x={label.x}
            y={height - 14}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: 12 }}
          >
            {label.label}
          </text>
        ))}
        {markerLines.map((m) => (
          <g key={m.label}>
            <line
              x1={m.x}
              x2={m.x}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke="rgba(138,106,45,0.45)"
              strokeDasharray="4 3"
            />
            <text
              x={m.x}
              y={padding.top - 12}
              textAnchor={m.x <= padding.left + 4 ? "start" : "end"}
              style={{ fontSize: 12, fill: GOLD, fontWeight: 600 }}
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
          const s = 4;
          return (
            <rect
              key={`s-${p.recordedAtIso}`}
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
          履歴（15分間隔）
        </span>
        {scans.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rotate-45 border-2 bg-white"
              style={{ borderColor: SCAN_COLOR }}
            />
            スキャン
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function NightGlucoseReportView({
  payload,
}: {
  payload: NightGlucoseReportPayload;
}) {
  if (!payload.hasData || !payload.stats) return null;

  const coveragePct = Math.round(payload.stats.coverageRatio * 100);

  return (
    <div className="space-y-4">
      {payload.coverageBelowThreshold ? (
        <p className="rounded-lg border border-[#8a6a2d]/25 bg-[#fffdf8] px-3 py-2 text-[12px] leading-5 text-slate-700 sm:text-[13px]">
          {NIGHT_GLUCOSE_LOW_COVERAGE_NOTE}
        </p>
      ) : null}

      <NightGlucoseChart
        points={payload.points}
        markers={payload.markers}
        startAtIso={payload.window.startAtIso}
        endAtIso={payload.window.endAtIso}
      />

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
          label="データ取得率"
          value={`${payload.stats.sampleCount}/${payload.stats.expectedCount}`}
          unit={`${coveragePct}%`}
          sub={`記録開始 ${formatGlucoseClockTokyo(payload.stats.firstRecordedAtIso)}`}
        />
      </div>

      {payload.reading?.text ? (
        <div className="rounded-lg border border-[#071426]/08 bg-[#fafaf8] px-3.5 py-3">
          <p
            className="text-[10px] font-semibold tracking-[0.14em]"
            style={{ color: GOLD }}
          >
            読み取り
          </p>
          <p className="mt-1.5 text-[13px] leading-6 text-slate-700 sm:text-[14px] sm:leading-7">
            {payload.reading.text}
          </p>
        </div>
      ) : null}

      {payload.showAttentionNote ? (
        <p className="text-[12px] leading-5 text-slate-600 sm:text-[13px]">
          {NIGHT_GLUCOSE_ATTENTION_NOTE}
        </p>
      ) : null}

      <p className="text-[11px] leading-5 text-slate-500 sm:text-[12px]">
        {NIGHT_GLUCOSE_DISCLAIMER}
      </p>
    </div>
  );
}

type Props = {
  clientId: string;
  analysisDate: string;
  sleepOnsetTime?: string | null;
  wakeTime?: string | null;
  /**
   * 睡眠ステージの覚醒時間（分）。
   * metrics.awakenings 由来。体内時計（circadianRhythm）は渡さない。
   */
  awakeMinutes?: number | null;
  /** 睡眠ステージの覚醒率（%） */
  awakeRatePercent?: number | null;
  /** 表示用（例: "1:26"） */
  awakeDisplay?: string | null;
  /** データが無いときは false。読み込み中は null */
  onAvailabilityChange?: (hasData: boolean | null) => void;
  /** ⑤添文の要否 */
  onPriorityNoteChange?: (show: boolean) => void;
  /** ペイロード全体（PDF・⑦宿題用） */
  onPayloadChange?: (payload: NightGlucoseReportPayload | null) => void;
  awakeSegments?: Array<{ startTime?: string; endTime?: string }>;
};

/**
 * 結果レポート用：夜間帯グルコース。
 * データが無い場合は何も描画しない（空枠・「データなし」も出さない）。
 */
export default function NightGlucoseReportSection({
  clientId,
  analysisDate,
  sleepOnsetTime,
  wakeTime,
  awakeMinutes = null,
  awakeRatePercent = null,
  awakeDisplay = null,
  onAvailabilityChange,
  onPriorityNoteChange,
  onPayloadChange,
  awakeSegments = [],
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
    onAvailabilityChange?.(null);
    onPriorityNoteChange?.(false);
    onPayloadChange?.(null);

    const params = new URLSearchParams({ analysisDate });
    if (sleepOnsetTime?.trim()) params.set("sleepOnset", sleepOnsetTime.trim());
    if (wakeTime?.trim()) params.set("wake", wakeTime.trim());
    if (
      awakeMinutes != null &&
      Number.isFinite(awakeMinutes) &&
      awakeMinutes >= 0
    ) {
      params.set("awakeMinutes", String(Math.round(awakeMinutes)));
    }
    if (
      awakeRatePercent != null &&
      Number.isFinite(awakeRatePercent) &&
      awakeRatePercent >= 0
    ) {
      params.set("awakeRate", String(awakeRatePercent));
    }
    if (awakeDisplay?.trim()) {
      params.set("awakeDisplay", awakeDisplay.trim());
    }

    void fetch(
      `/api/clients/${encodeURIComponent(clientId)}/glucose/night?${params}`,
    )
      .then(async (res) => {
        const json = (await res.json()) as NightGlucoseReportPayload & {
          ok?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "取得に失敗しました");
        if (cancelled) return;

        const suggestPriorityNote =
          json.stats != null &&
          hasGlucoseChangeDuringAwake({
            coverageRatio: json.stats.coverageRatio,
            glucosePoints: (json.points ?? [])
              .filter((p) => p.recordType === 0)
              .map((p) => ({
                recordedAtIso: p.recordedAtIso,
                glucoseMgDl: p.glucoseMgDl,
              })),
            awakeSegments,
            analysisDate,
          });

        const next: NightGlucoseReportPayload = {
          ...json,
          suggestPriorityNote,
        };
        setPayload(next);
        onAvailabilityChange?.(Boolean(next.hasData && next.stats));
        onPriorityNoteChange?.(suggestPriorityNote);
        onPayloadChange?.(next.hasData && next.stats ? next : null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "取得に失敗しました");
          onAvailabilityChange?.(false);
          onPriorityNoteChange?.(false);
          onPayloadChange?.(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // awakeSegments は参照比較のため JSON 化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clientId,
    analysisDate,
    sleepOnsetTime,
    wakeTime,
    awakeMinutes,
    awakeRatePercent,
    awakeDisplay,
    JSON.stringify(awakeSegments),
  ]);

  if (loading) return null;
  if (error) return null;
  if (!payload?.hasData || !payload.stats) return null;

  return (
    <section
      id="result-section-glucose"
      className="report-panel report-glucose no-print mt-5 scroll-mt-24 rounded-xl border border-[#071426]/10 bg-white px-4 py-4 sm:mt-6 sm:px-5"
    >
      <div className="report-section-label mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="report-section-mark hidden h-4 w-[3px] shrink-0 rounded-full sm:block"
            style={{ backgroundColor: GOLD }}
            aria-hidden
          />
          <h2
            className="min-w-0 break-words text-[15px] font-semibold tracking-[-0.02em] sm:text-[1.05rem]"
            style={{
              color: NAVY,
              fontFamily:
                '"Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
            }}
          >
            ③-2 夜間のグルコース
          </h2>
        </div>
        <p
          className="shrink-0 text-[10px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          GLUCOSE
        </p>
      </div>
      <p className="report-lead mb-3 text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
        入眠から起床までの間質液グルコース（参考値）です。
      </p>
      <NightGlucoseReportView payload={payload} />
    </section>
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
      <p
        className="text-[10px] font-semibold tracking-[0.12em]"
        style={{ color: MUTED }}
      >
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
