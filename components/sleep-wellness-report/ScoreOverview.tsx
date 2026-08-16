"use client";

import { GOLD, GOLD_MID, NAVY, SUCCESS } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";
import ConversationGuide from "@/components/sleep-wellness-report/ConversationGuide";
import { guideForSection } from "@/lib/sleep-analysis/session-guide";
import type { SleepWellnessScoreFactor } from "@/lib/sleep-analysis/sleep-wellness-score";

function ScoreRing({
  score,
  grade,
}: {
  score: number | null;
  grade: string | null;
}) {
  const value = score ?? 0;
  const pct = Math.max(0, Math.min(100, value));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative mx-auto h-[128px] w-[128px]">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="rgba(7,20,38,0.06)"
          strokeWidth="9"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={GOLD_MID}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="text-[2.25rem] font-semibold leading-none tracking-[-0.04em]"
          style={{ color: NAVY }}
        >
          {score != null ? score : "—"}
        </p>
        <p
          className="mt-1 text-[10px] font-medium tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          {grade ? `GRADE ${grade}` : "SCORE"}
        </p>
      </div>
    </div>
  );
}

function statusColor(score: number): string {
  if (score >= 75) return SUCCESS;
  if (score >= 60) return GOLD_MID;
  return "#a33a3a";
}

export type ScoreOverviewProps = {
  totalScore: number | null;
  grade: string | null;
  headline: string;
  coverageLabel: string;
  factors: SleepWellnessScoreFactor[];
};

export default function ScoreOverview({
  totalScore,
  grade,
  headline,
  factors,
}: ScoreOverviewProps) {
  const available = factors
    .filter((f) => f.available && f.score != null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 5);

  return (
    <SwrCard>
      <SwrEyebrow>Score</SwrEyebrow>
      <SwrTitle>Sleep Wellness Score</SwrTitle>
      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <ScoreRing score={totalScore} grade={grade} />
        <div>
          <p className="text-[15px] leading-7 text-slate-600">{headline}</p>
          {available.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {available.map((f) => (
                <li
                  key={f.key}
                  className="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span style={{ color: NAVY }}>{f.label}</span>
                  <span
                    className="tabular-nums font-semibold"
                    style={{ color: statusColor(f.score ?? 0) }}
                  >
                    {f.score}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <ConversationGuide guide={guideForSection("score")} />
    </SwrCard>
  );
}
