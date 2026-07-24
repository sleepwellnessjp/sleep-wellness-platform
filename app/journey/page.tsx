"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import InstructorNav from "@/components/InstructorNav";
import InstructorJourneyRoster from "@/components/journey/InstructorJourneyRoster";
import {
  BORDER,
  CARD_SHADOW,
  GOLD,
  MUTED,
  NAVY,
  SUCCESS,
  SURFACE,
  SURFACE_WARM,
  TEAL,
} from "@/components/ui/tokens";
import type { InstructorJourneyRosterItem } from "@/lib/journey";
import {
  clientInitials,
  formatJourneyDate,
  getSleepJourney,
  saveTodayJourneyRecord,
  type JourneyMilestone,
  type JourneyMission,
  type JourneyTrendPoint,
  type SleepJourneyPageData,
} from "@/lib/sleep-journey";
import { userMessageFromUnknown } from "@/lib/data-access-errors";
import ErrorState from "@/components/ui/ErrorState";

function SectionTitle({
  id,
  eyebrow,
  children,
}: {
  id: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 sm:mb-5 sm:gap-3">
      <h2
        id={id}
        className="min-w-0 break-words text-base font-semibold tracking-[-0.03em] sm:text-xl"
        style={{ color: NAVY }}
      >
        {children}
      </h2>
      <p
        className="shrink-0 text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        {eyebrow}
      </p>
    </div>
  );
}

function ProfileAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
        style={{ backgroundColor: "#F1F5F9" }}
      />
    );
  }

  return (
    <div
      className="flex h-20 w-20 items-center justify-center rounded-full text-[1.35rem] font-semibold tracking-[-0.03em] text-white sm:h-24 sm:w-24 sm:text-[1.6rem]"
      style={{ backgroundColor: NAVY }}
      aria-hidden="true"
    >
      {clientInitials(name)}
    </div>
  );
}

function MilestoneStatus({ status }: { status: JourneyMilestone["status"] }) {
  const styles =
    status === "completed"
      ? { color: SUCCESS, background: "rgba(15, 107, 92, 0.1)", label: "完了" }
      : status === "current"
        ? { color: TEAL, background: "rgba(49, 95, 104, 0.12)", label: "現在" }
        : {
            color: MUTED,
            background: "rgba(100, 116, 139, 0.1)",
            label: "予定",
          };

  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[10px] font-semibold tracking-[0.06em]"
      style={{ color: styles.color, background: styles.background }}
    >
      {styles.label}
    </span>
  );
}

function AchievementBar({ rate }: { rate: number }) {
  const clamped = Math.min(100, Math.max(0, rate));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium tracking-[0.1em]" style={{ color: MUTED }}>
          達成率
        </p>
        <p className="text-[14px] font-semibold tabular-nums" style={{ color: NAVY }}>
          {clamped}%
        </p>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: "rgba(7, 20, 38, 0.06)" }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${clamped}%`,
            backgroundColor: TEAL,
          }}
        />
      </div>
    </div>
  );
}

function ImprovementGraph({ trend }: { trend: JourneyTrendPoint[] }) {
  const w = 640;
  const h = 220;
  const padX = 36;
  const padY = 28;
  const series = [
    { key: "sleepScore" as const, label: "睡眠スコア", color: NAVY },
    { key: "hrv" as const, label: "HRV", color: TEAL },
    { key: "stress" as const, label: "ストレス", color: GOLD },
  ];

  const allValues = trend.flatMap((p) => [p.sleepScore, p.hrv, p.stress]);
  const minY = Math.min(...allValues) - 4;
  const maxY = Math.max(...allValues) + 4;
  const range = maxY - minY || 1;

  function coords(values: number[]) {
    return values.map((value, i) => {
      const x =
        padX +
        (trend.length <= 1 ? 0 : (i / (trend.length - 1)) * (w - padX * 2));
      const y = padY + (1 - (value - minY) / range) * (h - padY * 2);
      return { x, y };
    });
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-3 sm:gap-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="text-[12px] font-medium" style={{ color: MUTED }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 max-w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-[180px] w-full max-w-full sm:h-[240px]"
          role="img"
          aria-label="睡眠スコア・HRV・ストレスの推移"
          preserveAspectRatio="xMidYMid meet"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padY + t * (h - padY * 2);
            return (
              <line
                key={t}
                x1={padX}
                y1={y}
                x2={w - padX}
                y2={y}
                stroke="rgba(15, 23, 42, 0.06)"
                strokeWidth="1"
              />
            );
          })}

          {series.map((s) => {
            const points = coords(trend.map((p) => p[s.key]));
            const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
            return (
              <g key={s.key}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={polyline}
                />
                {points.map((p, i) => (
                  <circle
                    key={`${s.key}-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill="#fff"
                    stroke={s.color}
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}

          {trend.map((p, i) => {
            const x =
              padX +
              (trend.length <= 1
                ? 0
                : (i / (trend.length - 1)) * (w - padX * 2));
            return (
              <text
                key={p.label}
                x={x}
                y={h - 6}
                textAnchor="middle"
                fill={MUTED}
                fontSize="12"
                fontWeight="500"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function JourneyRosterView() {
  const [items, setItems] = useState<InstructorJourneyRosterItem[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void (async () => {
      try {
        const response = await fetch("/api/journey/roster", { cache: "no-store" });
        const json = (await response.json()) as {
          roster?: InstructorJourneyRosterItem[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "取得に失敗しました");
        }
        if (!cancelled) setItems(json.roster ?? []);
      } catch (error) {
        if (!cancelled) {
          setLoadError(userMessageFromUnknown(error));
          setItems([]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <InstructorNav eyebrow="JOURNEY" />
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-10 sm:pt-12">
        <header className="mb-8 sm:mb-10">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS JOURNEY™
          </p>
          <h1
            className="mt-2 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] sm:mt-3 sm:text-4xl"
            style={{ color: NAVY }}
          >
            Journey 進捗一覧
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
            担当クライアント全員のステージ・達成率・継続状況を確認できます。
          </p>
        </header>

        {!ready ? (
          <div className="space-y-3" aria-busy="true" aria-label="読み込み中">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-3xl bg-slate-100"
              />
            ))}
          </div>
        ) : loadError ? (
          <ErrorState
            title="Journey一覧を表示できません"
            message={loadError}
            kind="supabase"
          />
        ) : (
          <InstructorJourneyRoster items={items} />
        )}
      </div>
    </main>
  );
}

function JourneyPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId")?.trim() || "";

  const [data, setData] = useState<SleepJourneyPageData | null>(null);
  const [missions, setMissions] = useState<JourneyMission[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setReady(false);
    setLoadError(null);

    void (async () => {
      try {
        const next = await getSleepJourney(clientId);
        if (cancelled) return;
        setData(next);
        setMissions(next.missions);
      } catch (error) {
        console.error("[journey] getSleepJourney failed:", error);
        if (!cancelled) {
          setData(null);
          setMissions([]);
          setLoadError(userMessageFromUnknown(error));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return <JourneyRosterView />;
  }

  function toggleMission(id: string) {
    setMissions((prev) =>
      prev.map((m) => (m.id === id ? { ...m, done: !m.done } : m)),
    );
    setSavedMessage(null);
  }

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await saveTodayJourneyRecord({
        clientId: data.clientId,
        sleepScore: data.sleepScore,
        instructorComment: data.instructorMessage,
        nextGoal: data.nextGoal,
        missions,
      });
      setSavedMessage("今日の記録を保存しました");
    } catch (error) {
      console.error("[journey] save failed:", error);
      setSavedMessage(userMessageFromUnknown(error));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="JOURNEY" />
        <div
          className="mx-auto max-w-3xl space-y-3 px-4 py-12 sm:space-y-4 sm:px-10 sm:py-16"
          aria-busy="true"
          aria-label="読み込み中"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-100 sm:h-36" />
          ))}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="JOURNEY" />
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-0">
          <ErrorState
            title="Journeyを表示できません"
            message={
              loadError ||
              "クライアント詳細から再度お試しください。"
            }
            kind="supabase"
          />
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

  const backHref = `/clients/${encodeURIComponent(data.clientId)}`;
  const completedMissions = missions.filter((m) => m.done).length;

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: SURFACE, color: NAVY }}>
      <InstructorNav eyebrow="JOURNEY" />

      <div className="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-16 sm:pb-16 lg:py-20 lg:pb-20">
        <div className="mb-6 flex flex-wrap items-center gap-3 sm:mb-8">
          <Link
            href={backHref}
            className="inline-flex min-h-10 items-center text-[13px] font-medium transition active:opacity-70 sm:hover:opacity-70 sm:active:opacity-100"
            style={{ color: MUTED }}
          >
            ← Client Detail
          </Link>
          <Link
            href="/journey"
            className="inline-flex min-h-10 items-center text-[13px] font-medium transition active:opacity-70 sm:hover:opacity-70 sm:active:opacity-100"
            style={{ color: GOLD }}
          >
            Journey 一覧
          </Link>
        </div>

        <header className="mb-8 min-w-0 sm:mb-12">
          <p
            className="text-[10px] font-semibold tracking-[0.22em] sm:text-[11px] sm:tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP JOURNEY
          </p>
          <h1
            className="mt-2 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] sm:mt-3 sm:text-4xl sm:leading-normal"
            style={{ color: NAVY }}
          >
            Sleep Journey
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-600 sm:mt-3 sm:text-[15px] sm:leading-7">
            認定講師とクライアントが、睡眠改善の進捗を共有する画面です。
          </p>
        </header>

        {/* ① Client Header */}
        <section
          className="rounded-3xl border bg-white p-4 sm:p-8"
          style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          aria-labelledby="client-header-title"
        >
          <SectionTitle id="client-header-title" eyebrow="CLIENT">
            Client Header
          </SectionTitle>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="mx-auto shrink-0 sm:mx-0">
              <ProfileAvatar name={data.name} avatarUrl={data.avatarUrl} />
            </div>

            <div className="min-w-0 flex-1">
              <h2
                className="break-words text-center text-[1.35rem] font-semibold tracking-[-0.04em] sm:text-left sm:text-[1.75rem]"
                style={{ color: NAVY }}
              >
                {data.name}
              </h2>

              <dl className="mt-4 grid grid-cols-1 gap-3.5 sm:mt-5 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0">
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
                    {data.sleepScore ?? "—"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt
                    className="text-[11px] font-medium tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    改善開始日
                  </dt>
                  <dd className="mt-1 break-words text-[15px] font-medium">
                    {formatJourneyDate(data.improvementStartedAt)}
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt
                    className="text-[11px] font-medium tracking-[0.1em]"
                    style={{ color: MUTED }}
                  >
                    担当講師
                  </dt>
                  <dd className="mt-1 break-words text-[15px] font-medium">
                    {data.instructorName}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* ② Journey Timeline */}
        <section className="mt-10 sm:mt-16" aria-labelledby="timeline-title">
          <SectionTitle id="timeline-title" eyebrow="TIMELINE">
            Journey Timeline
          </SectionTitle>

          <ol className="relative space-y-3 sm:space-y-4">
            {data.milestones.map((milestone, index) => (
              <li key={milestone.id} className="relative min-w-0 pl-0">
                {index < data.milestones.length - 1 ? (
                  <div
                    className="absolute left-[1.15rem] top-14 bottom-[-1rem] hidden w-px sm:block"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.08)" }}
                    aria-hidden
                  />
                ) : null}

                <article
                  className="relative rounded-3xl border bg-white p-4 sm:p-6"
                  style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="hidden h-2.5 w-2.5 shrink-0 rounded-full sm:block"
                        style={{
                          backgroundColor:
                            milestone.status === "upcoming" ? "#CBD5E1" : TEAL,
                        }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p
                          className="text-[11px] font-medium tracking-[0.12em]"
                          style={{ color: MUTED }}
                        >
                          {formatJourneyDate(milestone.recordedAt)}
                        </p>
                        <h3
                          className="mt-1 break-words text-[1rem] font-semibold tracking-[-0.03em] sm:text-[1.05rem]"
                          style={{ color: NAVY }}
                        >
                          {milestone.label}
                        </h3>
                      </div>
                    </div>
                    <MilestoneStatus status={milestone.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">
                    <div
                      className="min-w-0 rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5"
                      style={{ backgroundColor: SURFACE_WARM }}
                    >
                      <p
                        className="text-[10px] font-semibold tracking-[0.14em]"
                        style={{ color: MUTED }}
                      >
                        睡眠スコア
                      </p>
                      <p
                        className="mt-1 text-xl font-semibold tracking-[-0.04em] tabular-nums sm:text-2xl"
                        style={{ color: NAVY }}
                      >
                        {milestone.sleepScore ?? "—"}
                      </p>
                    </div>
                    <div
                      className="min-w-0 rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5"
                      style={{ backgroundColor: SURFACE_WARM }}
                    >
                      <AchievementBar rate={milestone.achievementRate} />
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-5">
                    <p
                      className="text-[11px] font-medium tracking-[0.1em]"
                      style={{ color: MUTED }}
                    >
                      担当コメント
                    </p>
                    <p className="mt-2 break-words text-[14px] leading-6 text-slate-600 sm:leading-7 sm:text-[15px]">
                      {milestone.instructorComment}
                    </p>
                  </div>

                  <div className="mt-4 sm:mt-5">
                    <p
                      className="text-[11px] font-medium tracking-[0.1em]"
                      style={{ color: MUTED }}
                    >
                      改善ポイント
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {milestone.improvementPoints.map((point) => (
                        <li
                          key={point}
                          className="max-w-full break-words rounded-full px-3 py-1.5 text-[12px] font-medium"
                          style={{
                            color: TEAL,
                            background: "rgba(49, 95, 104, 0.08)",
                          }}
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </section>

        {/* ③ Improvement Graph */}
        <section className="mt-10 sm:mt-16" aria-labelledby="graph-title">
          <div
            className="rounded-3xl border bg-white p-4 sm:p-8"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <SectionTitle id="graph-title" eyebrow="TREND">
              Improvement Graph
            </SectionTitle>
            <p className="mb-4 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
              睡眠スコア・HRV・ストレスの推移（デモデータ）
            </p>
            <ImprovementGraph trend={data.trend} />
          </div>
        </section>

        {/* ④ Today's Mission */}
        <section className="mt-10 sm:mt-16" aria-labelledby="mission-title">
          <div
            className="rounded-3xl border bg-white p-4 sm:p-8"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <SectionTitle id="mission-title" eyebrow="MISSION">
              Today&apos;s Mission
            </SectionTitle>
            <p className="mb-4 text-[13px] text-slate-500 sm:mb-5 sm:text-[14px]">
              今日の課題 {completedMissions}/{missions.length} 完了
            </p>
            <ul className="space-y-2.5">
              {missions.map((mission) => (
                <li key={mission.id} className="min-w-0">
                  <label
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-3.5 transition active:bg-slate-100 sm:px-4 sm:py-3 sm:hover:bg-slate-50 sm:active:bg-transparent"
                    style={{ backgroundColor: SURFACE_WARM }}
                  >
                    <input
                      type="checkbox"
                      checked={mission.done}
                      onChange={() => toggleMission(mission.id)}
                      className="h-5 w-5 shrink-0 rounded border-slate-300 accent-[#315f68] sm:h-4 sm:w-4"
                    />
                    <span
                      className={`min-w-0 break-words text-[15px] leading-6 ${
                        mission.done
                          ? "text-slate-400 line-through"
                          : "text-slate-700"
                      }`}
                    >
                      {mission.title}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ⑤ Instructor Message */}
        <section className="mt-10 sm:mt-16" aria-labelledby="message-title">
          <div
            className="rounded-3xl border bg-white p-4 sm:p-8"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <SectionTitle id="message-title" eyebrow="MESSAGE">
              Instructor Message
            </SectionTitle>
            <div
              className="rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
              style={{ backgroundColor: SURFACE_WARM }}
            >
              <p
                className="break-words text-[11px] font-medium tracking-[0.1em]"
                style={{ color: MUTED }}
              >
                {data.instructorName} より
              </p>
              <p className="mt-3 break-words text-[14px] leading-6 text-slate-700 sm:text-[15px] sm:leading-7">
                {data.instructorMessage}
              </p>
            </div>
          </div>
        </section>

        {/* ⑥ Next Goal */}
        <section className="mt-10 sm:mt-16" aria-labelledby="goal-title">
          <div
            className="rounded-3xl border bg-white p-4 sm:p-8"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <SectionTitle id="goal-title" eyebrow="GOAL">
              Next Goal
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
              {(
                [
                  {
                    label: "睡眠スコア",
                    value: String(data.nextGoal.sleepScore),
                  },
                  {
                    label: "睡眠時間",
                    value: `${data.nextGoal.sleepHours}h`,
                  },
                  { label: "HRV", value: String(data.nextGoal.hrv) },
                  { label: "ストレス", value: String(data.nextGoal.stress) },
                ] as const
              ).map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 rounded-2xl px-2.5 py-3.5 text-center sm:px-4 sm:py-4"
                  style={{ backgroundColor: SURFACE_WARM }}
                >
                  <p
                    className="text-[10px] font-semibold tracking-[0.14em]"
                    style={{ color: MUTED }}
                  >
                    {item.label}
                  </p>
                  <p
                    className="mt-2 break-words text-lg font-semibold tracking-[-0.04em] tabular-nums sm:text-2xl"
                    style={{ color: NAVY }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ⑦ Bottom CTA */}
        <section className="mt-10 sm:mt-16" aria-labelledby="cta-title">
          <h2 id="cta-title" className="sr-only">
            保存
          </h2>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex min-h-14 w-full items-center justify-center rounded-2xl px-6 py-4 text-[15px] font-semibold text-white transition active:opacity-90 disabled:opacity-60 sm:hover:opacity-90 sm:active:opacity-100"
            style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
          >
            {saving ? "保存中…" : "今日の記録を保存"}
          </button>
          <Link
            href={`/homework?clientId=${encodeURIComponent(data.clientId)}`}
            className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl border px-6 py-4 text-[15px] font-semibold transition active:bg-slate-50 sm:hover:bg-slate-50 sm:active:bg-transparent"
            style={{
              borderColor: BORDER,
              color: NAVY,
              backgroundColor: "white",
              boxShadow: CARD_SHADOW,
            }}
          >
            Homework / Follow-up
          </Link>
          {savedMessage ? (
            <p
              className="mt-3 break-words text-center text-[13px] font-medium"
              style={{
                color: savedMessage.includes("失敗") ? "#a33a3a" : SUCCESS,
              }}
              role="status"
            >
              {savedMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function SleepJourneyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
          <InstructorNav eyebrow="JOURNEY" />
          <div
            className="mx-auto max-w-3xl space-y-3 px-4 py-12 sm:space-y-4 sm:px-10 sm:py-16"
            aria-busy="true"
            aria-label="読み込み中"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-3xl bg-slate-100 sm:h-36"
              />
            ))}
          </div>
        </main>
      }
    >
      <JourneyPageContent />
    </Suspense>
  );
}
