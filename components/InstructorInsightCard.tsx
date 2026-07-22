"use client";

import { useEffect, useState, type ReactNode } from "react";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, GOLD_LIGHT, NAVY, TEAL } from "@/components/ui/tokens";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import {
  generateInstructorInsight,
  type InstructorInsight,
} from "@/lib/instructor-insight";

function InsightMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M20 11c.35 2.8 2.4 4.85 5.2 5.2-2.8.35-4.85 2.4-5.2 5.2-.35-2.8-2.4-4.85-5.2-5.2 2.8-.35 4.85-2.4 5.2-5.2Z"
        fill="currentColor"
      />
      <path
        d="M14 26.5h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

function InsightBlock({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="break-inside-avoid rounded-[20px] border border-[#071426]/06 bg-white/85 px-4 py-4 sm:px-5 sm:py-5">
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

export type InstructorInsightCardProps = {
  analyses: StoredAnalysis[];
  latest: StoredAnalysis | null;
  previous: StoredAnalysis | null;
  streakDays: number;
  homeworkRate: number | null;
};

/**
 * Instructor Insight — 認定講師向けカウンセリング準備カード。
 * 生成ロジックは lib/instructor-insight（ルールベース / 将来 GPT 差し替え可）。
 */
export default function InstructorInsightCard({
  analyses,
  latest,
  previous,
  streakDays,
  homeworkRate,
}: InstructorInsightCardProps) {
  const [insight, setInsight] = useState<InstructorInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setInsight(null);
    setError(null);

    void generateInstructorInsight({
      analyses,
      latest,
      previous,
      streakDays,
      homeworkRate,
    })
      .then((next) => {
        if (!cancelled) setInsight(next);
      })
      .catch((err: unknown) => {
        console.error("[InstructorInsightCard] generate failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Instructor Insight の生成に失敗しました。",
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

  if (!insight) {
    return <SoftSkeleton variant="coach" />;
  }

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-[#8a6a2d]/30 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-6 shadow-[0_24px_70px_-48px_rgba(138,106,45,0.45)] print:break-inside-avoid print:shadow-none sm:px-7 sm:py-8"
      aria-label="Instructor Insight"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px print:hidden"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(216,179,106,0.85), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-35 print:hidden"
        style={{
          background:
            "radial-gradient(circle, rgba(216,179,106,0.35), transparent 70%)",
        }}
      />

      <div className="relative flex items-start gap-3 sm:gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_12px_28px_-16px_rgba(138,106,45,0.75)] print:shadow-none sm:h-14 sm:w-14"
          style={{
            background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
          }}
          aria-hidden
        >
          <InsightMark className="h-7 w-7 text-white sm:h-8 sm:w-8" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            INSTRUCTOR INSIGHT
          </p>
          <h2
            className="mt-1.5 text-[1.2rem] font-semibold tracking-[-0.03em] sm:text-xl"
            style={{ color: NAVY }}
          >
            Instructor Insight
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            次回カウンセリングの注目ポイントと推奨介入
          </p>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:mt-6 sm:gap-3.5 print:gap-3">
        <InsightBlock step="1" title="今回もっとも改善した点">
          <ul className="space-y-2">
            {insight.improvedPoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <span
                  className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: TEAL }}
                  aria-hidden
                />
                <span className="font-medium" style={{ color: NAVY }}>
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </InsightBlock>

        <InsightBlock step="2" title="現在の課題">
          <ol className="space-y-2.5">
            {insight.challenges.map((challenge) => (
              <li key={challenge.signal} className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-flex h-6 min-w-[3.25rem] items-center justify-center rounded-full border border-[#8a6a2d]/25 bg-[#faf7f1] px-2 text-[11px] font-semibold tabular-nums"
                  style={{ color: GOLD }}
                >
                  優先{challenge.priority}
                </span>
                <span className="pt-0.5 font-medium" style={{ color: NAVY }}>
                  {challenge.label}
                </span>
              </li>
            ))}
          </ol>
        </InsightBlock>

        <InsightBlock step="3" title="次回カウンセリングで確認したい質問">
          <ul className="space-y-2">
            {insight.counselingQuestions.map((question) => (
              <li key={question} className="flex items-start gap-2.5">
                <span
                  className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: GOLD }}
                  aria-hidden
                />
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </InsightBlock>

        <InsightBlock step="4" title="推奨する介入">
          <ul className="space-y-2">
            {insight.interventions.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span
                  className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: GOLD }}
                  aria-hidden
                />
                <span className="font-medium" style={{ color: NAVY }}>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </InsightBlock>

        <InsightBlock step="5" title="AI総評">
          <p className="whitespace-pre-wrap leading-7">{insight.summary}</p>
        </InsightBlock>
      </div>
    </section>
  );
}
