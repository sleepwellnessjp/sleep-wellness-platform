"use client";

import { useEffect, useState, type ReactNode } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";
import { localDateKey } from "@/lib/client-daily-content";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  formatSleepCoachDateLabel,
  generateSleepCoach,
  type SleepCoachSuggestion,
} from "@/lib/sleep-coach";

function AiCoachIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M20 10.5c.4 3.2 2.8 5.6 6 6-3.2.4-5.6 2.8-6 6-.4-3.2-2.8-5.6-6-6 3.2-.4 5.6-2.8 6-6Z"
        fill="currentColor"
      />
      <path
        d="M28.5 24.5c.2 1.5 1.3 2.6 2.8 2.8-1.5.2-2.6 1.3-2.8 2.8-.2-1.5-1.3-2.6-2.8-2.8 1.5-.2 2.6-1.3 2.8-2.8Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M11 15c.15 1.1.95 1.9 2.05 2.05-1.1.15-1.9.95-2.05 2.05-.15-1.1-.95-1.9-2.05-2.05 1.1-.15 1.9-.95 2.05-2.05Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}

function CoachBlock({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-[#071426]/06 bg-white/80 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums text-white"
          style={{
            background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
          }}
        >
          {step}
        </span>
        <p
          className="text-[11px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          {title}
        </p>
      </div>
      <div className="mt-3 text-[14px] leading-7 text-slate-700 sm:text-[15px] sm:leading-8">
        {children}
      </div>
    </div>
  );
}

export type SleepCoachCardProps = {
  analyses: StoredAnalysis[];
  latest: StoredAnalysis | null;
  previous: StoredAnalysis | null;
  streakDays: number;
  homeworkRate: number | null;
};

/**
 * 今日の Sleep Coach — Apple Health 風の日次カード。
 * 生成ロジックは lib/sleep-coach（ルールベース / 将来 GPT 差し替え可）。
 */
export default function SleepCoachCard({
  analyses,
  latest,
  previous,
  streakDays,
  homeworkRate,
}: SleepCoachCardProps) {
  const [suggestion, setSuggestion] = useState<SleepCoachSuggestion | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const dateKey = localDateKey();
    setSuggestion(null);
    setError(null);

    void generateSleepCoach({
      dateKey,
      analyses,
      latest,
      previous,
      streakDays,
      homeworkRate,
    })
      .then((next) => {
        if (!cancelled) setSuggestion(next);
      })
      .catch((err: unknown) => {
        console.error("[SleepCoachCard] generate failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Sleep Coach の生成に失敗しました。",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [analyses, latest, previous, streakDays, homeworkRate, reloadKey]);

  if (error) {
    return (
      <ErrorState
        kind="ai"
        message={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  if (!suggestion) {
    return <SoftSkeleton variant="coach" />;
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#8a6a2d]/30 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-6 shadow-[0_24px_70px_-48px_rgba(138,106,45,0.45)] sm:px-7 sm:py-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(216,179,106,0.85), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-35"
        style={{
          background:
            "radial-gradient(circle, rgba(216,179,106,0.35), transparent 70%)",
        }}
      />

      <div className="relative flex items-start gap-3 sm:gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_12px_28px_-16px_rgba(138,106,45,0.75)] sm:h-14 sm:w-14"
          style={{
            background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
          }}
          aria-hidden
        >
          <AiCoachIcon className="h-7 w-7 text-white sm:h-8 sm:w-8" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            SLEEP COACH AI
          </p>
          <h2
            className="mt-1.5 text-[1.2rem] font-semibold tracking-[-0.03em] sm:text-xl"
            style={{ color: NAVY }}
          >
            今日のSleep Coach
          </h2>
          <p className="mt-1 text-[13px] tabular-nums text-slate-500">
            {formatSleepCoachDateLabel(suggestion.dateKey)}
          </p>
        </div>
      </div>

      <div className="relative mt-5 space-y-3 sm:mt-6 sm:space-y-3.5">
        <CoachBlock step="1" title="今日意識すること">
          <p className="whitespace-pre-wrap font-medium" style={{ color: NAVY }}>
            {suggestion.focus}
          </p>
        </CoachBlock>

        <CoachBlock step="2" title="今日おすすめの行動">
          <ul className="space-y-2">
            {suggestion.actions.map((action) => (
              <li key={action} className="flex items-start gap-2.5">
                <span
                  className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: GOLD }}
                  aria-hidden
                />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CoachBlock>

        <CoachBlock step="3" title="今日の応援メッセージ">
          <p className="whitespace-pre-wrap">{suggestion.encouragement}</p>
        </CoachBlock>
      </div>
    </div>
  );
}
