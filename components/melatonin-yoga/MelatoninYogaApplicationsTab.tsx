"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { NAVY } from "@/components/ui/tokens";
import { formatSessionDayLineJst } from "@/lib/melatonin-yoga/format";
import {
  MELATONIN_YOGA_REGISTRATION_STATUSES,
  registrationStatusLabel,
  type MelatoninYogaRegistrationRecord,
  type MelatoninYogaRegistrationStatus,
} from "@/lib/melatonin-yoga/registration-types";
import {
  MELATONIN_YOGA_EVENT_TYPE_LABELS,
  MELATONIN_YOGA_TRAINING_FORMAT_LABELS,
} from "@/lib/melatonin-yoga/types";

type TabKey = MelatoninYogaRegistrationStatus;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function selectionSummary(
  selection: MelatoninYogaRegistrationRecord["selections"][number],
): string {
  const typeLabel = MELATONIN_YOGA_EVENT_TYPE_LABELS[selection.eventType];
  if (selection.isFlexible) {
    return `${typeLabel}：日程が合わない・個別相談希望`;
  }
  const dayLines =
    selection.sessionDays.length > 0
      ? selection.sessionDays
          .map((day) => formatSessionDayLineJst(day.startsAt, day.endsAt))
          .join(" / ")
      : "日程情報なし";
  return `${typeLabel}：${dayLines}`;
}

export default function MelatoninYogaApplicationsTab() {
  const [registrations, setRegistrations] = useState<
    MelatoninYogaRegistrationRecord[]
  >([]);
  const [tab, setTab] = useState<TabKey>("new");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { status: MelatoninYogaRegistrationStatus; adminMemo: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/melatonin-yoga/registrations", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await response.json()) as {
        registrations?: MelatoninYogaRegistrationRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "取得に失敗しました");
      }
      const next = json.registrations ?? [];
      setRegistrations(next);
      setDrafts(
        Object.fromEntries(
          next.map((item) => [
            item.id,
            { status: item.status, adminMemo: item.adminMemo },
          ]),
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const tally: Record<TabKey, number> = {
      new: 0,
      contacted: 0,
      confirmed: 0,
      cancelled: 0,
    };
    for (const item of registrations) tally[item.status] += 1;
    return tally;
  }, [registrations]);

  const visible = registrations.filter((item) => item.status === tab);

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setActingId(id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/melatonin-yoga/registrations", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: draft.status,
          adminMemo: draft.adminMemo,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "更新に失敗しました");
      }
      setMessage("保存しました");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="sw-h-scroll -mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
        {MELATONIN_YOGA_REGISTRATION_STATUSES.map((item) => (
          <TabButton
            key={item.value}
            active={tab === item.value}
            onClick={() => setTab(item.value)}
            label={`${item.label} (${counts[item.value]})`}
          />
        ))}
      </div>

      {message ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}

      <SectionCard title={`${registrationStatusLabel(tab)}の申込`}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500">この状態の申込はありません</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => {
              const draft = drafts[item.id] ?? {
                status: item.status,
                adminMemo: item.adminMemo,
              };
              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-[#fafaf8] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold" style={{ color: NAVY }}>
                        {item.nameKanji}
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          {item.nameKana}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {item.email} / {item.phone}
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-slate-700">
                        {item.selections.map((selection) => (
                          <li key={`${item.id}-${selection.eventType}`}>
                            {selectionSummary(selection)}
                            {selection.sessionScheduleNote ? (
                              <span className="block text-xs text-slate-500">
                                {selection.sessionScheduleNote}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {item.trainingFormat ? (
                        <p className="mt-2 text-sm text-slate-700">
                          受講形式：{" "}
                          {MELATONIN_YOGA_TRAINING_FORMAT_LABELS[item.trainingFormat]}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-slate-700">
                        ヨガ指導経験：{item.hasYogaExperience ? "ある" : "ない"}
                      </p>
                      {item.message ? (
                        <p className="mt-2 text-sm text-slate-700">
                          質問・相談：{item.message}
                        </p>
                      ) : null}
                      {item.referralSource ? (
                        <p className="mt-1 text-sm text-slate-600">
                          きっかけ：{item.referralSource}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[12px] text-slate-400">
                        申込：{formatDateTime(item.submittedAt)}
                      </p>
                    </div>

                    <div className="w-full shrink-0 space-y-3 lg:w-72">
                      <label className="block text-[12px] font-semibold text-slate-600">
                        状態
                        <select
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                          value={draft.status}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...draft,
                                status: event.target.value as MelatoninYogaRegistrationStatus,
                              },
                            }))
                          }
                        >
                          {MELATONIN_YOGA_REGISTRATION_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-[12px] font-semibold text-slate-600">
                        メモ
                        <textarea
                          rows={3}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          value={draft.adminMemo}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                ...draft,
                                adminMemo: event.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => void save(item.id)}
                        className="min-h-11 w-full rounded-2xl"
                      >
                        {actingId === item.id ? "保存中…" : "保存する"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
