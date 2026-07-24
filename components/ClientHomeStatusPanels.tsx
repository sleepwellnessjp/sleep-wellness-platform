"use client";

import type { AnalysisResult } from "@/lib/analysis-session";
import {
  formatImprovementStars,
  improvementPriorityLabel,
  normalizeImprovements,
  type ImprovementItem,
} from "@/lib/improvement-priority";
import RecommendationsUntilNextCard from "@/components/RecommendationsUntilNextCard";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GREEN = "#0f6b5c";

function EmptyLine({ label }: { label: string }) {
  return <p className="text-[14px] leading-7 text-slate-400">{label}</p>;
}

export function extractHomeGoodPoints(
  result: AnalysisResult | null | undefined,
): string[] {
  if (!result) return [];
  return (result.goodPoints ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function extractHomeImprovements(
  result: AnalysisResult | null | undefined,
): ImprovementItem[] {
  if (!result) return [];
  return normalizeImprovements(result.improvements, 5);
}

export function homeAiCommentOf(
  result: AnalysisResult | null | undefined,
): string {
  if (!result) return "";
  const karte = result.karteSummary?.trim() ?? "";
  if (karte) return karte;
  return result.summary?.trim() ?? "";
}

export function ClientHomeAiComment({
  result,
}: {
  result?: AnalysisResult | null;
}) {
  const comment = homeAiCommentOf(result);
  return (
    <div className="rounded-[22px] border border-[#8a6a2d]/25 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-6 sm:px-7 sm:py-7">
      {comment ? (
        <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700 sm:text-[16px] sm:leading-[1.85]">
          {comment}
        </p>
      ) : (
        <EmptyLine label="AIコメントはまだありません" />
      )}
    </div>
  );
}

export function ClientHomeImprovedPoints({
  result,
}: {
  result?: AnalysisResult | null;
}) {
  const goodPoints = extractHomeGoodPoints(result);
  if (goodPoints.length === 0) {
    return <EmptyLine label="この分析では改善点の記載がありません" />;
  }

  return (
    <ul className="space-y-3">
      {goodPoints.map((item) => (
        <li
          key={item}
          className="flex gap-3 rounded-2xl border border-[#0f6b5c]/15 bg-gradient-to-br from-[rgba(15,107,92,0.06)] to-white px-4 py-3.5 text-[14px] leading-7 text-slate-700 sm:px-5 sm:text-[15px]"
        >
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: "rgba(15, 107, 92, 0.12)",
              color: GREEN,
            }}
            aria-hidden
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
              <path
                d="M3.5 8.2 6.4 11l6.1-6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ClientHomePriorityPoints({
  result,
}: {
  result?: AnalysisResult | null;
}) {
  const improvements = extractHomeImprovements(result);
  if (improvements.length === 0) {
    return (
      <EmptyLine label="この分析では優先改善ポイントの記載がありません" />
    );
  }

  return (
    <ul className="space-y-3">
      {improvements.map((item, index) => (
        <li
          key={`${index}-${item.stars}-${item.text.slice(0, 24)}`}
          className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-4 sm:px-5"
        >
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className="text-[13px] font-semibold tracking-[0.04em] tabular-nums"
              style={{ color: GOLD }}
              aria-hidden
            >
              {formatImprovementStars(item.stars)}
            </span>
            <span
              className="text-[12px] font-semibold sm:text-[13px]"
              style={{ color: NAVY }}
            >
              {improvementPriorityLabel(item.stars)}
            </span>
          </div>
          <p className="mt-1.5 text-[14px] leading-7 text-slate-700 sm:text-[15px]">
            {item.text}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ClientHomeGoals({
  result,
  onUpdated,
  allowEdit = true,
  title = "AI宿題",
  description = "今回の分析から自動生成した宿題です（今日／今週／継続）。達成したらチェックを入れてください。達成率はカルテに保存されます。",
}: {
  result: AnalysisResult;
  onUpdated?: (
    goals: AnalysisResult["recommendationsUntilNext"],
    achievement: NonNullable<AnalysisResult["homeworkAchievement"]>,
  ) => void;
  allowEdit?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <RecommendationsUntilNextCard
      result={result}
      embedded
      title={title}
      eyebrow="HOMEWORK"
      description={description}
      onUpdated={onUpdated}
      allowEdit={allowEdit}
    />
  );
}
