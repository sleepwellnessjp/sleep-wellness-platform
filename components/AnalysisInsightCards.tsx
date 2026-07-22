"use client";

import type { ReactNode } from "react";
import type { AnalysisResult } from "@/lib/analysis-session";
import { improvementTexts } from "@/lib/improvement-priority";

const NAVY = "#071426";
const GREEN = "#0f6b5c";
const GREEN_SOFT = "rgba(15, 107, 92, 0.12)";
const GREEN_BORDER = "rgba(15, 107, 92, 0.28)";
const GOLD = "#8a6a2d";
const GOLD_SOFT = "rgba(138, 106, 45, 0.14)";
const GOLD_BORDER = "rgba(138, 106, 45, 0.28)";

function ImprovedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 12.5 10.8 15.2 16.2 9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChallengeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 4.5 20 19.5H4L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

function InsightCard({
  title,
  eyebrow,
  accent,
  soft,
  border,
  icon,
  items,
  emptyLabel,
}: {
  title: string;
  eyebrow: string;
  accent: string;
  soft: string;
  border: string;
  icon: ReactNode;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <article
      className="flex h-full flex-col rounded-[22px] border px-5 py-5 sm:px-6 sm:py-6"
      style={{
        borderColor: border,
        background: `linear-gradient(160deg, ${soft} 0%, #ffffff 48%)`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: soft, color: accent }}
        >
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <p
            className="text-[10px] font-semibold tracking-[0.2em]"
            style={{ color: accent }}
          >
            {eyebrow}
          </p>
          <h3
            className="mt-1 text-[15px] font-semibold tracking-[-0.03em] sm:text-base"
            style={{ color: NAVY }}
          >
            {title}
          </h3>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-[13px] leading-6 text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-2.5 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7"
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function extractImprovedPoints(result: AnalysisResult | undefined): string[] {
  if (!result) return [];
  return (result.goodPoints ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function extractChallengePoints(result: AnalysisResult | undefined): string[] {
  if (!result) return [];
  return improvementTexts(result.improvements ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

type Props = {
  result?: AnalysisResult | null;
  /** 選択中の分析日など、補足表示用 */
  analysisDateLabel?: string;
};

/**
 * AI分析結果から「改善点」「課題」を抽出し、カードで表示する。
 * 分析履歴の選択に応じて result を差し替える想定。
 */
export default function AnalysisInsightCards({
  result,
  analysisDateLabel,
}: Props) {
  const improved = extractImprovedPoints(result ?? undefined);
  const challenges = extractChallengePoints(result ?? undefined);

  if (!result) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-200 bg-white/70 px-5 py-10 text-center">
        <p className="text-sm text-slate-400">表示できる分析結果がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analysisDateLabel ? (
        <p className="text-[12px] text-slate-500 sm:text-[13px]">
          表示中の分析：
          <span className="ml-1 font-semibold" style={{ color: NAVY }}>
            {analysisDateLabel}
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <InsightCard
          title="改善点"
          eyebrow="IMPROVED"
          accent={GREEN}
          soft={GREEN_SOFT}
          border={GREEN_BORDER}
          icon={<ImprovedIcon className="h-5 w-5" />}
          items={improved}
          emptyLabel="この分析では改善点の記載がありません"
        />
        <InsightCard
          title="課題"
          eyebrow="FOCUS"
          accent={GOLD}
          soft={GOLD_SOFT}
          border={GOLD_BORDER}
          icon={<ChallengeIcon className="h-5 w-5" />}
          items={challenges}
          emptyLabel="この分析では課題の記載がありません"
        />
      </div>
    </div>
  );
}
