"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { NAVY } from "@/components/ui/tokens";
import {
  NAVIGATOR_APPLICATION_STATUSES,
  navigatorCohortLabel,
  navigatorInviteLabel,
  navigatorStatusLabel,
  type NavigatorApplicationRecord,
  type NavigatorApplicationStatus,
  type NavigatorInviteAttempt,
} from "@/lib/navigator/application-types";

type TabKey = NavigatorApplicationStatus;

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ja-JP");
}

export default function AdminNavigatorApplicationsPage() {
  const [applications, setApplications] = useState<NavigatorApplicationRecord[]>(
    [],
  );
  const [tab, setTab] = useState<TabKey>("submitted");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { status: NavigatorApplicationStatus; reviewMemo: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/navigator-applications", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        applications?: NavigatorApplicationRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "取得に失敗しました");
      }
      const next = json.applications ?? [];
      setApplications(next);
      setDrafts(
        Object.fromEntries(
          next.map((item) => [
            item.id,
            { status: item.status, reviewMemo: item.reviewMemo },
          ]),
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const tally = {
      submitted: 0,
      awaiting_payment: 0,
      approved: 0,
      rejected: 0,
    };
    for (const item of applications) tally[item.status] += 1;
    return tally;
  }, [applications]);

  const visible = applications.filter((item) => item.status === tab);

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setActingId(id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/navigator-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: draft.status,
          reviewMemo: draft.reviewMemo,
        }),
      });
      const json = (await response.json()) as {
        error?: string;
        application?: NavigatorApplicationRecord;
        inviteAttempt?: NavigatorInviteAttempt;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "更新に失敗しました");
      }
      setMessage(saveMessage(json.inviteAttempt, json.application));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminShell
      title="ナビゲーター申請"
      description="睡眠ウェルネスナビゲーターの申請を確認し、状態と審査メモを更新します。"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {NAVIGATOR_APPLICATION_STATUSES.map((item) => (
          <TabButton
            key={item.value}
            active={tab === item.value}
            onClick={() => setTab(item.value)}
            label={`${item.label} (${counts[item.value]})`}
          />
        ))}
      </div>

      {message && (
        <p className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      )}

      <SectionCard title={`${navigatorStatusLabel(tab)}の申請`}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500">この状態の申請はありません</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => {
              const draft = drafts[item.id] ?? {
                status: item.status,
                reviewMemo: item.reviewMemo,
              };
              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-[#fafaf8] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold" style={{ color: NAVY }}>
                        {item.nameKanji}
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          {item.nameKana}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {item.email} / {item.phone}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        振込名義: {item.payerNameKana || "—"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {navigatorCohortLabel(item.cohort)} / 修了日{" "}
                        {formatDate(item.completionDate)} / {item.region}
                      </p>
                      {navigatorInviteLabel(item.inviteStatus, item.inviteError) ? (
                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          {navigatorInviteLabel(item.inviteStatus, item.inviteError)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[12px] text-slate-400">
                        申請: {formatDateTime(item.submittedAt)}
                        {item.paymentConfirmedAt
                          ? ` / 入金確認: ${formatDateTime(item.paymentConfirmedAt)}`
                          : ""}
                        {item.approvedAt
                          ? ` / 承認: ${formatDateTime(item.approvedAt)}`
                          : ""}
                      </p>
                      <Detail label="現在の指導状況" text={item.teachingStatus} />
                      <Detail label="志望動機" text={item.motivation} />
                      <Detail label="活動予定" text={item.activityPlan} />
                      {item.note ? <Detail label="備考" text={item.note} /> : null}
                    </div>

                    <div className="flex w-full shrink-0 flex-col gap-2 lg:w-64">
                      <label className="text-[12px] font-semibold text-slate-500">
                        状態
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...draft,
                                status: event.target
                                  .value as NavigatorApplicationStatus,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                        >
                          {NAVIGATOR_APPLICATION_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <textarea
                        value={draft.reviewMemo}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...draft,
                              reviewMemo: event.target.value,
                            },
                          }))
                        }
                        rows={3}
                        maxLength={2000}
                        placeholder="審査メモ"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                      />
                      <Button
                        type="button"
                        variant="primary"
                        className="min-h-11 w-full"
                        disabled={actingId === item.id}
                        onClick={() => void save(item.id)}
                      >
                        保存
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </AdminShell>
  );
}

function saveMessage(
  attempt: NavigatorInviteAttempt | undefined,
  application: NavigatorApplicationRecord | undefined,
): string {
  if (attempt === "sent") return "招待メールを送信しました";
  if (attempt === "existing_account") {
    return "既存アカウントのため、招待メールは送っていません";
  }
  if (attempt === "failed") {
    return application?.inviteError
      ? `招待メールを送れませんでした。${application.inviteError}`
      : "招待メールを送れませんでした";
  }
  return "申請を更新しました";
}

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
      <span className="font-semibold text-slate-500">{label}: </span>
      {text}
    </p>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "text-white" : "border border-slate-200 bg-white text-slate-600"
      }`}
      style={active ? { backgroundColor: NAVY } : undefined}
    >
      {label}
    </button>
  );
}
