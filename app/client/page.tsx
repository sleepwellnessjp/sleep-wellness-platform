"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ClientDailyAdviceCard,
  ClientDailyBreathingCard,
  ClientDailyTriviaCard,
  ClientDailyYogaCard,
  ClientStreakPanel,
} from "@/components/ClientDailyWellnessSections";
import { ClientHomeAiComment } from "@/components/ClientHomeStatusPanels";
import ClientNav from "@/components/ClientNav";
import ClientTodayHomework from "@/components/ClientTodayHomework";
import OnboardingGuide from "@/components/OnboardingGuide";
import SleepCoachCard from "@/components/SleepCoachCard";
import SleepWellnessJourneyCard from "@/components/SleepWellnessJourneyCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import SectionCard from "@/components/ui/SectionCard";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import {
  buildClientMypageComparison,
  findPreviousAnalysis,
  previousComparisonToneColor,
} from "@/lib/previous-comparison";
import {
  computeAssignedHomeworkAchievement,
  computeHomeworkStreakDays,
  filterTodaysHomeworks,
  listClientHomeworks,
  type ClientHomework,
} from "@/lib/repositories/client-homeworks-repository";
import {
  getMyClientMypage,
  type ClientInstructorInfo,
  type ClientMypageData,
} from "@/lib/repositories/client-mypage-repository";
import {
  formatDisplayDate,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/repositories/client-repository";
import type { AnalysisResult } from "@/lib/analysis-session";

function Section({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <SectionCard id={id} eyebrow={eyebrow} title={title}>
      {children}
    </SectionCard>
  );
}

function wellnessScoreOf(analysis: StoredAnalysis | null | undefined): number | null {
  if (!analysis) return null;
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

function formatScoreDelta(delta: number | null): {
  label: string;
  color: string;
} {
  if (delta == null) {
    return { label: "比較データなし", color: GOLD };
  }
  const rounded = Math.round(delta);
  if (rounded === 0) {
    return { label: "前回より ±0", color: GOLD };
  }
  if (rounded > 0) {
    return { label: `前回より +${rounded}`, color: "#0f6b5c" };
  }
  return { label: `前回より ${rounded}`, color: "#a33a3a" };
}

function instructorInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "SW";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
  }
  return trimmed.slice(0, 2);
}

function ScoreHero({
  score,
  deltaLabel,
  deltaColor,
  analysisDate,
}: {
  score: number | null;
  deltaLabel: string;
  deltaColor: string;
  analysisDate: string | null;
}) {
  if (score == null) {
    return (
      <EmptyState
        illustration="score"
        eyebrow="SLEEP WELLNESS SCORE"
        title="まだスコアがありません"
        description="最初の睡眠分析が完了すると、ここに Sleep Wellness Score が表示されます。"
      />
    );
  }

  const size = 168;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#8a6a2d]/30 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-8 shadow-[0_24px_70px_-48px_rgba(138,106,45,0.45)] sm:px-8 sm:py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(216,179,106,0.85), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(216,179,106,0.35), transparent 70%)",
        }}
      />

      <div className="relative text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          Sleep Wellness Score
        </p>

        <div className="relative mx-auto mt-6 flex h-[168px] w-[168px] items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
            aria-hidden
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(138,106,45,0.14)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#client-sws-ring)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition:
                  "stroke-dashoffset 800ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
            <defs>
              <linearGradient
                id="client-sws-ring"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={GOLD_LIGHT} />
                <stop offset="100%" stopColor={GOLD} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p
              className="text-[3.4rem] leading-none font-semibold tracking-[-0.07em] sm:text-[3.75rem]"
              style={{ color: NAVY }}
            >
              {clamped}
            </p>
          </div>
        </div>

        <p
          className="mt-5 text-[1.05rem] font-semibold tracking-[-0.02em] sm:text-lg"
          style={{ color: deltaColor }}
        >
          {deltaLabel}
        </p>
        {analysisDate ? (
          <p className="mt-2 text-[12px] text-slate-400">
            最新分析 {formatDisplayDate(analysisDate)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InstructorCard({ instructor }: { instructor: ClientInstructorInfo }) {
  return (
    <div className="flex gap-4 rounded-[22px] border border-[#8a6a2d]/20 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-5 sm:gap-5 sm:px-6 sm:py-6">
      <div className="shrink-0">
        {instructor.avatarUrl ? (
          <Image
            src={instructor.avatarUrl}
            alt={instructor.displayName}
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-full object-cover ring-2 ring-[#8a6a2d]/25"
            unoptimized
          />
        ) : (
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-[18px] font-semibold tracking-[0.06em] text-white"
            style={{
              background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
            }}
            aria-hidden
          >
            {instructorInitials(instructor.displayName)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          CERTIFIED INSTRUCTOR
        </p>
        <h3
          className="mt-1.5 text-[1.15rem] font-semibold tracking-[-0.03em] sm:text-xl"
          style={{ color: NAVY }}
        >
          {instructor.displayName}
        </h3>
        {instructor.message ? (
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-slate-600 sm:text-[15px]">
            {instructor.message}
          </p>
        ) : (
          <p className="mt-3 text-[14px] leading-7 text-slate-400">
            メッセージはまだありません
          </p>
        )}
      </div>
    </div>
  );
}

function HistoryList({ analyses }: { analyses: StoredAnalysis[] }) {
  const items = analyses.slice(0, 5);
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        illustration="history"
        title="分析履歴はまだありません"
        description="最初の睡眠分析を始めると、ここに履歴が積み上がっていきます。"
      />
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const score = wellnessScoreOf(item);
        return (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p
                className="text-[15px] font-semibold tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                {formatDisplayDate(item.analysisDate)}
              </p>
              <p className="mt-1 text-[13px] text-slate-500">
                Score{" "}
                <span className="font-semibold tabular-nums" style={{ color: GOLD }}>
                  {score == null ? "—" : Math.round(score)}
                </span>
              </p>
            </div>
            <Link
              href={`/client/analyses/${encodeURIComponent(item.id)}`}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#8a6a2d]/30 bg-white px-4 text-[12px] font-semibold transition hover:bg-[#faf7f1]"
              style={{ color: GOLD }}
            >
              詳細を見る
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function ClientMyPage() {
  const { loading: authLoading, isAuthenticated, isDemoMode, supabaseEnabled } =
    useAuth();
  const [data, setData] = useState<ClientMypageData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<AnalysisResult | null>(null);
  const [homeworks, setHomeworks] = useState<ClientHomework[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const next = await getMyClientMypage();
      setData(next);
      const latest = next?.client.analyses[0] ?? null;
      setLatestResult(
        latest?.result
          ? {
              ...latest.result,
              analysisId: latest.result.analysisId?.trim() || latest.id,
            }
          : null,
      );
      if (next?.client.id) {
        const hw = await listClientHomeworks(next.client.id).catch(() => []);
        setHomeworks(hw);
      } else {
        setHomeworks([]);
      }
    } catch (err) {
      console.error("[client mypage]", err);
      setError(
        err instanceof Error
          ? err.message
          : "マイページの読み込みに失敗しました。",
      );
      setData(null);
      setHomeworks([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (supabaseEnabled && !isAuthenticated && !isDemoMode) {
      setReady(true);
      return;
    }

    setReady(false);
    void refresh();

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, [
    authLoading,
    isAuthenticated,
    isDemoMode,
    supabaseEnabled,
    refresh,
    reloadKey,
  ]);

  if (authLoading || !ready) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <ClientNav />
        <SoftSkeleton variant="page" />
      </main>
    );
  }

  if (supabaseEnabled && !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center sm:p-10">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            CLIENT
          </p>
          <h1
            className="mt-4 text-2xl font-semibold tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            ログインが必要です
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-slate-500">
            クライアント専用マイページは、ご本人のアカウントでのみご覧いただけます。
          </p>
          <Link
            href="/login?redirect=/client"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            ログイン
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <ClientNav />
        <div className="mx-auto max-w-md px-5 py-16">
          <ErrorState
            message={error}
            onRetry={() => {
              setReady(false);
              setReloadKey((k) => k + 1);
            }}
          />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <ClientNav />
        <OnboardingGuide enabled />
        <div className="mx-auto max-w-md px-5 py-16">
          <EmptyState
            illustration="generic"
            eyebrow="WAITING"
            title="まだ連携されていません"
            description="担当の認定講師が、あなたのメールアドレスでマイページ連携を設定すると、分析結果や宿題が表示されます。"
          />
        </div>
      </main>
    );
  }

  const client: StoredClient = data.client;
  const latest = client.analyses[0] ?? null;
  const previous = findPreviousAnalysis(client.analyses, latest?.id);
  const latestScore = wellnessScoreOf(latest);
  const previousScore = wellnessScoreOf(previous);
  const scoreDelta =
    latestScore != null && previousScore != null
      ? latestScore - previousScore
      : null;
  const deltaDisplay = formatScoreDelta(scoreDelta);
  const comparison =
    latest && previous
      ? buildClientMypageComparison(previous, latest)
      : null;
  const homeworkAchievement = computeAssignedHomeworkAchievement(homeworks);
  const streakDays = computeHomeworkStreakDays(homeworks);
  const hasAnalyses = client.analyses.length > 0;
  const todaysHomeworks = filterTodaysHomeworks(homeworks);
  const pendingHomework = todaysHomeworks.find((item) => !item.isCompleted);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <ClientNav />
      <OnboardingGuide enabled />

      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8 sm:space-y-8 sm:px-8 sm:py-12">
        <div className="px-1">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS OS · CLIENT
          </p>
          <h1
            className="mt-2 text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            {client.name}
            <span className="font-normal text-slate-400"> さん</span>
          </h1>
        </div>

        {!hasAnalyses ? (
          <EmptyState
            illustration="analysis"
            eyebrow="GET STARTED"
            title="最初の睡眠分析を始めましょう"
            description="担当の認定講師が分析を行うと、スコア・Sleep Coach・Journey・宿題がここに揃います。"
          />
        ) : null}

        <ScoreHero
          score={latestScore}
          deltaLabel={deltaDisplay.label}
          deltaColor={deltaDisplay.color}
          analysisDate={latest?.analysisDate ?? null}
        />

        {hasAnalyses ? (
          <div id="sleep-coach">
            <SleepCoachCard
              analyses={client.analyses}
              latest={latest}
              previous={previous}
              streakDays={streakDays}
              homeworkRate={homeworkAchievement.rate}
            />
          </div>
        ) : null}

        {hasAnalyses ? (
          <div id="journey">
            <SleepWellnessJourneyCard
              analyses={client.analyses}
              streakDays={streakDays}
              homeworkRate={homeworkAchievement.rate}
            />
          </div>
        ) : (
          <EmptyState
            compact
            illustration="journey"
            eyebrow="JOURNEY"
            title="Journeyはまだありません"
            description="分析が積み重なると、改善の物語としてタイムラインが表示されます。"
          />
        )}

        <Section id="mission" eyebrow="MISSION" title="Today's Mission">
          {hasAnalyses ? (
            <div className="space-y-4">
              <p className="text-[15px] leading-7 text-slate-600">
                {pendingHomework
                  ? `今日の最優先は「${pendingHomework.title}」です。`
                  : "今日は Sleep Coach の提案とメラトニンヨガ™で、睡眠リズムを整えましょう。"}
              </p>
              <ul className="space-y-2">
                <li className="rounded-2xl bg-[#fafaf8] px-4 py-3 text-[14px] text-slate-700">
                  Sleep Coach のフォーカスを確認する
                </li>
                <li className="rounded-2xl bg-[#fafaf8] px-4 py-3 text-[14px] text-slate-700">
                  {pendingHomework
                    ? `宿題「${pendingHomework.title}」を完了する`
                    : "今日のメラトニンヨガ™を実践する"}
                </li>
                <li className="rounded-2xl bg-[#fafaf8] px-4 py-3 text-[14px] text-slate-700">
                  就寝前の呼吸法でリラックスする
                </li>
              </ul>
              {todaysHomeworks.length > 0 ? (
                <p className="text-[13px] text-slate-500">
                  今日の宿題が {todaysHomeworks.length}{" "}
                  件あります。下の宿題セクションで確認しましょう。
                </p>
              ) : (
                <p className="text-[13px] text-slate-500">
                  小さな一歩の積み重ねが、睡眠ウェルネスを育てます。
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              compact
              illustration="generic"
              title="ミッションはまだありません"
              description="最初の分析が完了すると、今日のミッションが表示されます。"
            />
          )}
        </Section>

        <Section id="homework" eyebrow="HOMEWORK" title="宿題">
          <ClientTodayHomework
            clientId={client.id}
            onHomeworksChange={setHomeworks}
          />
        </Section>

        <Section id="history" eyebrow="HISTORY" title="分析履歴">
          <HistoryList analyses={client.analyses} />
        </Section>

        <Section id="yoga" eyebrow="YOGA" title="メラトニンヨガ™">
          <ClientDailyYogaCard />
        </Section>

        <Section eyebrow="ADVICE" title="今日の睡眠ウェルネスアドバイス">
          <ClientDailyAdviceCard result={latestResult} />
        </Section>

        <Section eyebrow="BREATH" title="今日の呼吸法">
          <ClientDailyBreathingCard />
        </Section>

        <Section eyebrow="INSIGHT" title="今日の豆知識">
          <ClientDailyTriviaCard />
        </Section>

        <Section eyebrow="STREAK" title="継続日数">
          <ClientStreakPanel
            streakDays={streakDays}
            homeworkRate={homeworkAchievement.rate}
          />
        </Section>

        <Section eyebrow="AI COMMENT" title="今日のAIコメント">
          <ClientHomeAiComment result={latestResult} />
        </Section>

        <Section eyebrow="COMPARE" title="前回との比較">
          {comparison ? (
            <>
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
        </Section>

        <Section eyebrow="INSTRUCTOR" title="担当認定講師">
          {data.instructor ? (
            <InstructorCard instructor={data.instructor} />
          ) : (
            <EmptyState
              compact
              illustration="generic"
              title="担当認定講師の情報がありません"
              description="講師プロフィールが設定されると、ここに表示されます。"
            />
          )}
        </Section>
      </div>
    </main>
  );
}
