"use client";

import {
  WELLNESS_CATEGORY_LABELS,
  type WellnessCategoryKey,
  type WellnessCategoryScores,
} from "@/lib/analysis-session";

const NAVY = "#071426";
const TEAL = "#315f68";
const GOLD = "#8a6a2d";

const CATEGORY_ORDER: WellnessCategoryKey[] = [
  "body",
  "mind",
  "lifestyle",
  "environment",
];

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number,
) {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function polygonPoints(
  cx: number,
  cy: number,
  radius: number,
  values: number[],
  maxValue: number,
): string {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / values.length;
      const r = (Math.max(0, Math.min(maxValue, value)) / maxValue) * radius;
      const { x, y } = polarToCartesian(cx, cy, r, angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function WellnessRadarChart({
  scores,
  size = 320,
}: {
  scores: WellnessCategoryScores;
  size?: number;
}) {
  const values = CATEGORY_ORDER.map((key) => scores[key]);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const labelRadius = size * 0.44;
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full min-w-0 shrink">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto h-auto w-full max-w-[280px] sm:max-w-[340px]"
        role="img"
        aria-label="睡眠ウェルネススコア カテゴリーレーダー"
      >
        <defs>
          <linearGradient id="wellnessRadarFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={TEAL} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.18" />
          </linearGradient>
        </defs>

        {rings.map((ratio) => (
          <polygon
            key={ratio}
            points={polygonPoints(
              cx,
              cy,
              radius * ratio,
              [100, 100, 100, 100],
              100,
            )}
            fill="none"
            stroke="rgba(7,20,38,0.1)"
            strokeWidth={1}
          />
        ))}

        {CATEGORY_ORDER.map((_, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 4;
          const end = polarToCartesian(cx, cy, radius, angle);
          return (
            <line
              key={index}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="rgba(7,20,38,0.12)"
              strokeWidth={1}
            />
          );
        })}

        <polygon
          points={polygonPoints(cx, cy, radius, values, 100)}
          fill="url(#wellnessRadarFill)"
          stroke={TEAL}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {values.map((value, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 4;
          const point = polarToCartesian(
            cx,
            cy,
            (value / 100) * radius,
            angle,
          );
          return (
            <circle
              key={`dot-${index}`}
              cx={point.x}
              cy={point.y}
              r={3.5}
              fill={NAVY}
              stroke="#fff"
              strokeWidth={1.5}
            />
          );
        })}

        {CATEGORY_ORDER.map((key, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 4;
          const labelPos = polarToCartesian(cx, cy, labelRadius, angle);
          const score = scores[key];
          return (
            <g key={key}>
              <text
                x={labelPos.x}
                y={labelPos.y - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={NAVY}
                fontSize={13}
                fontWeight={600}
              >
                {WELLNESS_CATEGORY_LABELS[key]}
              </text>
              <text
                x={labelPos.x}
                y={labelPos.y + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={TEAL}
                fontSize={11}
                fontWeight={600}
              >
                {score}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
