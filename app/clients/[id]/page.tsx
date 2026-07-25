"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import AiCounselingAssistantCard from "@/components/AiCounselingAssistantCard";
import ClientHomeworkManager from "@/components/ClientHomeworkManager";
import ClientInviteCard from "@/components/ClientInviteCard";
import ClientPortalLinkCard from "@/components/ClientPortalLinkCard";
import InstructorClientChatCard from "@/components/InstructorClientChatCard";
import InstructorNav from "@/components/InstructorNav";
import ErrorState from "@/components/ui/ErrorState";
import {
  BORDER,
  CARD_SHADOW,
  MUTED,
  NAVY,
  SURFACE,
} from "@/components/ui/tokens";
import { userMessageFromUnknown } from "@/lib/data-access-errors";
import {
  ACTIVITY_KIND_LABELS,
  clientInitials,
  formatDetailDate,
  formatGender,
  formatMetricHours,
  formatMetricNumber,
  formatMetricPercent,
  formatTimelineWhen,
  getClientDetail,
  type ClientDetail,
  type ClientDetailActivityKind,
} from "@/lib/client-detail";
import { instructorPdfReportResultHref } from "@/lib/client-pdf-reports";

function ProfileAvatar({ client }: { client: ClientDetail }) {
  if (client.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={client.avatarUrl}
        alt=""
        className="h-28 w-28 rounded-full object-cover sm:h-32 sm:w-32"
        style={{ backgroundColor: "#F1F5F9" }}
      />
    );
  }

  return (
    <div
      className="flex h-28 w-28 items-center justify-center rounded-full text-[1.75rem] font-semibold tracking-[-0.03em] text-white sm:h-32 sm:w-32 sm:text-[2rem]"
      style={{ backgroundColor: NAVY }}
      aria-hidden="true"
    >
      {clientInitials(client.name)}
    </div>
  );
}

function SectionTitle({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-base font-semibold tracking-[-0.03em] sm:text-xl"
      style={{ color: NAVY }}
    >
      {children}
    </h2>
  );
}

function QuickAction({
  href,
  label,
  emphasize,
}: {
  href: string;
  label: string;
  emphasize?: boolean;
}) {
  if (emphasize) {
    return (
      <Link
        href={href}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-4 py-2.5 text-[14px] font-semibold text-white transition active:opacity-90 sm:min-h-11 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
        style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border px-4 py-2.5 text-[14px] font-semibold transition active:bg-slate-50 sm:min-h-11 sm:w-auto sm:hover:bg-slate-50 sm:active:bg-transparent"
      style={{ borderColor: BORDER, color: NAVY }}
    >
      {label}
    </Link>
  );
}

function MetricCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-[#F8FAFC] px-3 py-3.5 text-center sm:px-5 sm:py-4${className ? ` ${className}` : ""}`}
      style={{ borderColor: BORDER }}
    >
      <p
        className="text-[10px] font-medium tracking-[0.1em] sm:text-[11px]"
        style={{ color: MUTED }}
      >
        {label}
      </p>
      <p
        className="mt-1.5 break-words text-[1.05rem] font-semibold tracking-[-0.03em] tabular-nums sm:mt-2 sm:text-[1.25rem]"
        style={{ color: NAVY }}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressCard({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  return (
    <div
      className="rounded-3xl border bg-white px-4 py-5 text-center sm:px-6 sm:py-6"
      style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
    >
      <p
        className="text-[11px] font-medium tracking-[0.12em]"
        style={{ color: MUTED }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-[1.75rem] font-semibold tracking-[-0.05em] tabular-nums sm:mt-3 sm:text-[2.25rem]"
        style={{ color: NAVY }}
      >
        {score ?? "—"}
      </p>
    </div>
  );
}

function TimelineDot({ kind }: { kind: ClientDetailActivityKind }) {
  const tone =
    kind === "analysis"
      ? NAVY
      : kind === "report"
        ? "#0F766E"
        : kind === "journey"
          ? "#1D4ED8"
          : "#B45309";

  return (
    <span
      className="mt-1.5 block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: tone }}
      aria-hidden
    />
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadError(null);

    void (async () => {
      try {
        const next = id ? await getClientDetail(id) : null;
        if (!cancelled) {
          setClient(next);
          setLoadError(null);
        }
      } catch (error) {
        console.error("[clients/id] getClientDetail failed:", error);
        if (!cancelled) {
          setClient(null);
          setLoadError(userMessageFromUnknown(error));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const analysisHref = `/analysis/new?clientId=${encodeURIComponent(id)}`;
  const journeyHref = `/journey?clientId=${encodeURIComponent(id)}`;
  const compareHref = `/clients/${encodeURIComponent(id)}/compare`;
  const reportHref = client?.latestAnalysisId
    ? instructorPdfReportResultHref(client.latestAnalysisId)
    : `/reports`;
  const pdfHref = client?.latestAnalysisId
    ? instructorPdfReportResultHref(client.latestAnalysisId)
    : analysisHref;
  const homeworkHref = `/homework?clientId=${encodeURIComponent(id)}`;

  if (!ready) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="CLIENT" />
        <div
          className="mx-auto max-w-3xl space-y-3 px-4 py-10 sm:space-y-4 sm:px-10 sm:py-16"
          aria-busy="true"
          aria-label="読み込み中"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-3xl bg-slate-100 sm:h-36"
            />
          ))}
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="CLIENT" />
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
          <ErrorState
            title="クライアントを表示できません"
            message={loadError}
            kind="supabase"
            onRetry={() => window.location.reload()}
          />
          <Link
            href="/clients"
            className="mt-6 inline-flex min-h-11 items-center justify-center text-[14px] font-medium transition active:opacity-70"
            style={{ color: MUTED }}
          >
            ← 一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="CLIENT" />
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center sm:px-6">
          <h1
            className="text-[1.5rem] font-semibold tracking-[-0.04em] sm:text-2xl"
            style={{ color: NAVY }}
          >
            クライアントが見つかりません
          </h1>
          <p
            className="mt-3 text-[14px] leading-6 sm:text-[15px] sm:leading-7"
            style={{ color: MUTED }}
          >
            一覧から再度選択してください。
          </p>
          <Link
            href="/clients"
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-8 py-3.5 text-[15px] font-semibold text-white transition active:opacity-90 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
            style={{ backgroundColor: NAVY }}
          >
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  const timeline = [...client.timeline].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE, color: NAVY }}>
      <InstructorNav eyebrow="CLIENT" />

      <div className="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-16 sm:pb-16 lg:py-20 lg:pb-20">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/clients"
            className="inline-flex min-h-11 items-center text-[13px] font-medium transition active:opacity-70 sm:min-h-0 sm:hover:opacity-70 sm:active:opacity-100"
            style={{ color: MUTED }}
          >
            ← Client Management
          </Link>
        </div>

        {/* Client Profile */}
        <section
          className="rounded-3xl border bg-white p-5 sm:p-8"
          style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          aria-labelledby="client-profile-title"
        >
          <SectionTitle id="client-profile-title">Client Profile</SectionTitle>

          <div className="mt-6 flex flex-col gap-6 sm:mt-8 sm:flex-row sm:items-start sm:gap-8">
            <div className="mx-auto shrink-0 sm:mx-0">
              <ProfileAvatar client={client} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <h1
                  className="break-words text-[1.55rem] font-semibold leading-tight tracking-[-0.04em] sm:text-[2.1rem] sm:leading-normal"
                  style={{ color: NAVY }}
                >
                  {client.name}
                </h1>
                <Link
                  href={`/clients/${encodeURIComponent(id)}/profile`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border px-4 text-[13px] font-semibold transition active:bg-slate-50 sm:min-h-10 sm:hover:bg-slate-50"
                  style={{ borderColor: BORDER, color: NAVY }}
                >
                  プロフィール編集
                </Link>
              </div>

              <dl className="mt-5 grid gap-3.5 sm:mt-6 sm:grid-cols-2 sm:gap-4">
                <div>
                  <dt
                    className="text-[11px] font-medium tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    年齢
                  </dt>
                  <dd className="mt-1 text-[14px] font-medium sm:text-[15px]">
                    {client.age != null ? `${client.age}歳` : "未設定"}
                  </dd>
                </div>
                <div>
                  <dt
                    className="text-[11px] font-medium tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    性別
                  </dt>
                  <dd className="mt-1 text-[14px] font-medium sm:text-[15px]">
                    {formatGender(client.gender)}
                  </dd>
                </div>
                <div>
                  <dt
                    className="text-[11px] font-medium tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    担当開始日
                  </dt>
                  <dd className="mt-1 text-[14px] font-medium sm:text-[15px]">
                    {formatDetailDate(client.assignedSince)}
                  </dd>
                </div>
                <div>
                  <dt
                    className="text-[11px] font-medium tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    担当認定講師
                  </dt>
                  <dd className="mt-1 break-words text-[14px] font-medium sm:text-[15px]">
                    {client.instructorName}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt
                    className="text-[11px] font-medium tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    現在の睡眠スコア
                  </dt>
                  <dd
                    className="mt-1 text-[1.75rem] font-semibold tracking-[-0.05em] tabular-nums sm:text-[2rem]"
                    style={{ color: NAVY }}
                  >
                    {client.sleepScore ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mt-10 sm:mt-16" aria-labelledby="quick-actions-title">
          <SectionTitle id="quick-actions-title">Quick Actions</SectionTitle>
          <div className="mt-4 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-3">
            <QuickAction href={analysisHref} label="睡眠分析を開始" emphasize />
            <QuickAction href={compareHref} label="比較分析" />
            <QuickAction href={journeyHref} label="Sleep Journey" />
            <QuickAction href={reportHref} label="AIレポートを見る" />
            <QuickAction href={pdfHref} label="PDF出力" />
            <QuickAction href={homeworkHref} label="宿題を追加" />
          </div>
        </section>

        {/* AI Counseling Assistant */}
        <section
          className="mt-10 sm:mt-16"
          aria-labelledby="ai-counseling-assistant-title"
        >
          <SectionTitle id="ai-counseling-assistant-title">
            AI Counseling Assistant
          </SectionTitle>
          <div className="mt-4 sm:mt-6">
            <AiCounselingAssistantCard
              clientId={client.id}
              analysisHref={analysisHref}
            />
          </div>
        </section>

        {/* Client Portal 連携 */}
        <section
          className="mt-10 sm:mt-16"
          aria-labelledby="client-portal-link-title"
        >
          <SectionTitle id="client-portal-link-title">
            Client Portal 連携
          </SectionTitle>
          <div className="mt-4 space-y-4 sm:mt-6">
            <ClientPortalLinkCard clientId={client.id} />
            <ClientInviteCard
              clientId={client.id}
              clientName={client.name}
            />
            <InstructorClientChatCard clientId={client.id} />
          </div>
        </section>

        {/* 宿題管理（Client Portal に反映） */}
        <section
          className="mt-10 sm:mt-16"
          aria-labelledby="client-homework-manager-title"
        >
          <SectionTitle id="client-homework-manager-title">
            Homework（Client Portal）
          </SectionTitle>
          <div className="mt-4 sm:mt-6">
            <ClientHomeworkManager clientId={client.id} />
          </div>
        </section>

        {/* Sleep Score */}
        <section className="mt-10 sm:mt-16" aria-labelledby="sleep-score-title">
          <SectionTitle id="sleep-score-title">Sleep Score</SectionTitle>
          <div
            className="mt-4 rounded-3xl border bg-white p-5 sm:mt-6 sm:p-8"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <div className="text-center">
              <p
                className="text-[11px] font-medium tracking-[0.14em]"
                style={{ color: MUTED }}
              >
                現在のスコア
              </p>
              <p
                className="mt-2 text-[3.25rem] font-semibold leading-none tracking-[-0.06em] tabular-nums sm:mt-3 sm:text-[4.5rem]"
                style={{ color: NAVY }}
              >
                {client.sleepScore ?? "—"}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-3 sm:gap-4">
              <MetricCell
                label="睡眠効率"
                value={formatMetricPercent(client.metrics.sleepEfficiency)}
              />
              <MetricCell
                label="睡眠時間"
                value={formatMetricHours(client.metrics.sleepHours)}
              />
              <MetricCell
                label="HRV"
                value={formatMetricNumber(client.metrics.hrv)}
              />
              <MetricCell
                label="ストレス"
                value={formatMetricNumber(client.metrics.stress)}
              />
              <MetricCell
                label="体内時計"
                value={
                  client.metrics.circadianOffsetHours == null
                    ? "—"
                    : `${client.metrics.circadianOffsetHours > 0 ? "+" : ""}${client.metrics.circadianOffsetHours.toFixed(1)}h`
                }
                className="col-span-2 sm:col-span-1"
              />
            </div>
          </div>
        </section>

        {/* Progress */}
        <section className="mt-10 sm:mt-16" aria-labelledby="progress-title">
          <SectionTitle id="progress-title">Progress</SectionTitle>
          <div className="mt-4 flex flex-col items-stretch gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <ProgressCard label="初回" score={client.progress.initialScore} />
            </div>
            <div
              className="flex shrink-0 justify-center text-[1.15rem] sm:rotate-[-90deg]"
              style={{ color: MUTED }}
              aria-hidden
            >
              ↓
            </div>
            <div className="min-w-0 flex-1">
              <ProgressCard label="現在" score={client.progress.currentScore} />
            </div>
            <div
              className="flex shrink-0 justify-center text-[1.15rem] sm:rotate-[-90deg]"
              style={{ color: MUTED }}
              aria-hidden
            >
              ↓
            </div>
            <div className="min-w-0 flex-1">
              <ProgressCard label="目標" score={client.progress.targetScore} />
            </div>
          </div>
        </section>

        {/* Activity Timeline */}
        <section className="mt-10 sm:mt-16" aria-labelledby="timeline-title">
          <SectionTitle id="timeline-title">Activity Timeline</SectionTitle>
          <ol
            className="mt-4 space-y-0 rounded-3xl border bg-white px-4 py-1.5 sm:mt-6 sm:px-6 sm:py-2"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            {timeline.map((item, index) => (
              <li
                key={item.id}
                className="flex gap-3 py-4 sm:gap-4 sm:py-5"
                style={{
                  borderTop: index === 0 ? undefined : `1px solid ${BORDER}`,
                }}
              >
                <TimelineDot kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="break-words text-[14px] font-semibold transition hover:opacity-80 sm:text-[15px]"
                        style={{ color: NAVY }}
                      >
                        {item.title || ACTIVITY_KIND_LABELS[item.kind]}
                      </Link>
                    ) : (
                      <p
                        className="break-words text-[14px] font-semibold sm:text-[15px]"
                        style={{ color: NAVY }}
                      >
                        {item.title || ACTIVITY_KIND_LABELS[item.kind]}
                      </p>
                    )}
                    <time
                      className="shrink-0 text-[12px] tabular-nums"
                      style={{ color: MUTED }}
                      dateTime={item.at}
                    >
                      {formatTimelineWhen(item.at)}
                    </time>
                  </div>
                  <p
                    className="mt-1 break-words text-[13px] leading-5 sm:text-[14px] sm:leading-6"
                    style={{ color: MUTED }}
                  >
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Notes */}
        <section
          id="notes"
          className="mt-10 scroll-mt-24 sm:mt-16"
          aria-labelledby="notes-title"
        >
          <SectionTitle id="notes-title">Notes</SectionTitle>
          <p className="mt-2 text-[13px] leading-5 sm:text-[14px] sm:leading-6" style={{ color: MUTED }}>
            講師メモ
          </p>
          <textarea
            readOnly
            value={client.notes}
            rows={6}
            className="mt-4 w-full resize-none rounded-3xl border bg-[#F8FAFC] px-4 py-3.5 text-[16px] leading-7 outline-none sm:mt-5 sm:px-5 sm:py-4 sm:text-[15px]"
            style={{ borderColor: BORDER, color: NAVY, boxShadow: CARD_SHADOW }}
            aria-label="講師メモ"
          />
        </section>

        {/* Bottom CTA */}
        <section className="mt-12 pb-[calc(var(--sw-beta-chrome-offset)+0.5rem)] sm:mt-20 sm:pb-[calc(var(--sw-beta-chrome-offset)+1rem)]">
          <Link
            href={analysisHref}
            className="flex min-h-14 w-full items-center justify-center rounded-3xl px-6 py-4 text-[1.05rem] font-semibold text-white transition active:opacity-90 sm:min-h-16 sm:px-8 sm:py-5 sm:text-lg sm:hover:opacity-90 sm:active:opacity-100"
            style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
          >
            睡眠分析を開始
          </Link>
        </section>
      </div>
    </main>
  );
}
