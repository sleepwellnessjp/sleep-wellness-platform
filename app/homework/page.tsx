"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import InstructorNav from "@/components/InstructorNav";
import {
  BORDER,
  CARD_SHADOW,
  DANGER,
  GOLD,
  MUTED,
  NAVY,
  SUCCESS,
  SURFACE,
  SURFACE_WARM,
  TEAL,
} from "@/components/ui/tokens";
import {
  formatManagementDate,
  getClientManagementList,
  type ClientManagementItem,
} from "@/lib/client-management";
import {
  clientInitials,
  computeProgressSummary,
  draftToHomeworkItem,
  emptyFollowUpDraft,
  emptyHomeworkDraft,
  FOLLOW_UP_METHOD_LABELS,
  formatHomeworkDate,
  getHomeworkFollowUp,
  addFollowUpRecord,
  saveHomeworkList,
  HOMEWORK_FREQUENCY_LABELS,
  HOMEWORK_PRIORITY_LABELS,
  HOMEWORK_STATUS_LABELS,
  type FollowUpRecord,
  type HomeworkFollowUpPageData,
  type HomeworkFrequency,
  type HomeworkItem,
  type HomeworkItemStatus,
  type HomeworkPriority,
  type NewFollowUpDraft,
  type NewHomeworkDraft,
} from "@/lib/homework-followup";
import { userMessageFromUnknown } from "@/lib/data-access-errors";
import ErrorState from "@/components/ui/ErrorState";

const inputClass =
  "mt-2.5 box-border w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

const textareaClass =
  "mt-2.5 box-border w-full max-w-full min-w-0 resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

const labelClass =
  "text-[11px] font-medium tracking-[0.1em] text-slate-500";

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

function StatusBadge({ status }: { status: HomeworkItemStatus }) {
  const styles =
    status === "completed"
      ? { color: SUCCESS, background: "rgba(15, 107, 92, 0.1)" }
      : status === "active"
        ? { color: TEAL, background: "rgba(49, 95, 104, 0.12)" }
        : status === "overdue"
          ? { color: DANGER, background: "rgba(163, 58, 58, 0.1)" }
          : { color: MUTED, background: "rgba(100, 116, 139, 0.1)" };

  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[10px] font-semibold tracking-[0.06em]"
      style={{ color: styles.color, background: styles.background }}
    >
      {HOMEWORK_STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: HomeworkPriority }) {
  const styles =
    priority === "high"
      ? { color: DANGER, background: "rgba(163, 58, 58, 0.08)" }
      : priority === "medium"
        ? { color: GOLD, background: "rgba(138, 106, 45, 0.1)" }
        : { color: MUTED, background: "rgba(100, 116, 139, 0.1)" };

  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[10px] font-semibold tracking-[0.06em]"
      style={{ color: styles.color, background: styles.background }}
    >
      優先度 {HOMEWORK_PRIORITY_LABELS[priority]}
    </span>
  );
}

function ProgressBar({ rate }: { rate: number }) {
  const clamped = Math.min(100, Math.max(0, rate));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="text-[11px] font-medium tracking-[0.1em]"
          style={{ color: MUTED }}
        >
          進捗率
        </p>
        <p
          className="text-[14px] font-semibold tabular-nums"
          style={{ color: NAVY }}
        >
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
          style={{ width: `${clamped}%`, backgroundColor: TEAL }}
        />
      </div>
    </div>
  );
}

function HomeworkRosterView() {
  const [clients, setClients] = useState<ClientManagementItem[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void (async () => {
      try {
        const result = await getClientManagementList();
        if (!cancelled) setClients(result.clients);
      } catch (error) {
        if (!cancelled) {
          setLoadError(userMessageFromUnknown(error));
          setClients([]);
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
      <InstructorNav eyebrow="HOMEWORK" />
      <div className="mx-auto max-w-3xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:px-10 sm:pb-16 sm:pt-12">
        <header className="mb-8 sm:mb-10">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            HOMEWORK / FOLLOW-UP
          </p>
          <h1
            className="mt-2 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] sm:mt-3 sm:text-4xl"
            style={{ color: NAVY }}
          >
            クライアントを選択
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
            Homeworkを確認・作成する担当クライアントを選んでください。
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
            title="クライアント一覧を表示できません"
            message={loadError}
            kind="supabase"
          />
        ) : clients.length === 0 ? (
          <div className="rounded-3xl border bg-white px-5 py-10 text-center sm:px-8" style={{ borderColor: BORDER }}>
            <p className="text-[15px] font-medium" style={{ color: NAVY }}>
              担当クライアントはまだいません
            </p>
            <p className="mt-2 text-[14px] leading-6 text-slate-500">
              Clientsからクライアントを登録すると、ここでHomeworkを作成できます。
            </p>
            <Link
              href="/clients"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-8 py-3.5 text-[15px] font-semibold text-white transition active:opacity-90 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
              style={{ backgroundColor: NAVY }}
            >
              Clientsへ
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/homework?clientId=${encodeURIComponent(client.id)}`}
                  className="flex flex-col gap-3 rounded-[24px] border border-[#071426]/08 bg-white px-4 py-4 transition hover:border-[#8a6a2d]/30 hover:bg-[#faf7f1]/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
                    style={{ backgroundColor: NAVY }}
                    aria-hidden
                  >
                    {clientInitials(client.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[15px] font-semibold tracking-[-0.02em]"
                      style={{ color: NAVY }}
                    >
                      {client.name}
                    </p>
                    <p className="mt-1 text-[13px] text-slate-500">
                      次回フォロー{" "}
                      {formatManagementDate(client.nextFollowUpDate)}
                    </p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-[11px] tracking-[0.08em] text-slate-400">
                      SCORE
                    </p>
                    <p
                      className="text-[1.35rem] font-semibold tabular-nums tracking-[-0.04em]"
                      style={{ color: NAVY }}
                    >
                      {client.sleepScore ?? "—"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function HomeworkPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId")?.trim() || "";
  const addSectionRef = useRef<HTMLElement | null>(null);

  const [data, setData] = useState<HomeworkFollowUpPageData | null>(null);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [draft, setDraft] = useState<NewHomeworkDraft>(() => emptyHomeworkDraft());
  const [followUpDraft, setFollowUpDraft] = useState<NewFollowUpDraft>(() =>
    emptyFollowUpDraft(),
  );
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setReady(false);
    setLoadError(null);

    void (async () => {
      try {
        const next = await getHomeworkFollowUp(clientId);
        if (cancelled) return;
        setData(next);
        setHomeworks(next.homeworks);
        setFollowUps(next.followUps);
        setFollowUpDraft(emptyFollowUpDraft(next.sleepScore));
      } catch (error) {
        console.error("[homework] getHomeworkFollowUp failed:", error);
        if (!cancelled) {
          setData(null);
          setHomeworks([]);
          setFollowUps([]);
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
    return <HomeworkRosterView />;
  }

  const summary = computeProgressSummary(homeworks);

  function scrollToAddHomework() {
    addSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      document.getElementById("hw-title")?.focus();
    }, 350);
  }

  function updateDraft<K extends keyof NewHomeworkDraft>(
    key: K,
    value: NewHomeworkDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatusMessage(null);
  }

  function updateFollowUpDraft<K extends keyof NewFollowUpDraft>(
    key: K,
    value: NewFollowUpDraft[K],
  ) {
    setFollowUpDraft((current) => ({ ...current, [key]: value }));
    setStatusMessage(null);
  }

  function handleAddHomework(event: FormEvent) {
    event.preventDefault();
    if (!data || !draft.title.trim()) {
      setStatusMessage("課題名を入力してください。");
      return;
    }
    const item = draftToHomeworkItem(data.clientId, draft);
    setHomeworks((current) => [item, ...current]);
    setDraft(emptyHomeworkDraft());
    setStatusMessage("課題をリストに追加しました。保存で確定できます。");
  }

  async function handleSaveHomeworks() {
    if (!data) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const saved = await saveHomeworkList(data.clientId, homeworks);
      setHomeworks(saved);
      setStatusMessage("課題を保存しました");
    } catch (error) {
      console.error("[homework] save failed:", error);
      setStatusMessage(userMessageFromUnknown(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFollowUp() {
    if (!data) return;
    if (!followUpDraft.clientChange.trim() && !followUpDraft.instructorFinding.trim()) {
      setStatusMessage("クライアントの変化または講師所見を入力してください。");
      return;
    }
    setAddingFollowUp(true);
    setStatusMessage(null);
    try {
      const record = await addFollowUpRecord(data.clientId, followUpDraft);
      setFollowUps((current) => [record, ...current]);
      setFollowUpDraft(emptyFollowUpDraft(data.sleepScore));
      setStatusMessage("フォロー記録を追加しました");
    } catch (error) {
      console.error("[homework] follow-up add failed:", error);
      setStatusMessage(userMessageFromUnknown(error));
    } finally {
      setAddingFollowUp(false);
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
        <InstructorNav eyebrow="HOMEWORK" />
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
        <InstructorNav eyebrow="HOMEWORK" />
        <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-0">
          <ErrorState
            title="Homeworkを表示できません"
            message={
              loadError ||
              "クライアント詳細から再度お試しください。"
            }
            kind="supabase"
          />
          <Link
            href="/homework"
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-8 py-3.5 text-[15px] font-semibold text-white transition active:opacity-90 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
            style={{ backgroundColor: NAVY }}
          >
            クライアントを選択
          </Link>
          <Link
            href="/clients"
            className="mt-3 inline-flex min-h-11 items-center justify-center text-[14px] font-medium transition active:opacity-70"
            style={{ color: MUTED }}
          >
            ← Clients一覧へ
          </Link>
        </div>
      </main>
    );
  }

  const backHref = `/clients/${encodeURIComponent(data.clientId)}`;
  const journeyHref = `/journey?clientId=${encodeURIComponent(data.clientId)}`;

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: SURFACE, color: NAVY }}>
      <InstructorNav eyebrow="HOMEWORK" />

      <div className="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-16 sm:pb-16 lg:py-20 lg:pb-20">
        <div className="mb-6 flex flex-wrap items-center gap-3 sm:mb-8 sm:gap-4">
          <Link
            href={backHref}
            className="inline-flex min-h-10 items-center text-[13px] font-medium transition active:opacity-70 sm:hover:opacity-70 sm:active:opacity-100"
            style={{ color: MUTED }}
          >
            ← Client Detail
          </Link>
          <span style={{ color: "rgba(100, 116, 139, 0.35)" }} aria-hidden>
            /
          </span>
          <Link
            href={journeyHref}
            className="inline-flex min-h-10 items-center text-[13px] font-medium transition active:opacity-70 sm:hover:opacity-70 sm:active:opacity-100"
            style={{ color: MUTED }}
          >
            Sleep Journey
          </Link>
        </div>

        <header className="mb-8 min-w-0 sm:mb-12">
          <p
            className="text-[10px] font-semibold tracking-[0.22em] sm:text-[11px] sm:tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            HOMEWORK / FOLLOW-UP
          </p>
          <h1
            className="mt-2 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] sm:mt-3 sm:text-4xl sm:leading-normal"
            style={{ color: NAVY }}
          >
            Homework
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-600 sm:mt-3 sm:text-[15px] sm:leading-7">
            認定講師が課題を設定し、実施状況とフォローを記録する画面です。
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
                  <dt className={labelClass} style={{ color: MUTED }}>
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
                  <dt className={labelClass} style={{ color: MUTED }}>
                    次回フォロー日
                  </dt>
                  <dd className="mt-1 break-words text-[15px] font-medium">
                    {formatHomeworkDate(data.nextFollowUpDate)}
                  </dd>
                </div>
                <div className="min-w-0 sm:col-span-2">
                  <dt className={labelClass} style={{ color: MUTED }}>
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

        {/* ② Homework List */}
        <section className="mt-10 sm:mt-16" aria-labelledby="list-title">
          <SectionTitle id="list-title" eyebrow="LIST">
            Homework List
          </SectionTitle>

          {homeworks.length === 0 ? (
            <div
              className="rounded-3xl border bg-white px-5 py-10 text-center sm:px-8 sm:py-12"
              style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
            >
              <p
                className="text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
                style={{ color: NAVY }}
              >
                Homeworkはまだ登録されていません
              </p>
              <p className="mt-2 text-[14px] leading-6 text-slate-500">
                最初の課題を作成して、クライアントの実践をサポートしましょう。
              </p>
              <button
                type="button"
                onClick={scrollToAddHomework}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-8 py-3.5 text-[15px] font-semibold text-white transition active:opacity-90 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
                style={{ backgroundColor: NAVY }}
              >
                Homeworkを作成
              </button>
            </div>
          ) : (
            <ul className="space-y-3 sm:space-y-4">
              {homeworks.map((item) => (
                <li key={item.id} className="min-w-0">
                  <article
                    className="rounded-3xl border bg-white p-4 sm:p-6"
                    style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
                  >
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <h3
                          className="break-words text-[1rem] font-semibold tracking-[-0.03em] sm:text-[1.05rem]"
                          style={{ color: NAVY }}
                        >
                          {item.title}
                        </h3>
                        <p className="mt-2 break-words text-[14px] leading-6 text-slate-600 sm:leading-7 sm:text-[15px]">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={item.status} />
                        <PriorityBadge priority={item.priority} />
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                      <div
                        className="min-w-0 rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5"
                        style={{ backgroundColor: SURFACE_WARM }}
                      >
                        <dt
                          className="text-[10px] font-semibold tracking-[0.14em]"
                          style={{ color: MUTED }}
                        >
                          開始日
                        </dt>
                        <dd className="mt-1 break-words text-[14px] font-medium">
                          {formatHomeworkDate(item.startDate)}
                        </dd>
                      </div>
                      <div
                        className="min-w-0 rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5"
                        style={{ backgroundColor: SURFACE_WARM }}
                      >
                        <dt
                          className="text-[10px] font-semibold tracking-[0.14em]"
                          style={{ color: MUTED }}
                        >
                          期限
                        </dt>
                        <dd className="mt-1 break-words text-[14px] font-medium">
                          {formatHomeworkDate(item.dueDate)}
                        </dd>
                      </div>
                      <div
                        className="min-w-0 rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5"
                        style={{ backgroundColor: SURFACE_WARM }}
                      >
                        <dt
                          className="text-[10px] font-semibold tracking-[0.14em]"
                          style={{ color: MUTED }}
                        >
                          実施頻度
                        </dt>
                        <dd className="mt-1 break-words text-[14px] font-medium">
                          {HOMEWORK_FREQUENCY_LABELS[item.frequency]}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 sm:mt-5">
                      <ProgressBar rate={item.progressRate} />
                    </div>

                    {item.instructorComment ? (
                      <div className="mt-4 min-w-0 sm:mt-5">
                        <p
                          className="text-[11px] font-medium tracking-[0.1em]"
                          style={{ color: MUTED }}
                        >
                          講師コメント
                        </p>
                        <p className="mt-2 break-words text-[14px] leading-6 text-slate-600 sm:leading-7 sm:text-[15px]">
                          {item.instructorComment}
                        </p>
                      </div>
                    ) : null}

                    {item.clientMessage ? (
                      <div
                        className="mt-4 min-w-0 rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5"
                        style={{ backgroundColor: "rgba(49, 95, 104, 0.06)" }}
                      >
                        <p
                          className="text-[10px] font-semibold tracking-[0.14em]"
                          style={{ color: TEAL }}
                        >
                          クライアントへのメッセージ
                        </p>
                        <p className="mt-1.5 break-words text-[14px] leading-6 text-slate-700">
                          {item.clientMessage}
                        </p>
                      </div>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ③ Add Homework */}
        <section
          ref={addSectionRef}
          id="add-homework"
          className="mt-10 scroll-mt-24 sm:mt-16"
          aria-labelledby="add-title"
        >
          <div
            className="rounded-3xl border bg-white p-4 sm:p-8"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <SectionTitle id="add-title" eyebrow="ADD">
              Add Homework
            </SectionTitle>

            <form onSubmit={handleAddHomework} className="space-y-4 sm:space-y-5">
              <div className="min-w-0">
                <label htmlFor="hw-title" className={labelClass}>
                  課題名
                </label>
                <input
                  id="hw-title"
                  type="text"
                  value={draft.title}
                  onChange={(e) => updateDraft("title", e.target.value)}
                  placeholder="例：23:30までに就寝"
                  className={inputClass}
                  required
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="hw-description" className={labelClass}>
                  説明
                </label>
                <textarea
                  id="hw-description"
                  value={draft.description}
                  onChange={(e) => updateDraft("description", e.target.value)}
                  placeholder="実施内容・ポイントを記入"
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div className="min-w-0">
                  <label htmlFor="hw-start" className={labelClass}>
                    開始日
                  </label>
                  <input
                    id="hw-start"
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => updateDraft("startDate", e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="hw-due" className={labelClass}>
                    期限
                  </label>
                  <input
                    id="hw-due"
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => updateDraft("dueDate", e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div className="min-w-0">
                  <label htmlFor="hw-frequency" className={labelClass}>
                    頻度
                  </label>
                  <select
                    id="hw-frequency"
                    value={draft.frequency}
                    onChange={(e) =>
                      updateDraft(
                        "frequency",
                        e.target.value as HomeworkFrequency,
                      )
                    }
                    className={inputClass}
                  >
                    {(
                      Object.keys(
                        HOMEWORK_FREQUENCY_LABELS,
                      ) as HomeworkFrequency[]
                    ).map((key) => (
                      <option key={key} value={key}>
                        {HOMEWORK_FREQUENCY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor="hw-priority" className={labelClass}>
                    優先度
                  </label>
                  <select
                    id="hw-priority"
                    value={draft.priority}
                    onChange={(e) =>
                      updateDraft("priority", e.target.value as HomeworkPriority)
                    }
                    className={inputClass}
                  >
                    {(
                      Object.keys(HOMEWORK_PRIORITY_LABELS) as HomeworkPriority[]
                    ).map((key) => (
                      <option key={key} value={key}>
                        {HOMEWORK_PRIORITY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="min-w-0">
                <label htmlFor="hw-message" className={labelClass}>
                  クライアントへのメッセージ
                </label>
                <textarea
                  id="hw-message"
                  value={draft.clientMessage}
                  onChange={(e) => updateDraft("clientMessage", e.target.value)}
                  placeholder="励ましや注意点を伝えます"
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border px-6 py-3.5 text-[15px] font-semibold transition active:bg-slate-50 sm:w-auto sm:hover:bg-slate-50 sm:active:bg-transparent"
                style={{ borderColor: BORDER, color: NAVY }}
              >
                リストに追加
              </button>
            </form>
          </div>
        </section>

        {/* ④ Follow-up Record */}
        <section className="mt-10 sm:mt-16" aria-labelledby="followup-title">
          <div
            className="rounded-3xl border bg-white p-4 sm:p-8"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <SectionTitle id="followup-title" eyebrow="FOLLOW-UP">
              Follow-up Record
            </SectionTitle>

            <div className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div className="min-w-0">
                  <label htmlFor="fu-date" className={labelClass}>
                    実施日
                  </label>
                  <input
                    id="fu-date"
                    type="date"
                    value={followUpDraft.conductedAt}
                    onChange={(e) =>
                      updateFollowUpDraft("conductedAt", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="fu-method" className={labelClass}>
                    実施方法
                  </label>
                  <select
                    id="fu-method"
                    value={followUpDraft.method}
                    onChange={(e) =>
                      updateFollowUpDraft(
                        "method",
                        e.target.value as NewFollowUpDraft["method"],
                      )
                    }
                    className={inputClass}
                  >
                    {(
                      Object.keys(
                        FOLLOW_UP_METHOD_LABELS,
                      ) as Array<keyof typeof FOLLOW_UP_METHOD_LABELS>
                    ).map((key) => (
                      <option key={key} value={key}>
                        {FOLLOW_UP_METHOD_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="min-w-0">
                <label htmlFor="fu-score" className={labelClass}>
                  睡眠スコア
                </label>
                <input
                  id="fu-score"
                  type="number"
                  min={0}
                  max={100}
                  value={followUpDraft.sleepScore}
                  onChange={(e) =>
                    updateFollowUpDraft("sleepScore", e.target.value)
                  }
                  placeholder="72"
                  className={inputClass}
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="fu-change" className={labelClass}>
                  クライアントの変化
                </label>
                <textarea
                  id="fu-change"
                  value={followUpDraft.clientChange}
                  onChange={(e) =>
                    updateFollowUpDraft("clientChange", e.target.value)
                  }
                  placeholder="自覚・生活リズム・症状の変化など"
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="fu-finding" className={labelClass}>
                  講師所見
                </label>
                <textarea
                  id="fu-finding"
                  value={followUpDraft.instructorFinding}
                  onChange={(e) =>
                    updateFollowUpDraft("instructorFinding", e.target.value)
                  }
                  placeholder="観察したポイント・評価"
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <div className="min-w-0">
                <label htmlFor="fu-next" className={labelClass}>
                  次回対応
                </label>
                <textarea
                  id="fu-next"
                  value={followUpDraft.nextAction}
                  onChange={(e) =>
                    updateFollowUpDraft("nextAction", e.target.value)
                  }
                  placeholder="次回セッションまでのアクション"
                  rows={2}
                  className={textareaClass}
                />
              </div>
            </div>

            {followUps.length > 0 ? (
              <div className="mt-6 space-y-3 border-t pt-6 sm:mt-8 sm:space-y-4 sm:pt-8" style={{ borderColor: BORDER }}>
                <p
                  className="text-[11px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  PAST RECORDS
                </p>
                <ul className="space-y-3">
                  {followUps.map((record) => (
                    <li
                      key={record.id}
                      className="min-w-0 rounded-2xl px-3.5 py-3.5 sm:px-5 sm:py-4"
                      style={{ backgroundColor: SURFACE_WARM }}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
                        <p className="break-words text-[14px] font-semibold" style={{ color: NAVY }}>
                          {formatHomeworkDate(record.conductedAt)}
                        </p>
                        <p className="break-words text-[12px] font-medium" style={{ color: MUTED }}>
                          {FOLLOW_UP_METHOD_LABELS[record.method]}
                          {record.sleepScore != null
                            ? ` · Score ${record.sleepScore}`
                            : ""}
                        </p>
                      </div>
                      {record.clientChange ? (
                        <p className="mt-2 break-words text-[13px] leading-6 text-slate-600">
                          {record.clientChange}
                        </p>
                      ) : null}
                      {record.nextAction ? (
                        <p className="mt-2 break-words text-[12px] font-medium" style={{ color: TEAL }}>
                          次回：{record.nextAction}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        {/* ⑤ Progress Summary */}
        <section className="mt-10 sm:mt-16" aria-labelledby="summary-title">
          <div
            className="rounded-3xl border bg-white p-4 sm:p-8"
            style={{ borderColor: BORDER, boxShadow: CARD_SHADOW }}
          >
            <SectionTitle id="summary-title" eyebrow="SUMMARY">
              Progress Summary
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
              {(
                [
                  { label: "完了課題", value: String(summary.completedCount) },
                  { label: "継続中", value: String(summary.activeCount) },
                  { label: "未実施", value: String(summary.notStartedCount) },
                  {
                    label: "平均達成率",
                    value: `${summary.averageAchievementRate}%`,
                  },
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

        {/* ⑥ Bottom CTA */}
        <section className="mt-10 sm:mt-16" aria-labelledby="cta-title">
          <h2 id="cta-title" className="sr-only">
            保存とフォロー記録
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleSaveHomeworks()}
              disabled={saving}
              className="flex min-h-14 flex-1 items-center justify-center rounded-2xl px-6 py-4 text-[15px] font-semibold text-white transition active:opacity-90 disabled:opacity-60 sm:hover:opacity-90 sm:active:opacity-100"
              style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
            >
              {saving ? "保存中…" : "課題を保存"}
            </button>
            <button
              type="button"
              onClick={() => void handleAddFollowUp()}
              disabled={addingFollowUp}
              className="flex min-h-14 flex-1 items-center justify-center rounded-2xl border px-6 py-4 text-[15px] font-semibold transition active:bg-slate-50 disabled:opacity-60 sm:hover:bg-slate-50 sm:active:bg-transparent"
              style={{
                borderColor: BORDER,
                color: NAVY,
                backgroundColor: "white",
                boxShadow: CARD_SHADOW,
              }}
            >
              {addingFollowUp ? "追加中…" : "フォロー記録を追加"}
            </button>
          </div>
          {statusMessage ? (
            <p
              className="mt-3 break-words text-center text-[13px] font-medium"
              style={{
                color:
                  /しました|できます/.test(statusMessage) &&
                  !/失敗|エラー/.test(statusMessage)
                    ? SUCCESS
                    : DANGER,
              }}
              role="status"
            >
              {statusMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function HomeworkPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
          <InstructorNav eyebrow="HOMEWORK" />
          <div className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-4 sm:px-6">
            <p className="text-sm text-slate-500">読み込み中...</p>
          </div>
        </main>
      }
    >
      <HomeworkPageContent />
    </Suspense>
  );
}
