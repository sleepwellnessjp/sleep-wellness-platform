"use client";

type ScorePoint = {
  date: string;
  score: number;
};

type HighlightDates = {
  before?: string;
  after?: string;
};

export default function SleepScoreChart({
  points,
  highlight,
}: {
  points: ScorePoint[];
  highlight?: HighlightDates;
}) {
  const width = 640;
  const height = 240;
  const padding = { top: 24, right: 24, bottom: 36, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#fafaf8] text-sm text-slate-400">
        スコア推移データがありません
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

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-2 py-3 sm:px-4 sm:py-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="睡眠スコア推移"
      >
        <defs>
          <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#315f68" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#315f68" stopOpacity="0.02" />
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
          stroke="#071426"
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
          const fill = isBefore ? "#94a3b8" : isAfter ? "#d8b36a" : "#d8b36a";
          const stroke = isHighlighted ? "#071426" : "#071426";
          const strokeWidth = isHighlighted ? 2.25 : 1.5;

          return (
            <g key={`${point.date}-${index}`}>
              {isHighlighted && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 5}
                  fill="none"
                  stroke={isAfter ? "#d8b36a" : "#cbd5e1"}
                  strokeWidth="1.5"
                  opacity="0.55"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
              <text
                x={x}
                y={height - 12}
                textAnchor="middle"
                fontSize="10"
                fill={isHighlighted ? "#071426" : "#94a3b8"}
                fontWeight={isHighlighted ? "600" : "400"}
              >
                {point.date.slice(5).replace("-", "/")}
              </text>
              {isHighlighted && (
                <text
                  x={x}
                  y={height - 24}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={isAfter ? "#8a6a2d" : "#64748b"}
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
                fill="#071426"
              >
                {point.score}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
