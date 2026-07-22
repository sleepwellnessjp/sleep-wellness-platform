"use client";

const NAVY = "#071426";
const TEAL = "#315f68";
const GOLD = "#8a6a2d";
const GOLD_LIGHT = "#d8b36a";

type ScorePoint = {
  date: string;
  score: number;
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

export default function SleepScoreChart({
  points,
  highlight,
  xAxisLabel,
  yAxisLabel,
  emptyMessage = "分析データがありません",
}: {
  points: ScorePoint[];
  highlight?: HighlightDates;
  xAxisLabel?: string;
  yAxisLabel?: string;
  emptyMessage?: string;
}) {
  const width = 640;
  const height = 240;
  const padding = { top: 28, right: 24, bottom: 36, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#8a6a2d]/25 bg-[#faf7f1]/50 px-6 py-10 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          SCORE TREND
        </p>
        <p className="mt-3 text-sm font-semibold" style={{ color: NAVY }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  const scores = points.map((p) => p.score);
  const minScore = Math.max(0, Math.floor(Math.min(...scores) / 10) * 10 - 10);
  const maxScore = Math.min(100, Math.ceil(Math.max(...scores) / 10) * 10 + 10);
  const range = Math.max(1, maxScore - minScore);

  const xAt = (index: number) => {
    if (points.length === 1) return padding.left + innerW / 2;
    return padding.left + (index / (points.length - 1)) * innerW;
  };

  const yAt = (score: number) =>
    padding.top + ((maxScore - score) / range) * innerH;

  const linePath = points
    .map((point, index) => {
      const x = xAt(index);
      const y = yAt(point.score);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `${linePath} L ${xAt(points.length - 1).toFixed(1)} ${(
    padding.top + innerH
  ).toFixed(1)} L ${xAt(0).toFixed(1)} ${(padding.top + innerH).toFixed(
    1,
  )} Z`;

  const gridScores = [minScore, minScore + range / 2, maxScore].map((n) =>
    Math.round(n),
  );

  const labelStep = points.length > 8 ? 2 : 1;

  return (
    <div className="w-full">
      <div className="flex items-stretch gap-2 sm:gap-3">
        {yAxisLabel && (
          <div className="flex w-5 shrink-0 items-center justify-center sm:w-6">
            <p
              className="origin-center -rotate-90 whitespace-nowrap text-[10px] font-semibold tracking-[0.12em]"
              style={{ color: GOLD }}
            >
              {yAxisLabel}
            </p>
          </div>
        )}

        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#8a6a2d]/20 bg-gradient-to-b from-white to-[#faf7f1]/40 px-2 py-3 sm:px-4 sm:py-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto w-full"
            role="img"
            aria-label="Sleep Wellness Score推移"
          >
            <defs>
              <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAL} stopOpacity="0.24" />
                <stop offset="100%" stopColor={GOLD_LIGHT} stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {gridScores.map((score) => {
              const y = yAt(score);
              return (
                <g key={score}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="rgba(7,20,38,0.08)"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#94a3b8"
                  >
                    {score}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill="url(#scoreArea)" />
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
              const y = yAt(point.score);
              const isBefore = highlight?.before === point.date;
              const isAfter = highlight?.after === point.date;
              const isHighlighted = isBefore || isAfter;
              const radius = isHighlighted ? 7.5 : 5;
              const fill = isBefore ? "#94a3b8" : GOLD_LIGHT;
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
                      r={radius + 5}
                      fill="none"
                      stroke={isAfter ? GOLD_LIGHT : "#cbd5e1"}
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
                    strokeWidth={isHighlighted ? 2.25 : 1.5}
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
                      fill={isAfter ? GOLD : "#64748b"}
                    >
                      {isBefore ? "Before" : "After"}
                    </text>
                  )}
                  <text
                    x={x}
                    y={y - (isHighlighted ? 16 : 12)}
                    textAnchor="middle"
                    fontSize={isHighlighted ? "12" : "11"}
                    fontWeight="600"
                    fill={NAVY}
                  >
                    {point.score}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {xAxisLabel && (
        <p
          className="mt-2 text-center text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          {xAxisLabel}
        </p>
      )}
    </div>
  );
}
