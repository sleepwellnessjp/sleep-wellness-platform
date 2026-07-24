"use client";

import SleepWellnessJourneyCard from "@/components/SleepWellnessJourneyCard";
import JourneyAchievements from "@/components/journey/JourneyAchievements";
import JourneyAiCoachCard from "@/components/journey/JourneyAiCoachCard";
import JourneyProgressPanel from "@/components/journey/JourneyProgressPanel";
import JourneyStageMap from "@/components/journey/JourneyStageMap";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD } from "@/components/ui/tokens";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import { buildClientJourneyBundleFromData } from "@/lib/journey";
import {
  clientWellnessScoreOf,
  formatScoreDelta,
} from "@/lib/client-portal/helpers";
import {
  buildClientMypageComparison,
  findPreviousAnalysis,
  previousComparisonToneColor,
} from "@/lib/previous-comparison";
import {
  computeAssignedHomeworkAchievement,
  computeHomeworkStreakDays,
} from "@/lib/repositories/client-homeworks-repository";
import { formatDisplayDate } from "@/lib/repositories/client-repository";

export default function ClientJourneyPage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  const analyses = bundle.data.client.analyses;
  const latest = analyses[0] ?? null;
  const previous = findPreviousAnalysis(analyses, latest?.id);
  const latestScore = clientWellnessScoreOf(latest);
  const previousScore = clientWellnessScoreOf(previous);
  const scoreDelta =
    latestScore != null && previousScore != null
      ? latestScore - previousScore
      : null;
  const deltaDisplay = formatScoreDelta(scoreDelta);
  const comparison =
    latest && previous ? buildClientMypageComparison(previous, latest) : null;
  const homeworkAchievement = computeAssignedHomeworkAchievement(
    bundle.homeworks,
  );
  const streakDays = computeHomeworkStreakDays(bundle.homeworks);
  const instructorComment =
    bundle.data.instructor?.message?.trim() ||
    latest?.result?.karteSummary?.trim() ||
    "";

  const journey = buildClientJourneyBundleFromData({
    clientId: bundle.data.client.id,
    clientName: bundle.data.client.name,
    analyses,
    homeworks: bundle.homeworks,
    streakDays,
  });

  return (
    <ClientPortalShell eyebrow="JOURNEY" title="Sleep Wellness Journey™">
      <SectionCard
        eyebrow="JOURNEY MAP"
        title="睡眠改善の5つのステージ"
      >
        <p className="mb-5 text-[14px] leading-7 text-slate-600">
          ゲームのように楽しく続けられる、Sleep Wellness のロードマップです。
        </p>
        <JourneyStageMap stages={journey.stages} />
      </SectionCard>

      <SectionCard eyebrow="PROGRESS" title="進捗サマリー">
        <JourneyProgressPanel
          currentStage={journey.currentStage}
          achievementRate={journey.achievementRate}
          improvementRate={journey.improvementRate}
          streakDays={journey.streakDays}
          nextGoal={journey.nextGoal}
          scoreTrend={journey.scoreTrend}
        />
      </SectionCard>

      <SectionCard eyebrow="ACHIEVEMENTS" title="バッジ">
        <JourneyAchievements achievements={journey.achievements} />
      </SectionCard>

      <SectionCard eyebrow="AI COACH" title="AIコーチ">
        <JourneyAiCoachCard
          coach={journey.aiCoach}
          stageTitle={journey.currentStage.title}
        />
      </SectionCard>

      <SectionCard eyebrow="COMPARE" title="前回との比較">
        {comparison ? (
          <>
            <p
              className="mb-2 text-[14px] font-semibold"
              style={{ color: deltaDisplay.color }}
            >
              {deltaDisplay.label}
            </p>
            <p className="mb-4 text-[12px] text-slate-400">
              前回 {formatDisplayDate(comparison.previousDate)} との比較
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {comparison.items.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-4"
                >
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
                    {item.label}
                  </p>
                  <p
                    className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] tabular-nums"
                    style={{ color: previousComparisonToneColor(item.tone) }}
                  >
                    {item.value}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    {item.tone === "improved"
                      ? "改善"
                      : item.tone === "worsened"
                        ? "悪化"
                        : "変化なし"}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            compact
            illustration="analysis"
            title="比較できる前回の分析がありません"
            description="2回目以降の分析から、前回との変化が見えるようになります。"
          />
        )}
      </SectionCard>

      <SectionCard eyebrow="INSTRUCTOR" title="認定講師からのコメント">
        {instructorComment ? (
          <div className="rounded-[22px] border border-[#8a6a2d]/20 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-5">
            <p
              className="text-[10px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              CERTIFIED INSTRUCTOR
            </p>
            <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-slate-700">
              {instructorComment}
            </p>
            {bundle.data.instructor ? (
              <p className="mt-3 text-[12px] text-slate-400">
                {bundle.data.instructor.displayName}
              </p>
            ) : null}
          </div>
        ) : (
          <EmptyState
            compact
            illustration="generic"
            title="コメントはまだありません"
            description="認定講師からのメッセージが届くとここに表示されます。"
          />
        )}
      </SectionCard>

      {analyses.length > 0 ? (
        <SleepWellnessJourneyCard
          analyses={analyses}
          streakDays={streakDays}
          homeworkRate={homeworkAchievement.rate}
        />
      ) : (
        <EmptyState
          illustration="journey"
          eyebrow="STORY"
          title="改善の物語はこれから"
          description="分析が積み重なると、タイムラインとして表示されます。"
        />
      )}
    </ClientPortalShell>
  );
}
