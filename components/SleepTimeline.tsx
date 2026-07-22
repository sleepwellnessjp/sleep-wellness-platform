"use client";

import Link from "next/link";
import {
  extractHomeImprovements,
  homeAiCommentOf,
} from "@/components/ClientHomeStatusPanels";
import EmptyState from "@/components/ui/EmptyState";
import {
  formatImprovementStars,
  improvementPriorityLabel,
} from "@/lib/improvement-priority";
import {
  computeHomeworkAchievement,
  normalizeRecommendationsUntilNext,
  type HomeworkAchievement,
  type NextActionGoal,
} from "@/lib/analysis-session";
import {
  formatDisplayDate,
  type StoredAnalysis,
} from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

function wellnessScoreOf(analysis: StoredAnalysis): number | null {
  if (
    typeof analysis.wellnessScore === "number" &&
    Number.isFinite(analysis.wellnessScore)
  ) {
    return analysis.wellnessScore;
  }
  if (
    typeof analysis.result?.score === "number" &&
    Number.isFinite(analysis.result.score)
  ) {
    return analysis.result.score;
  }
  return null;
}

function sleepScoreOf(analysis: StoredAnalysis): number | null {
  if (
    typeof analysis.sleepScore === "number" &&
    Number.isFinite(analysis.sleepScore)
  ) {
    return analysis.sleepScore;
  }
  const fromMetrics = analysis.result?.metrics?.sleepScore;
  if (typeof fromMetrics === "number" && Number.isFinite(fromMetrics)) {
    return fromMetrics;
  }
  return null;
}

function homeworkOf(analysis: StoredAnalysis): {
  goals: NextActionGoal[];
  achievement: HomeworkAchievement;
} {
  const goals = normalizeRecommendationsUntilNext(
    analysis.result?.recommendationsUntilNext,
  );
  const stored = analysis.result?.homeworkAchievement;
  const achievement =
    stored && stored.total === goals.length
      ? stored
      : computeHomeworkAchievement(goals);
  return { goals, achievement };
}

export type SleepTimelineEntry = {
  analysisId: string;
  analysisDate: string;
  wellnessScore: number | null;
  sleepScore: number | null;
  aiComment: string;
  improvements: ReturnType<typeof extractHomeImprovements>;
  homeworkGoals: NextActionGoal[];
  homeworkAchievement: HomeworkAchievement;
};

/**
 * 分析履歴（新しい順）から Sleep Timeline 条目を抽出し、時系列（古い → 新しい）で返す。
 */
export function buildSleepTimelineEntries(
  analyses: StoredAnalysis[],
): SleepTimelineEntry[] {
  const entries: SleepTimelineEntry[] = analyses.map((analysis) => {
    const homework = homeworkOf(analysis);
    return {
      analysisId: analysis.id,
      analysisDate: analysis.analysisDate,
      wellnessScore: wellnessScoreOf(analysis),
      sleepScore: sleepScoreOf(analysis),
      aiComment: homeAiCommentOf(analysis.result),
      improvements: extractHomeImprovements(analysis.result),
      homeworkGoals: homework.goals,
      homeworkAchievement: homework.achievement,
    };
  });
  return entries.reverse();
}

type Props = {
  analyses: StoredAnalysis[];
  selectedAnalysisId?: string | null;
  onSelect?: (analysisId: string) => void;
};

export default function SleepTimeline({
  analyses,
  selectedAnalysisId = null,
  onSelect,
}: Props) {
  const entries = buildSleepTimelineEntries(analyses);

  if (analyses.length === 0) {
    return (
      <EmptyState
        compact
        illustration="history"
        title="まだ分析がありません"
        description="分析を作成すると、ここに Sleep Timeline が積み上がります。"
      />
    );
  }

  return (
    <div>
      <p className="mb-5 max-w-2xl text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
        分析日ごとの Sleep Wellness Score・睡眠スコア・改善点・AI宿題・AIコメントを時系列で記録するカルテです。項目をクリックすると詳細が開き、上のパネルも切り替わります。
      </p>

      <ol className="relative space-y-0 border-l border-[#8a6a2d]/25 pl-5 sm:pl-6">
        {entries.map((entry, index) => {
          const isLatest = index === entries.length - 1;
          const isSelected = entry.analysisId === selectedAnalysisId;
          const improvementPreview = entry.improvements
            .slice(0, 2)
            .map((item) => item.text);
          const moreCount = Math.max(0, entry.improvements.length - 2);

          return (
            <li key={entry.analysisId} className="relative pb-6 last:pb-0">
              <span
                className="absolute -left-[1.4rem] top-4 flex h-3 w-3 items-center justify-center rounded-full border-2 bg-white sm:-left-[1.65rem]"
                style={{
                  borderColor:
                    isSelected || isLatest ? GOLD : "rgba(138,106,45,0.45)",
                  backgroundColor: isSelected
                    ? GOLD
                    : isLatest
                      ? "rgba(216,179,106,0.35)"
                      : "white",
                }}
                aria-hidden
              />

              <button
                type="button"
                onClick={() => onSelect?.(entry.analysisId)}
                className="w-full rounded-[22px] border px-4 py-4 text-left transition sm:px-5 sm:py-5"
                style={{
                  borderColor: isSelected
                    ? "rgba(138,106,45,0.45)"
                    : "rgba(148,163,184,0.35)",
                  backgroundColor: isSelected
                    ? "rgba(138,106,45,0.07)"
                    : "rgba(250,250,248,0.9)",
                  boxShadow: isSelected
                    ? "0 18px 40px -32px rgba(138,106,45,0.55)"
                    : undefined,
                }}
                aria-pressed={isSelected}
                aria-expanded={isSelected}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                  <time
                    dateTime={entry.analysisDate}
                    className="text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
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
                  {isSelected ? (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.12em]"
                      style={{
                        backgroundColor: "rgba(15, 107, 92, 0.12)",
                        color: "#0f6b5c",
                      }}
                    >
                      詳細表示中
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      クリックで詳細
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                  <div className="rounded-2xl border border-[#8a6a2d]/15 bg-white/80 px-3 py-3 sm:px-4">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400">
                      Sleep Wellness Score
                    </p>
                    <p
                      className="mt-1 text-2xl font-semibold tracking-[-0.04em] tabular-nums"
                      style={{ color: NAVY }}
                    >
                      {entry.wellnessScore ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/90 bg-white/80 px-3 py-3 sm:px-4">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400">
                      睡眠スコア
                    </p>
                    <p
                      className="mt-1 text-2xl font-semibold tracking-[-0.04em] tabular-nums"
                      style={{ color: NAVY }}
                    >
                      {entry.sleepScore ?? "—"}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-slate-200/90 bg-white/80 px-3 py-3 sm:col-span-1 sm:px-4">
                    <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400">
                      AI宿題 達成率
                    </p>
                    <p
                      className="mt-1 text-2xl font-semibold tracking-[-0.04em] tabular-nums"
                      style={{ color: NAVY }}
                    >
                      {entry.homeworkGoals.length > 0
                        ? `${entry.homeworkAchievement.rate}%`
                        : "—"}
                    </p>
                    {entry.homeworkGoals.length > 0 ? (
                      <p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                        {entry.homeworkAchievement.checked}/
                        {entry.homeworkAchievement.total}
                      </p>
                    ) : null}
                  </div>
                </div>

                {!isSelected ? (
                  <div className="mt-3 space-y-2">
                    {entry.improvements.length > 0 ? (
                      <p className="text-[13px] leading-6 text-slate-600">
                        <span
                          className="font-semibold"
                          style={{ color: GOLD }}
                        >
                          改善点
                        </span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        {improvementPreview.join(" / ")}
                        {moreCount > 0 ? ` ほか${moreCount}件` : ""}
                      </p>
                    ) : (
                      <p className="text-[13px] text-slate-400">
                        改善点の記録なし
                      </p>
                    )}
                    <p className="line-clamp-2 text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
                      {entry.aiComment || "AIコメントはまだありません"}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4 border-t border-[#8a6a2d]/15 pt-4">
                    <div>
                      <p
                        className="text-[10px] font-semibold tracking-[0.16em]"
                        style={{ color: GOLD }}
                      >
                        改善点
                      </p>
                      {entry.improvements.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {entry.improvements.map((item, itemIndex) => (
                            <li
                              key={`${entry.analysisId}-${itemIndex}-${item.text.slice(0, 20)}`}
                              className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-3"
                            >
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span
                                  className="text-[12px] font-semibold tabular-nums"
                                  style={{ color: GOLD }}
                                >
                                  {formatImprovementStars(item.stars)}
                                </span>
                                <span
                                  className="text-[11px] font-semibold"
                                  style={{ color: NAVY }}
                                >
                                  {improvementPriorityLabel(item.stars)}
                                </span>
                              </div>
                              <p className="mt-1 text-[13px] leading-6 text-slate-700 sm:text-[14px] sm:leading-7">
                                {item.text}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[13px] text-slate-400">
                          この分析では改善点の記載がありません
                        </p>
                      )}
                    </div>

                    <div>
                      <p
                        className="text-[10px] font-semibold tracking-[0.16em]"
                        style={{ color: GOLD }}
                      >
                        AI宿題
                      </p>
                      {entry.homeworkGoals.length > 0 ? (
                        <>
                          <p className="mt-2 text-[13px] font-semibold tabular-nums text-slate-600">
                            達成率 {entry.homeworkAchievement.rate}%（
                            {entry.homeworkAchievement.checked}/
                            {entry.homeworkAchievement.total}）
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {entry.homeworkGoals.map((goal) => (
                              <li
                                key={goal.id}
                                className="flex items-start gap-2 text-[13px] leading-6 text-slate-700 sm:text-[14px] sm:leading-7"
                              >
                                <span
                                  className="mt-0.5 shrink-0 text-[12px] font-semibold"
                                  style={{
                                    color: goal.checked ? "#0f6b5c" : "#94a3b8",
                                  }}
                                >
                                  {goal.checked ? "✓" : "○"}
                                </span>
                                <span
                                  className={
                                    goal.checked
                                      ? "text-slate-500 line-through"
                                      : undefined
                                  }
                                >
                                  {goal.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="mt-2 text-[13px] text-slate-400">
                          この分析ではAI宿題の記録がありません
                        </p>
                      )}
                    </div>

                    <div>
                      <p
                        className="text-[10px] font-semibold tracking-[0.16em]"
                        style={{ color: GOLD }}
                      >
                        AIコメント
                      </p>
                      {entry.aiComment ? (
                        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-slate-700 sm:text-[15px] sm:leading-8">
                          {entry.aiComment}
                        </p>
                      ) : (
                        <p className="mt-2 text-[13px] text-slate-400">
                          AIコメントはまだありません
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </button>

              {isSelected ? (
                <div className="mt-2.5 flex justify-end pl-1">
                  <Link
                    href={`/analysis/result?analysisId=${encodeURIComponent(entry.analysisId)}`}
                    className="inline-flex text-[12px] font-medium transition hover:opacity-80"
                    style={{ color: GOLD }}
                  >
                    レポートを開く →
                  </Link>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
