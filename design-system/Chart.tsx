import { GOLD, NAVY, TEAL } from "./tokens";

type Point = { label: string; value: number };

type Props = {
  points: Point[];
  height?: number;
  className?: string;
  accent?: "navy" | "gold" | "teal";
};

const ACCENT = { navy: NAVY, gold: GOLD, teal: TEAL } as const;

/**
 * Chart — minimal SVG line chart for module dashboards.
 * Prefer domain charts (SleepScoreChart etc.) for analysis-grade visuals.
 */
export default function Chart({
  points,
  height = 160,
  className = "",
  accent = "navy",
}: Props) {
  if (points.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500 ${className}`}
        style={{ height }}
      >
        チャートデータなし
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padX = 12;
  const padY = 16;
  const w = 320;
  const innerW = w - padX * 2;
  const innerH = height - padY * 2;

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? w / 2
        : padX + (i / (points.length - 1)) * innerW;
    const y = padY + innerH - ((p.value - min) / span) * innerH;
    return { x, y, ...p };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const color = ACCENT[accent];

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className={`w-full ${className}`}
      role="img"
      aria-label="line chart"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((c) => (
        <circle key={c.label} cx={c.x} cy={c.y} r="3.5" fill={color} />
      ))}
    </svg>
  );
}
