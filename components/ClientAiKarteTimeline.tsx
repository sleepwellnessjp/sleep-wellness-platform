"use client";

import Link from "next/link";
import type { StoredAnalysis } from "@/lib/repositories/client-repository";
import { formatDisplayDate } from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

export type AiKarteEntry = {
  analysisId: string;
  analysisDate: string;
  karteSummary: string;
  wellnessScore: number | null;
};

/**
 * 分析履歴（新しい順）から AIカルテ条目を抽出し、時系列（古い順）で返す。
 */
export function buildAiKarteEntries(
  analyses: StoredAnalysis[],
): AiKarteEntry[] {
  const entries: AiKarteEntry[] = [];
  for (const analysis of analyses) {
    const text = analysis.result?.karteSummary?.trim() ?? "";
    if (!text) continue;
    entries.push({
      analysisId: analysis.id,
      analysisDate: analysis.analysisDate,
      karteSummary: text,
      wellnessScore:
        typeof analysis.wellnessScore === "number" &&
        Number.isFinite(analysis.wellnessScore)
          ? analysis.wellnessScore
          : typeof analysis.result?.score === "number"
            ? analysis.result.score
            : null,
    });
  }
  // 時系列表示: 古い → 新しい
  return entries.reverse();
}

type Props = {
  analyses: StoredAnalysis[];
};

export default function ClientAiKarteTimeline({ analyses }: Props) {
  const entries = buildAiKarteEntries(analyses);

  if (analyses.length === 0) {
    return <p className="text-sm text-slate-400">まだ分析がありません</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm leading-7 text-slate-500">
        これから分析を行うと、クライアントの変化が AIカルテとして時系列で記録されます。
      </p>
    );
  }

  return (
    <div>
      <p className="mb-5 max-w-2xl text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
        Sleep Wellness Institute Japan
        独自カルテです。分析のたびに、クライアントの変化を100〜200文字で記録します。
      </p>

      <ol className="relative space-y-0 border-l border-[#8a6a2d]/25 pl-5 sm:pl-6">
        {entries.map((entry, index) => {
          const isLatest = index === entries.length - 1;
          return (
            <li key={entry.analysisId} className="relative pb-7 last:pb-0">
              <span
                className="absolute -left-[1.4rem] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border-2 bg-white sm:-left-[1.65rem]"
                style={{
                  borderColor: isLatest ? GOLD : "rgba(138,106,45,0.45)",
                  backgroundColor: isLatest
                    ? "rgba(216,179,106,0.35)"
                    : "white",
                }}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time
                  dateTime={entry.analysisDate}
                  className="text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {formatDisplayDate(entry.analysisDate)}
                </time>
                {isLatest ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em]"
                    style={{
                      backgroundColor: "rgba(216,179,106,0.22)",
                      color: GOLD,
                    }}
                  >
                    LATEST
                  </span>
                ) : null}
                {entry.wellnessScore != null ? (
                  <span className="text-[12px] text-slate-400">
                    Score {entry.wellnessScore}
                  </span>
                ) : null}
              </div>
              <p
                className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-slate-700 sm:text-[15px]"
              >
                {entry.karteSummary}
              </p>
              <Link
                href={`/analysis/result?analysisId=${encodeURIComponent(entry.analysisId)}`}
                className="mt-2 inline-flex text-[12px] font-medium transition hover:opacity-80"
                style={{ color: GOLD }}
              >
                レポートを開く
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
