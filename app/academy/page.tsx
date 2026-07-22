"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AcademySubNav, {
  isAcademyTabId,
  type AcademyTabId,
} from "@/components/AcademySubNav";
import InstructorNav from "@/components/InstructorNav";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import SectionCard from "@/components/ui/SectionCard";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SUCCESS, TEAL } from "@/components/ui/tokens";
import {
  ACADEMY_CATEGORY_LABELS,
  ACADEMY_CONTENT_TYPE_LABELS,
  ACADEMY_LESSONS,
  ACADEMY_TESTS,
  getQualification,
} from "@/lib/academy/catalog";
import { daysUntil, formatJaDate } from "@/lib/academy/scoring";
import type {
  AcademyContentCategory,
  AcademyCredential,
  AcademyLessonStatus,
} from "@/lib/academy/types";
import {
  loadAcademyDashboard,
  resolveLessonStatus,
  type AcademyDashboardData,
} from "@/lib/repositories/academy-repository";

const STATUS_LABEL: Record<AcademyLessonStatus, string> = {
  not_started: "未受講",
  in_progress: "受講中",
  completed: "修了",
};

const STATUS_STYLE: Record<AcademyLessonStatus, { bg: string; color: string }> =
  {
    not_started: { bg: "rgba(148,163,184,0.14)", color: "#64748b" },
    in_progress: { bg: "rgba(49,95,104,0.12)", color: TEAL },
    completed: { bg: "rgba(15,107,92,0.12)", color: SUCCESS },
  };

const CATEGORIES = Object.keys(
  ACADEMY_CATEGORY_LABELS,
) as AcademyContentCategory[];

function AcademyPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: AcademyTabId = isAcademyTabId(tabParam)
    ? tabParam
    : "credentials";

  const [data, setData] = useState<AcademyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadAcademyDashboard();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const nearestExpiry = useMemo(() => {
    if (!data?.credentials.length) return null;
    return [...data.credentials].sort((a, b) =>
      a.expiresAt.localeCompare(b.expiresAt),
    )[0];
  }, [data]);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="no-print">
        <InstructorNav eyebrow="ACADEMY" />
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="max-w-2xl animate-fade-up">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS ACADEMY
          </p>
          <h1
            className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            アカデミー
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-base">
            認定講師の育成・認定・更新。学習からテスト、認定証発行までをここから進めます。
          </p>
        </header>

        <div className="mt-8 animate-fade-up [animation-delay:80ms]">
          <AcademySubNav active={activeTab} />
        </div>

        {loading && (
          <div className="mt-8">
            <SoftSkeleton variant="card" />
          </div>
        )}

        {error && (
          <div className="mt-8">
            <ErrorState message={error} onRetry={() => void refresh()} />
          </div>
        )}

        {!loading && !error && data && (
          <div className="mt-8 animate-fade-up [animation-delay:120ms]">
            {activeTab === "credentials" && (
              <CredentialsSection credentials={data.credentials} />
            )}
            {activeTab === "learn" && <LearnSection progress={data.progress} />}
            {activeTab === "progress" && (
              <ProgressSection
                percent={data.overallPercent}
                progress={data.progress}
              />
            )}
            {activeTab === "tests" && (
              <TestsSection attempts={data.attempts} />
            )}
            {activeTab === "certificates" && (
              <CertificatesSection
                credentials={data.credentials}
                displayName={data.displayName}
              />
            )}
            {activeTab === "renewal" && (
              <RenewalSection
                credentials={data.credentials}
                nearest={nearestExpiry}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function CredentialsSection({
  credentials,
}: {
  credentials: AcademyCredential[];
}) {
  if (credentials.length === 0) {
    return (
      <EmptyState
        illustration="generic"
        title="保有資格がまだありません"
        description="学習コンテンツを修了し、テストに合格すると資格が登録されます。"
        primaryAction={{
          label: "学習を始める",
          href: "/academy?tab=learn",
        }}
      />
    );
  }

  return (
    <SectionCard title="現在保有資格" eyebrow="CREDENTIALS">
      <ul className="space-y-4">
        {credentials.map((cred) => {
          const q = getQualification(cred.qualificationId);
          return (
            <li
              key={cred.id}
              className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    className="text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
                    style={{ color: NAVY }}
                  >
                    {q?.name ?? cred.qualificationId}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    認定番号 {cred.certificateNumber}
                  </p>
                </div>
                <Button
                  href={`/academy/certificates/${cred.id}`}
                  variant="secondary"
                  size="sm"
                >
                  認定証
                </Button>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <Meta label="取得日" value={formatJaDate(cred.acquiredAt)} />
                <Meta label="有効期限" value={formatJaDate(cred.expiresAt)} />
                <Meta
                  label="更新日"
                  value={formatJaDate(cred.renewedAt ?? cred.acquiredAt)}
                />
              </dl>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function LearnSection({
  progress,
}: {
  progress: AcademyDashboardData["progress"];
}) {
  return (
    <div className="space-y-5">
      {CATEGORIES.map((category) => {
        const lessons = ACADEMY_LESSONS.filter((l) => l.category === category);
        return (
          <SectionCard
            key={category}
            title={ACADEMY_CATEGORY_LABELS[category]}
            eyebrow="CONTENT"
          >
            <ul className="divide-y divide-slate-100">
              {lessons.map((lesson) => {
                const status = resolveLessonStatus(progress, lesson.id);
                const style = STATUS_STYLE[status];
                return (
                  <li
                    key={lesson.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.06em]"
                          style={{
                            backgroundColor: "rgba(138,106,45,0.12)",
                            color: GOLD,
                          }}
                        >
                          {ACADEMY_CONTENT_TYPE_LABELS[lesson.contentType]}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: style.bg,
                            color: style.color,
                          }}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      <p
                        className="mt-2 text-[15px] font-semibold tracking-[-0.02em]"
                        style={{ color: NAVY }}
                      >
                        {lesson.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-6 text-slate-500">
                        {lesson.summary} · {lesson.durationLabel}
                      </p>
                    </div>
                    <Button
                      href={`/academy/learn/${lesson.id}`}
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                    >
                      開く
                    </Button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        );
      })}
    </div>
  );
}

function ProgressSection({
  percent,
  progress,
}: {
  percent: number;
  progress: AcademyDashboardData["progress"];
}) {
  return (
    <div className="space-y-5">
      <SectionCard title="全体進捗" eyebrow="OVERALL">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-5xl font-semibold tracking-[-0.06em] sm:text-6xl"
            style={{ color: NAVY }}
          >
            {percent}
            <span className="ml-1 text-2xl text-slate-400">%</span>
          </p>
          <div className="w-full max-w-md">
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${percent}%`,
                  background: `linear-gradient(90deg, ${TEAL}, ${GOLD})`,
                }}
              />
            </div>
            <p className="mt-2 text-[13px] text-slate-500">
              {ACADEMY_LESSONS.length} 講義中、修了{" "}
              {
                ACADEMY_LESSONS.filter(
                  (l) => resolveLessonStatus(progress, l.id) === "completed",
                ).length
              }{" "}
              件
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="各講義" eyebrow="LESSONS">
        <ul className="space-y-2">
          {ACADEMY_LESSONS.map((lesson) => {
            const status = resolveLessonStatus(progress, lesson.id);
            const style = STATUS_STYLE[status];
            return (
              <li
                key={lesson.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#fafaf8] px-4 py-3"
              >
                <div className="min-w-0">
                  <p
                    className="truncate text-[14px] font-semibold tracking-[-0.02em]"
                    style={{ color: NAVY }}
                  >
                    {lesson.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {ACADEMY_CATEGORY_LABELS[lesson.category]}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ backgroundColor: style.bg, color: style.color }}
                >
                  {STATUS_LABEL[status]}
                </span>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}

function TestsSection({
  attempts,
}: {
  attempts: AcademyDashboardData["attempts"];
}) {
  return (
    <SectionCard title="認定テスト" eyebrow="EXAMS">
      <ul className="space-y-4">
        {ACADEMY_TESTS.map((test) => {
          const latest = attempts.find((a) => a.testId === test.id);
          const q = getQualification(test.qualificationId);
          return (
            <li
              key={test.id}
              className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p
                    className="text-[15px] font-semibold tracking-[-0.02em]"
                    style={{ color: NAVY }}
                  >
                    {test.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-slate-500">
                    {test.description}
                  </p>
                  <p className="mt-2 text-[12px] text-slate-500">
                    対象: {q?.name} · 合格点 {test.passingScore}点 · 選択式 / 記述式
                  </p>
                  {latest && (
                    <p
                      className="mt-2 text-[13px] font-semibold"
                      style={{ color: latest.passed ? SUCCESS : "#a33a3a" }}
                    >
                      直近結果: {latest.score}点（
                      {latest.passed ? "合格" : "未合格"}）
                    </p>
                  )}
                </div>
                <Button href={`/academy/tests/${test.id}`} size="sm">
                  受験する
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function CertificatesSection({
  credentials,
  displayName,
}: {
  credentials: AcademyCredential[];
  displayName: string;
}) {
  if (credentials.length === 0) {
    return (
      <EmptyState
        illustration="generic"
        title="発行できる認定証がありません"
        description="テストに合格すると、PDF認定証を生成できます。"
        primaryAction={{
          label: "テストへ",
          href: "/academy?tab=tests",
        }}
      />
    );
  }

  return (
    <SectionCard title="認定証" eyebrow="CERTIFICATES">
      <p className="mb-5 text-[13px] leading-6 text-slate-500">
        修了資格の認定証を開いて PDF（印刷）を生成できます。表示名: {displayName}
      </p>
      <ul className="space-y-3">
        {credentials.map((cred) => {
          const q = getQualification(cred.qualificationId);
          return (
            <li
              key={cred.id}
              className="flex flex-col gap-3 rounded-2xl bg-[#fafaf8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {q?.name}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  {cred.certificateNumber} · 発行{" "}
                  {formatJaDate(cred.issuedAt.slice(0, 10))}
                </p>
              </div>
              <Button href={`/academy/certificates/${cred.id}`} size="sm">
                PDF認定証を開く
              </Button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function RenewalSection({
  credentials,
  nearest,
}: {
  credentials: AcademyCredential[];
  nearest: AcademyCredential | null;
}) {
  if (!nearest) {
    return (
      <EmptyState
        illustration="generic"
        title="更新対象の資格がありません"
        description="資格を取得すると、認定更新日までの残り日数が表示されます。"
      />
    );
  }

  const days = daysUntil(nearest.expiresAt);
  const q = getQualification(nearest.qualificationId);

  return (
    <div className="space-y-5">
      <SectionCard title="次回の更新期限" eyebrow="RENEWAL">
        <p className="text-[13px] text-slate-500">{q?.name}</p>
        <p
          className="mt-3 text-5xl font-semibold tracking-[-0.06em] sm:text-6xl"
          style={{ color: days < 0 ? "#a33a3a" : NAVY }}
        >
          {days < 0 ? "期限切れ" : (
            <>
              あと{days}
              <span className="ml-1 text-2xl text-slate-400">日</span>
            </>
          )}
        </p>
        <p className="mt-4 text-[14px] leading-7 text-slate-600">
          認定更新日: {formatJaDate(nearest.expiresAt)}
          {days >= 0
            ? ` まで、あと ${days} 日です。`
            : " を過ぎています。更新手続きを進めてください。"}
        </p>
        <div className="mt-6">
          <Button href="/academy?tab=tests" variant="secondary" size="sm">
            更新のためのテストへ
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="全資格の更新スケジュール" eyebrow="SCHEDULE">
        <ul className="space-y-3">
          {credentials.map((cred) => {
            const d = daysUntil(cred.expiresAt);
            const name = getQualification(cred.qualificationId)?.name;
            return (
              <li
                key={cred.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#fafaf8] px-4 py-3"
              >
                <div className="min-w-0">
                  <p
                    className="truncate text-[14px] font-semibold"
                    style={{ color: NAVY }}
                  >
                    {name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {formatJaDate(cred.expiresAt)}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[13px] font-semibold"
                  style={{ color: d < 60 ? "#a33a3a" : TEAL }}
                >
                  {d < 0 ? "期限切れ" : `あと${d}日`}
                </span>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-[0.16em] text-slate-500">
        {label}
      </dt>
      <dd
        className="mt-1 text-[14px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        {value}
      </dd>
    </div>
  );
}

export default function AcademyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f7f5]">
          <InstructorNav eyebrow="ACADEMY" />
          <div className="mx-auto max-w-6xl px-5 py-14">
            <SoftSkeleton variant="card" />
          </div>
        </main>
      }
    >
      <AcademyPageInner />
    </Suspense>
  );
}
