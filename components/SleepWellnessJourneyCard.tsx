"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  generateSleepWellnessJourney,
  type JourneyBadge,
  type JourneyTimelinePoint,
  type SleepWellnessJourney,
} from "@/lib/sleep-wellness-journey";

function JourneyTimeline({ points }: { points: JourneyTimelinePoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        compact
        illustration="journey"
        title="タイムラインはまだありません"
        description="分析が蓄積されると、ここに改善の軌跡が表示されます。"
      />
    );
  }

  return (
    <ol className="relative mx-auto max-w-xs sm:max-w-sm">
      {points.map((point, index) => {
        const isLast = index === points.length - 1;
        const scoreLabel =
          point.score == null ? "—" : Math.round(point.score);
        return (
          <li key={`${point.dateLabel}-${index}`} className="relative flex gap-4 pb-1">
            <div className="flex w-14 shrink-0 flex-col items-end pt-0.5">
              <span
                className={`text-[13px] font-semibold tabular-nums tracking-[-0.02em] ${
                  point.isCurrent ? "" : "text-slate-500"
                }`}
                style={point.isCurrent ? { color: GOLD } : undefined}
              >
                {point.dateLabel}
              </span>
            </div>

            <div className="relative flex flex-col items-center">
              <span
                className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white"
                style={{
                  background: point.isCurrent
                    ? `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`
                    : NAVY,
                }}
                aria-hidden
              />
              {!isLast ? (
                <span
                  className="mt-1 w-px flex-1 bg-gradient-to-b from-[#8a6a2d]/45 to-[#8a6a2d]/15"
                  style={{ minHeight: 28 }}
                  aria-hidden
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pb-6 pt-0">
              {point.isCurrent ? (
                <p
                  className="text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  現在
                  {point.score != null ? (
                    <span className="ml-2 tabular-nums" style={{ color: GOLD }}>
                      Score {scoreLabel}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-[15px] font-semibold tracking-[-0.02em] tabular-nums text-slate-700">
                  {index === 0 ? (
                    <>
                      Score{" "}
                      <span style={{ color: NAVY }}>{scoreLabel}</span>
                    </>
                  ) : (
                    <span style={{ color: NAVY }}>{scoreLabel}</span>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function JourneyBadges({ badges }: { badges: JourneyBadge[] }) {
  if (badges.length === 0) {
    return (
      <p className="text-[13px] leading-7 text-slate-400">
        改善が進むと、ここにバッジが集まります
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2.5">
      {badges.map((badge) => (
        <li
          key={badge.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#8a6a2d]/25 bg-white/90 px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-slate-700 shadow-[0_8px_24px_-18px_rgba(138,106,45,0.55)]"
        >
          <span aria-hidden>{badge.emoji}</span>
          <span>{badge.label}</span>
        </li>
      ))}
    </ul>
  );
}

export type SleepWellnessJourneyCardProps = {
  analyses: StoredAnalysis[];
  streakDays: number;
  homeworkRate: number | null;
};

/**
 * Sleep Wellness Journey™ — 改善の物語カード。
 * 生成ロジックは lib/sleep-wellness-journey（ルールベース / 将来 GPT 差し替え可）。
 */
export default function SleepWellnessJourneyCard({
  analyses,
  streakDays,
  homeworkRate,
}: SleepWellnessJourneyCardProps) {
  const [journey, setJourney] = useState<SleepWellnessJourney | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setJourney(null);
    setError(null);

    void generateSleepWellnessJourney({
      analyses,
      streakDays,
      homeworkRate,
    })
      .then((next) => {
        if (!cancelled) setJourney(next);
      })
      .catch((err: unknown) => {
        console.error("[SleepWellnessJourneyCard] generate failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Journey の生成に失敗しました。",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [analyses, streakDays, homeworkRate, reloadKey]);

  if (error) {
    return (
      <ErrorState
        kind="ai"
        message={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  if (!journey) {
    return <SoftSkeleton variant="journey" />;
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
        className="pointer-events-none absolute -left-16 top-24 h-48 w-48 rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(216,179,106,0.35), transparent 70%)",
        }}
      />

      <div className="relative">
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          SLEEP WELLNESS JOURNEY™
        </p>
        <h2
          className="mt-2 text-[1.25rem] font-semibold tracking-[-0.03em] sm:text-[1.4rem]"
          style={{ color: NAVY }}
        >
          {journey.title}
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          分析結果ではなく、あなたの改善の物語です。
        </p>
      </div>

      <div className="relative mt-7 sm:mt-8">
        <JourneyTimeline points={journey.timeline} />
      </div>

      <div className="relative mt-2 border-t border-[#8a6a2d]/15 pt-6">
        <p
          className="text-[10px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          AI JOURNEY SUMMARY
        </p>
        <p
          className="mt-3 whitespace-pre-wrap text-[14px] leading-8 text-slate-700 sm:text-[15px] sm:leading-[1.85]"
        >
          {journey.summary}
        </p>
      </div>

      <div className="relative mt-6 border-t border-[#8a6a2d]/15 pt-6">
        <p
          className="text-[10px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          IMPROVEMENT BADGES
        </p>
        <p
          className="mt-1.5 text-[13px] font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          改善バッジ
        </p>
        <div className="mt-4">
          <JourneyBadges badges={journey.badges} />
        </div>
      </div>
    </div>
  );
}
