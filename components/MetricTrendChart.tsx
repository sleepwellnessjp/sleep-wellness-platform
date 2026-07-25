"use client";

const NAVY = "#071426";
const TEAL = "#315f68";
const GOLD = "#8a6a2d";
const GOLD_LIGHT = "#d8b36a";
const BLUE = "#2563eb";

export type MetricTrendPoint = {
  date: string;
  value: number;
};

type HighlightDates = {
  before?: string;
  after?: string;
};

function formatAxisDate(date: string): string {
  const dayMatch = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dayMatch) {
    return `${dayMatch[2]}/${dayMatch[3]}`;
  }
  return date.slice(5).replace("-", "/");
}

function formatValueLabel(value: number, unitHint?: string): string {
  const rounded =
    Math.abs(value) >= 50 ? Math.round(value) : Math.round(value * 10) / 10;
  if (!unitHint) return String(rounded);
  if (unitHint === "分" && Math.abs(rounded) >= 60) {
    const hours = Math.floor(Math.abs(rounded) / 60);
    const minutes = Math.abs(rounded) % 60;
    const sign = rounded < 0 ? "-" : "";
    if (minutes === 0) return `${sign}${hours}h`;
    return `${sign}${hours}h${minutes}m`;
  }
  return `${rounded}${unitHint === "pt" ? "" : unitHint === "%" ? "%" : ""}`;
}

/**
 * 比較分析用の汎用折れ線チャート（既存 SleepScoreChart と同系統の見た目）
 */
export default function MetricTrendChart({
  points,
  highlight,
  title,
  unitHint,
  emptyMessage = "推移データがありません",
  invertY = false,
}: {
  points: MetricTrendPoint[];
  highlight?: HighlightDates;
  title?: string;
  unitHint?: string;
  emptyMessage?: string;
  /** ストレスなど「低いほど良い」指標で視覚的に上=改善にしたい場合は true */
  invertY?: boolean;
}) {
  const width = 640;
  const height = 220;
  const padding = { top: 28, right: 24, bottom: 36, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#8a6a2d]/25 bg-[#faf7f1]/50 px-6 py-8 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          TREND
        </p>
        <p className="mt-3 text-sm font-semibold" style={{ color: NAVY }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad =
    rawMax === rawMin
      ? Math.max(1, Math.abs(rawMax) * 0.1 || 1)
      : (rawMax - rawMin) * 0.12;
  const minValue = rawMin - pad;
  const maxValue = rawMax + pad;
  const range = Math.max(0.001, maxValue - minValue);

  const xAt = (index: number) => {
    if (points.length === 1) return padding.left + innerW / 2;
    return padding.left + (index / (points.length - 1)) * innerW;
  };

  const yAt = (value: number) => {
    const ratio = (value - minValue) / range;
    const normalized = invertY ? ratio : 1 - ratio;
    return padding.top + normalized * innerH;
  };

  const linePath = points
    .map((point, index) => {
      const x = xAt(index);
      const y = yAt(point.value);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `${linePath} L ${xAt(points.length - 1).toFixed(1)} ${(
    padding.top + innerH
  ).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padding.top + innerH).toFixed(
    1,
  )} Z`;

  const gridValues = [minValue, minValue + range / 2, maxValue].map((n) =>
    Math.abs(n) >= 50 ? Math.round(n) : Math.round(n * 10) / 10,
  );

  const labelStep = points.length > 8 ? 2 : 1;
  const gradientId = `metricArea-${(title ?? "chart").replace(/\s+/g, "-")}`;

  return (
    <div className="w-full">
      {title ? (
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <p
            className="text-[13px] font-semibold tracking-[-0.01em]"
            style={{ color: NAVY }}
          >
            {title}
          </p>
          {unitHint ? (
            <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
              {unitHint}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#8a6a2d]/20 bg-gradient-to-b from-white to-[#faf7f1]/40 px-2 py-3 sm:px-4 sm:py-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={title ? `${title}の推移` : "指標推移"}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity="0.22" />
              <stop offset="100%" stopColor={GOLD_LIGHT} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {gridValues.map((value) => {
            const y = yAt(value);
            return (
              <g key={`grid-${value}`}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(7,20,38,0.08)"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {value}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={NAVY}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => {
            const x = xAt(index);
            const y = yAt(point.value);
            const isBefore = highlight?.before === point.date;
            const isAfter = highlight?.after === point.date;
            const isHighlighted = isBefore || isAfter;
            const radius = isHighlighted ? 7 : 4.5;
            const fill = isAfter ? BLUE : isBefore ? "#94a3b8" : GOLD_LIGHT;
            const showDateLabel =
              index === 0 ||
              index === points.length - 1 ||
              index % labelStep === 0;

            return (
              <g key={`${point.date}-${index}`}>
                {isHighlighted && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 4}
                    fill="none"
                    stroke={isAfter ? BLUE : "#cbd5e1"}
                    strokeWidth="1.5"
                    opacity="0.55"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={fill}
                  stroke={NAVY}
                  strokeWidth={isHighlighted ? 2 : 1.5}
                />
                {showDateLabel && (
                  <text
                    x={x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isHighlighted ? NAVY : "#94a3b8"}
                    fontWeight={isHighlighted ? "600" : "400"}
                  >
                    {formatAxisDate(point.date)}
                  </text>
                )}
                {isHighlighted && (
                  <text
                    x={x}
                    y={height - 24}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill={isAfter ? BLUE : "#64748b"}
                  >
                    {isBefore ? "Before" : "After"}
                  </text>
                )}
                <text
                  x={x}
                  y={y - (isHighlighted ? 14 : 10)}
                  textAnchor="middle"
                  fontSize={isHighlighted ? "11" : "10"}
                  fontWeight="600"
                  fill={NAVY}
                >
                  {formatValueLabel(point.value, unitHint)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
