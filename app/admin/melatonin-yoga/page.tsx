"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import MelatoninYogaApplicationsTab from "@/components/melatonin-yoga/MelatoninYogaApplicationsTab";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  formatSessionDayLineJst,
  isSessionPast,
} from "@/lib/melatonin-yoga/format";
import {
  MELATONIN_YOGA_EVENT_TYPES,
  MELATONIN_YOGA_EVENT_TYPE_LABELS,
  MELATONIN_YOGA_SESSION_FORMAT_LABELS,
  type MelatoninYogaEventType,
  type MelatoninYogaSession,
} from "@/lib/melatonin-yoga/types";

type TabKey = "applications" | "sessions";

const DELETE_BLOCKED_MESSAGE =
  "申し込みがあるため削除できません。非公開か受付終了にしてください";

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-[13px] font-semibold transition ${
        active ? "text-white" : "border border-slate-200 text-slate-600"
      }`}
      style={active ? { backgroundColor: NAVY } : undefined}
    >
      {label}
    </button>
  );
}

function SessionRow({
  session,
  onReload,
  onError,
}: {
  session: MelatoninYogaSession;
  onReload: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const past = isSessionPast(session);

  const patch = async (body: Record<string, unknown>) => {
    const response = await fetch(
      `/api/admin/melatonin-yoga/sessions/${session.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      onError(json.error ?? "更新に失敗しました");
      return;
    }
    await onReload();
  };

  const remove = async () => {
    if (!window.confirm("この開催日程を削除しますか？")) return;
    const response = await fetch(
      `/api/admin/melatonin-yoga/sessions/${session.id}`,
      { method: "DELETE", credentials: "include" },
    );
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      onError(json.error ?? DELETE_BLOCKED_MESSAGE);
      return;
    }
    await onReload();
  };

  return (
    <li
      className={`rounded-2xl border border-slate-100 px-4 py-4 ${
        past ? "opacity-50" : ""
      }`}
    >
      <ul className="space-y-1">
        {(session.days.length > 0
          ? session.days
          : [
              {
                id: `${session.id}-fallback`,
                startsAt: session.startsAt,
                endsAt: session.endsAt ?? session.startsAt,
              },
            ]
        ).map((day) => (
          <li key={day.id} className="font-semibold" style={{ color: NAVY }}>
            {formatSessionDayLineJst(day.startsAt, day.endsAt)}
          </li>
        ))}
      </ul>
      {session.scheduleNote ? (
        <p className="mt-1 text-sm text-slate-500">{session.scheduleNote}</p>
      ) : null}
      <p className="mt-1 text-sm text-slate-600">
        {MELATONIN_YOGA_SESSION_FORMAT_LABELS[session.format]}
        {session.location ? ` ／ ${session.location}` : ""}
      </p>
      {session.feeNote ? (
        <p className="mt-1 text-sm text-slate-600">
          {session.eventType === "training_course" ? "受講料" : "参加費"}：
          {session.feeNote}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-slate-600">
        申込 {session.reservedCount} / 定員 {session.capacity}
        {session.reservedCount >= session.capacity ? (
          <span className="ml-2 font-semibold text-amber-700">満席</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {session.published ? "公開中" : "非公開"}
        {" · "}
        {session.registrationClosed ? "受付終了" : "受付中"}
        {session.eventType === "training_course" && session.archiveAvailable
          ? " · アーカイブ受講可"
          : null}
        {past ? " · 開催済み" : null}
      </p>
      {session.adminNote ? (
        <p className="mt-2 text-xs text-slate-500">メモ: {session.adminNote}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/admin/melatonin-yoga/sessions/${session.id}/edit`}
          className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
          style={{ color: NAVY }}
        >
          編集
        </Link>
        {session.published ? (
          <button
            type="button"
            onClick={() => void patch({ published: false })}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
            style={{ color: NAVY }}
          >
            非公開
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void patch({ published: true })}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
            style={{ color: NAVY }}
          >
            公開
          </button>
        )}
        {session.registrationClosed ? (
          <button
            type="button"
            onClick={() => void patch({ registrationClosed: false })}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
            style={{ color: NAVY }}
          >
            受付再開
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void patch({ registrationClosed: true })}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
            style={{ color: NAVY }}
          >
            受付終了
          </button>
        )}
        <button
          type="button"
          onClick={() => void remove()}
          className="inline-flex min-h-11 items-center rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
        >
          削除
        </button>
      </div>
    </li>
  );
}

function SessionsByType({
  eventType,
  sessions,
  onReload,
  onError,
}: {
  eventType: MelatoninYogaEventType;
  sessions: MelatoninYogaSession[];
  onReload: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const grouped = useMemo(() => {
    const filtered = sessions.filter((item) => item.eventType === eventType);
    const upcoming = filtered
      .filter((item) => !isSessionPast(item))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    const past = filtered
      .filter((item) => isSessionPast(item))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    return { upcoming, past };
  }, [eventType, sessions]);

  if (grouped.upcoming.length === 0 && grouped.past.length === 0) {
    return (
      <p className="mt-3 text-sm text-slate-500">
        {MELATONIN_YOGA_EVENT_TYPE_LABELS[eventType]}の開催日程はまだありません。
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {grouped.upcoming.length > 0 ? (
        <ul className="space-y-3">
          {grouped.upcoming.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onReload={onReload}
              onError={onError}
            />
          ))}
        </ul>
      ) : null}
      {grouped.past.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
            開催済み
          </p>
          <ul className="mt-2 space-y-3">
            {grouped.past.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onReload={onReload}
                onError={onError}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminMelatoninYogaPage() {
  const [tab, setTab] = useState<TabKey>("sessions");
  const [sessions, setSessions] = useState<MelatoninYogaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/melatonin-yoga/sessions", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await response.json()) as {
        sessions?: MelatoninYogaSession[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setSessions(json.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      title="メラトニンヨガ™ 管理"
      description="申込の確認と開催日程の登録・編集を行います。"
      actions={
        tab === "sessions" ? (
          <Link
            href="/admin/melatonin-yoga/sessions/new"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-5 text-[15px] font-semibold text-white sm:w-auto"
            style={{ backgroundColor: NAVY }}
          >
            ＋ 開催日程を登録
          </Link>
        ) : undefined
      }
    >
      <div className="sw-h-scroll -mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
        <TabButton
          active={tab === "applications"}
          label="申し込み一覧"
          onClick={() => setTab("applications")}
        />
        <TabButton
          active={tab === "sessions"}
          label="開催日程"
          onClick={() => setTab("sessions")}
        />
      </div>

      {tab === "applications" ? <MelatoninYogaApplicationsTab /> : null}

      {tab === "sessions" ? (
        <div className="mt-4 space-y-6">
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {loading ? (
            <SectionCard>
              <p className="text-sm text-slate-500">読み込み中…</p>
            </SectionCard>
          ) : (
            MELATONIN_YOGA_EVENT_TYPES.map((eventType) => (
              <SectionCard key={eventType}>
                <h2 className="text-base font-semibold" style={{ color: NAVY }}>
                  {MELATONIN_YOGA_EVENT_TYPE_LABELS[eventType]}
                </h2>
                <SessionsByType
                  eventType={eventType}
                  sessions={sessions}
                  onReload={load}
                  onError={setError}
                />
              </SectionCard>
            ))
          )}
        </div>
      ) : null}
    </AdminShell>
  );
}
