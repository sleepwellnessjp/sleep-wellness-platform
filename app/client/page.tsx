"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";
import {
  ProgressMeter,
  WeeklyScoreTrendChart,
} from "@/components/client-portal/PortalCharts";
import SleepCoachCard from "@/components/ai-intelligence/SleepCoachCard";
import MorningEvidencePrompt from "@/components/evidence/MorningEvidencePrompt";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import {
  buildWeeklyScoreTrend,
  clientWellnessScoreOf,
  computeImprovementRate,
  formatScoreDelta,
} from "@/lib/client-portal/helpers";
import { CLIENT_PORTAL_ROUTES } from "@/lib/client-portal/constants";
import type {
  ClientGoalProgress,
  ClientPortalNotification,
} from "@/lib/client-portal/types";
import {
  AI_INTELLIGENCE_ROUTES,
  type SleepCoachBriefing,
} from "@/lib/ai-intelligence";
import {
  findPreviousAnalysis,
} from "@/lib/previous-comparison";
import { formatDisplayDate } from "@/lib/repositories/client-repository";
import type { ClientInstructorInfo } from "@/lib/repositories/client-mypage-repository";
import { SoftSkeleton } from "@/components/ui/Skeleton";

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
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
        <p className="text-[14px] text-slate-400">まだ今日の睡眠スコアがありません</p>
      </div>
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
      <div className="relative text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          今日の睡眠スコア
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
              stroke="url(#portal-sws-ring)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
            <defs>
              <linearGradient id="portal-sws-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={GOLD_LIGHT} />
                <stop offset="100%" stopColor={GOLD} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p
              className="text-[3.4rem] leading-none font-semibold tracking-[-0.07em]"
              style={{ color: NAVY }}
            >
              {clamped}
            </p>
          </div>
        </div>
        <p
          className="mt-5 text-[1.05rem] font-semibold tracking-[-0.02em]"
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

function InstructorMessage({
  instructor,
  fallback,
}: {
  instructor: ClientInstructorInfo | null;
  fallback: string;
}) {
  const message = instructor?.message?.trim() || fallback;
  return (
    <div className="flex gap-4 rounded-[22px] border border-[#8a6a2d]/20 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-5">
      <div className="shrink-0">
        {instructor?.avatarUrl ? (
          <Image
            src={instructor.avatarUrl}
            alt={instructor.displayName}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-[#8a6a2d]/25"
            unoptimized
          />
        ) : (
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[14px] font-semibold text-white"
            style={{
              background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
            }}
          >
            {(instructor?.displayName ?? "SW").slice(0, 2)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          今日のメッセージ
        </p>
        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-slate-600">
          {message}
        </p>
        {instructor ? (
          <p className="mt-2 text-[12px] text-slate-400">
            {instructor.displayName}（認定講師）
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function ClientPortalHomePage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();
  const [goals, setGoals] = useState<ClientGoalProgress[]>([]);
  const [notifications, setNotifications] = useState<ClientPortalNotification[]>(
    [],
  );
  const [coach, setCoach] = useState<SleepCoachBriefing | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    void (async () => {
      try {
        const [goalsRes, ntfRes] = await Promise.all([
          fetch("/api/client-portal/goals").then((r) => r.json()),
          fetch("/api/client-portal/notifications").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setGoals(Array.isArray(goalsRes.goals) ? goalsRes.goals : []);
        setNotifications(
          Array.isArray(ntfRes.notifications) ? ntfRes.notifications : [],
        );
      } catch {
        if (!cancelled) {
          setGoals([]);
          setNotifications([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bundle]);

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    const client = bundle.data.client;
    const latest = client.analyses[0] ?? null;
    const score = clientWellnessScoreOf(latest);
    const metrics = latest?.metrics;

    setCoachLoading(true);
    void (async () => {
      try {
        const res = await fetch(AI_INTELLIGENCE_ROUTES.api.sleepCoach, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: client.id,
            clientName: client.name,
            sleepScore: score,
            sleepEfficiency: parseHomeMetric(metrics?.sleepEfficiency),
            stress: parseHomeMetric(metrics?.stress),
            hrv: parseHomeMetric(metrics?.hrv),
            streakDays: Math.min(client.analyses.length, 30),
          }),
        });
        const json = (await res.json()) as {
          briefing?: SleepCoachBriefing;
        };
        if (!cancelled) setCoach(json.briefing ?? null);
      } catch {
        if (!cancelled) setCoach(null);
      } finally {
        if (!cancelled) setCoachLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bundle]);

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  const { data } = bundle;
  const client = data.client;
  const latest = client.analyses[0] ?? null;
  const previous = findPreviousAnalysis(client.analyses, latest?.id);
  const latestScore = clientWellnessScoreOf(latest);
  const previousScore = clientWellnessScoreOf(previous);
  const scoreDelta =
    latestScore != null && previousScore != null
      ? latestScore - previousScore
      : null;
  const deltaDisplay = formatScoreDelta(scoreDelta);
  const weekly = buildWeeklyScoreTrend(client.analyses);
  const improvementRate = computeImprovementRate(client.analyses);
  const activeGoal =
    goals.find((g) => g.status === "active") ??
    goals[0] ??
    null;
  const currentGoalText =
    activeGoal?.title ||
    latest?.result?.recommendationsUntilNext?.[0]?.text ||
    "目標はまだ設定されていません";
  const todayMessageFallback =
    notifications.find((n) => !n.readAt)?.body ||
    "今日も睡眠リズムを整える一歩を積み重ねましょう。";

  return (
    <ClientPortalShell
      eyebrow="HOME"
      title={`${client.name} さん`}
      trailing={
        <Link
          href={CLIENT_PORTAL_ROUTES.chat}
          className="inline-flex min-h-10 items-center rounded-full border border-[#8a6a2d]/30 bg-white px-4 text-[12px] font-semibold"
          style={{ color: GOLD }}
        >
          Chat
        </Link>
      }
    >
      <ScoreHero
        score={latestScore}
        deltaLabel={deltaDisplay.label}
        deltaColor={deltaDisplay.color}
        analysisDate={latest?.analysisDate ?? null}
      />

      <MorningEvidencePrompt />

      {coachLoading ? (
        <div className="mt-5">
          <SoftSkeleton variant="coach" />
        </div>
      ) : null}
      {!coachLoading && coach ? (
        <div className="mt-5 space-y-3">
          <SleepCoachCard briefing={coach} />
          <Link
            href={CLIENT_PORTAL_ROUTES.coach}
            className="inline-flex text-[13px] font-semibold"
            style={{ color: GOLD }}
          >
            Sleep Coach と改善予測を見る →
          </Link>
        </div>
      ) : null}

      <SectionCard eyebrow="TREND" title="今週の睡眠スコア推移">
        <WeeklyScoreTrendChart points={weekly} />
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard eyebrow="IMPROVEMENT" title="改善率">
          <ProgressMeter label="初回からの改善" percent={improvementRate} />
        </SectionCard>
        <SectionCard eyebrow="GOAL" title="現在の目標">
          <p className="text-[15px] leading-7 text-slate-700">{currentGoalText}</p>
          {activeGoal ? (
            <div className="mt-4">
              <ProgressMeter
                label="達成率"
                percent={activeGoal.progressPercent}
              />
            </div>
          ) : null}
          <Link
            href={CLIENT_PORTAL_ROUTES.goals}
            className="mt-4 inline-flex text-[13px] font-semibold"
            style={{ color: GOLD }}
          >
            Goals を見る →
          </Link>
        </SectionCard>
      </div>

      <SectionCard eyebrow="MESSAGE" title="今日のメッセージ">
        <InstructorMessage
          instructor={data.instructor}
          fallback={todayMessageFallback}
        />
      </SectionCard>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { href: CLIENT_PORTAL_ROUTES.sleep, label: "Sleep Record" },
          { href: CLIENT_PORTAL_ROUTES.coach, label: "Sleep Coach" },
          { href: CLIENT_PORTAL_ROUTES.advice, label: "Today's Advice" },
          { href: CLIENT_PORTAL_ROUTES.homework, label: "Homework" },
          { href: CLIENT_PORTAL_ROUTES.journey, label: "Journey" },
          { href: CLIENT_PORTAL_ROUTES.reports, label: "Report" },
          { href: CLIENT_PORTAL_ROUTES.chat, label: "Chat" },
          { href: CLIENT_PORTAL_ROUTES.goals, label: "Goals" },
        ].map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#071426]/08 bg-white px-3 text-center text-[12px] font-semibold"
            style={{ color: NAVY }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </ClientPortalShell>
  );
}

function parseHomeMetric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
