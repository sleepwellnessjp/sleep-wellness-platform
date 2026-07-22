import { GOLD, NAVY, TEAL } from "./tokens";

type Props = {
  score: number | null;
  max?: number;
  label?: string;
  size?: number;
  className?: string;
};

function toneFor(score: number): string {
  if (score >= 80) return TEAL;
  if (score >= 60) return GOLD;
  return NAVY;
}

/**
 * ScoreGauge — circular sleep / wellness score.
 */
export default function ScoreGauge({
  score,
  max = 100,
  label = "SCORE",
  size = 120,
  className = "",
}: Props) {
  const value = score == null ? 0 : Math.max(0, Math.min(max, score));
  const pct = value / max;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const color = score == null ? "#cbd5e1" : toneFor(value);

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      style={{ width: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-current text-2xl font-semibold"
          style={{ fill: NAVY }}
        >
          {score == null ? "—" : Math.round(value)}
        </text>
      </svg>
      <p
        className="mt-2 text-[10px] font-semibold tracking-[0.2em]"
        style={{ color: GOLD }}
      >
        {label}
      </p>
    </div>
  );
}
