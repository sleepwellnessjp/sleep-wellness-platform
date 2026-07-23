"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import InstructorNav from "@/components/InstructorNav";
import {
  BORDER,
  CARD_SHADOW,
  MUTED,
  NAVY,
  SURFACE,
} from "@/components/ui/tokens";
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
      className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
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
        className="inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-[14px] font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2.5 text-[14px] font-semibold transition hover:bg-slate-50"
      style={{ borderColor: BORDER, color: NAVY }}
    >
      {label}
    </Link>
  );
}

function MetricCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-[#F8FAFC] px-4 py-4 text-center sm:px-5"
      style={{ borderColor: BORDER }}
    >
      <p
        className="text-[11px] font-medium tracking-[0.1em]"
        style={{ color: MUTED }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-[1.15rem] font-semibold tracking-[-0.03em] tabular-nums sm:text-[1.25rem]"
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
      className="rounded-3xl border bg-white px-5 py-6 text-center sm:px-6"
      style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
    >
      <p
        className="text-[11px] font-medium tracking-[0.12em]"
        style={{ color: MUTED }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] tabular-nums sm:text-[2.25rem]"
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

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    void (async () => {
      try {
        const next = id ? await getClientDetail(id) : null;
        if (!cancelled) setClient(next);
      } catch (error) {
        console.error("[clients/id] getClientDetail failed:", error);
        if (!cancelled) setClient(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const analysisHref = `/analysis?clientId=${encodeURIComponent(id)}`;
  const journeyHref = `/journey?clientId=${encodeURIComponent(id)}`;
  const reportHref = `/reports`;
  const homeworkHref = `/homework?clientId=${encodeURIComponent(id)}`;

  if (!ready) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="CLIENT" />
        <div
          className="mx-auto max-w-3xl space-y-4 px-6 py-16 sm:px-10"
          aria-busy="true"
          aria-label="読み込み中"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="CLIENT" />
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <h1
            className="text-2xl font-semibold tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            クライアントが見つかりません
          </h1>
          <p className="mt-3 text-[15px] leading-7" style={{ color: MUTED }}>
            一覧から再度選択してください。
          </p>
          <Link
            href="/clients"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl px-8 py-3.5 text-[15px] font-semibold text-white transition hover:opacity-90"
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

      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
        <div className="mb-8">
          <Link
            href="/clients"
            className="text-[13px] font-medium transition hover:opacity-70"
            style={{ color: MUTED }}
          >
            ← Client Management
          </Link>
        </div>

        {/* Client Profile */}
        <section
          className="rounded-3xl border bg-white p-6 sm:p-8"
          style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          aria-labelledby="client-profile-title"
        >
          <SectionTitle id="client-profile-title">Client Profile</SectionTitle>

          <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
            <div className="mx-auto shrink-0 sm:mx-0">
              <ProfileAvatar client={client} />
            </div>

            <div className="min-w-0 flex-1">
              <h1
                className="text-[1.75rem] font-semibold tracking-[-0.04em] sm:text-[2.1rem]"
                style={{ color: NAVY }}
              >
                {client.name}
              </h1>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt
                    className="text-[11px] font-medium tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    年齢
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium">
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
                  <dd className="mt-1 text-[15px] font-medium">
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
                  <dd className="mt-1 text-[15px] font-medium">
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
                  <dd className="mt-1 text-[15px] font-medium">
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
                    className="mt-1 text-[2rem] font-semibold tracking-[-0.05em] tabular-nums"
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
        <section className="mt-14 sm:mt-16" aria-labelledby="quick-actions-title">
          <SectionTitle id="quick-actions-title">Quick Actions</SectionTitle>
          <div className="mt-6 flex flex-wrap gap-3">
            <QuickAction href={analysisHref} label="睡眠分析を開始" emphasize />
            <QuickAction href={journeyHref} label="Sleep Journey" />
            <QuickAction href={reportHref} label="AIレポートを見る" />
            <QuickAction href={reportHref} label="PDF出力" />
            <QuickAction href={homeworkHref} label="宿題を追加" />
          </div>
        </section>

        {/* Sleep Score */}
        <section className="mt-14 sm:mt-16" aria-labelledby="sleep-score-title">
          <SectionTitle id="sleep-score-title">Sleep Score</SectionTitle>
          <div
            className="mt-6 rounded-3xl border bg-white p-6 sm:p-8"
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
                className="mt-3 text-[4rem] font-semibold leading-none tracking-[-0.06em] tabular-nums sm:text-[4.5rem]"
                style={{ color: NAVY }}
              >
                {client.sleepScore ?? "—"}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
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
              />
            </div>
          </div>
        </section>

        {/* Progress */}
        <section className="mt-14 sm:mt-16" aria-labelledby="progress-title">
          <SectionTitle id="progress-title">Progress</SectionTitle>
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
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
        <section className="mt-14 sm:mt-16" aria-labelledby="timeline-title">
          <SectionTitle id="timeline-title">Activity Timeline</SectionTitle>
          <ol
            className="mt-6 space-y-0 rounded-3xl border bg-white px-5 py-2 sm:px-6"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            {timeline.map((item, index) => (
              <li
                key={item.id}
                className="flex gap-4 py-5"
                style={{
                  borderTop: index === 0 ? undefined : `1px solid ${BORDER}`,
                }}
              >
                <TimelineDot kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold" style={{ color: NAVY }}>
                      {item.title || ACTIVITY_KIND_LABELS[item.kind]}
                    </p>
                    <time
                      className="text-[12px] tabular-nums"
                      style={{ color: MUTED }}
                      dateTime={item.at}
                    >
                      {formatTimelineWhen(item.at)}
                    </time>
                  </div>
                  <p className="mt-1 text-[14px] leading-6" style={{ color: MUTED }}>
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
          className="mt-14 scroll-mt-24 sm:mt-16"
          aria-labelledby="notes-title"
        >
          <SectionTitle id="notes-title">Notes</SectionTitle>
          <p className="mt-2 text-[14px] leading-6" style={{ color: MUTED }}>
            講師メモ
          </p>
          <textarea
            readOnly
            value={client.notes}
            rows={6}
            className="mt-5 w-full resize-none rounded-3xl border bg-[#F8FAFC] px-5 py-4 text-[15px] leading-7 outline-none"
            style={{ borderColor: BORDER, color: NAVY, boxShadow: CARD_SHADOW }}
            aria-label="講師メモ"
          />
        </section>

        {/* Bottom CTA */}
        <section className="mt-16 pb-8 sm:mt-20">
          <Link
            href={analysisHref}
            className="flex min-h-16 w-full items-center justify-center rounded-3xl px-8 py-5 text-[1.05rem] font-semibold text-white transition hover:opacity-90 sm:text-lg"
            style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
          >
            睡眠分析を開始
          </Link>
        </section>
      </div>
    </main>
  );
}
