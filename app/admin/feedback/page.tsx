"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITIES,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_SEVERITIES,
  FEEDBACK_SEVERITY_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TARGET_SCREEN_LABELS,
} from "@/lib/feedback/constants";
import type {
  FeedbackPriority,
  FeedbackRecord,
  FeedbackStatus,
} from "@/lib/feedback/types";

function formatDateTime(value: string): string {
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

function severityTone(severity: FeedbackRecord["severity"]): string {
  switch (severity) {
    case "urgent":
      return "#a33a3a";
    case "high":
      return "#b45309";
    case "medium":
      return "#315f68";
    default:
      return "#64748b";
  }
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [editStatus, setEditStatus] = useState<FeedbackStatus>("unconfirmed");
  const [editPriority, setEditPriority] = useState<FeedbackPriority>("p2");
  const [editMemo, setEditMemo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        category: categoryFilter,
        severity: severityFilter,
        status: statusFilter,
      });
      const response = await fetch(`/api/admin/feedback?${params}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        feedback?: FeedbackRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      const list = json.feedback ?? [];
      setFeedback(list);
      setSelectedId((prev) => {
        if (prev && list.some((item) => item.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, severityFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => feedback.find((item) => item.id === selectedId) ?? null,
    [feedback, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setEditStatus(selected.status);
    setEditPriority(selected.priority);
    setEditMemo(selected.adminMemo);
  }, [selected]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          status: editStatus,
          priority: editPriority,
          adminMemo: editMemo,
        }),
      });
      const json = (await response.json()) as {
        feedback?: FeedbackRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "更新に失敗しました");
      setMessage("対応状況を更新しました");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      eyebrow="CLOSED BETA · HQ"
      title="Beta フィードバック"
      description="優先度 Critical / High / Medium / Low。対応状況は受付・対応中・保留・完了で管理します。"
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
          aria-label="カテゴリー絞り込み"
        >
          <option value="all">すべてのカテゴリー</option>
          {FEEDBACK_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
          aria-label="重要度絞り込み"
        >
          <option value="all">すべての重要度</option>
          {FEEDBACK_SEVERITIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
          aria-label="対応状況絞り込み"
        >
          <option value="all">すべての対応状況</option>
          {FEEDBACK_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-sm text-[#315f68]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <SectionCard eyebrow="INBOX" title={`一覧（${feedback.length}件）`}>
            {feedback.length === 0 ? (
              <p className="text-sm text-slate-500">該当するフィードバックはありません。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      <th className="py-3 pr-4 font-semibold">登録日時</th>
                      <th className="py-3 pr-4 font-semibold">カテゴリー</th>
                      <th className="py-3 pr-4 font-semibold">画面</th>
                      <th className="py-3 pr-4 font-semibold">評価</th>
                      <th className="py-3 pr-4 font-semibold">優先</th>
                      <th className="py-3 font-semibold">状況</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((item) => {
                      const active = selected?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          className="cursor-pointer border-b border-slate-50 transition hover:bg-[#fafaf8]"
                          style={
                            active
                              ? { backgroundColor: "rgba(138,106,45,0.06)" }
                              : undefined
                          }
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td className="py-3.5 pr-4 whitespace-nowrap text-slate-600">
                            {formatDateTime(item.createdAt)}
                          </td>
                          <td className="py-3.5 pr-4 font-medium text-slate-800">
                            {FEEDBACK_CATEGORY_LABELS[item.category]}
                          </td>
                          <td className="py-3.5 pr-4 text-slate-600">
                            {FEEDBACK_TARGET_SCREEN_LABELS[item.targetScreen]}
                          </td>
                          <td className="py-3.5 pr-4 tabular-nums text-slate-600">
                            {item.usabilityRating != null
                              ? `${item.usabilityRating}/5`
                              : "—"}
                          </td>
                          <td className="py-3.5 pr-4 font-semibold text-slate-700">
                            {FEEDBACK_PRIORITY_LABELS[item.priority]}
                          </td>
                          <td className="py-3.5 text-slate-700">
                            {FEEDBACK_STATUS_LABELS[item.status]}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard eyebrow="DETAIL" title="詳細">
            {!selected ? (
              <p className="text-sm text-slate-500">行を選択してください。</p>
            ) : (
              <div className="space-y-5">
                <div>
                  <p
                    className="text-[11px] font-semibold tracking-[0.18em]"
                    style={{ color: GOLD }}
                  >
                    {FEEDBACK_CATEGORY_LABELS[selected.category]} ·{" "}
                    {FEEDBACK_TARGET_SCREEN_LABELS[selected.targetScreen]}
                  </p>
                  <p
                    className="mt-2 text-[1.05rem] font-semibold leading-7"
                    style={{ color: NAVY }}
                  >
                    {selected.content}
                  </p>
                </div>

                <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-500">登録日時</dt>
                    <dd className="mt-1 text-slate-800">
                      {formatDateTime(selected.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">重要度</dt>
                    <dd
                      className="mt-1 font-semibold"
                      style={{ color: severityTone(selected.severity) }}
                    >
                      {FEEDBACK_SEVERITY_LABELS[selected.severity]}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">
                      使いやすさ評価
                    </dt>
                    <dd className="mt-1 tabular-nums text-slate-800">
                      {selected.usabilityRating != null
                        ? `${selected.usabilityRating} / 5`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">優先順位</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {FEEDBACK_PRIORITY_LABELS[selected.priority]}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-500">送信者</dt>
                    <dd className="mt-1 break-words text-slate-800">
                      {selected.userDisplayName ?? "—"}
                      {selected.userEmail ? ` / ${selected.userEmail}` : ""}
                      <span className="mt-1 block text-[12px] text-slate-400">
                        ID: {selected.userId}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">端末</dt>
                    <dd className="mt-1 text-slate-800">
                      {selected.device || selected.deviceType || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">ブラウザ</dt>
                    <dd className="mt-1 text-slate-800">
                      {selected.browser || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">画面名</dt>
                    <dd className="mt-1 text-slate-800">
                      {selected.screenName || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">アプリ版</dt>
                    <dd className="mt-1 text-slate-800">
                      {selected.appVersion || "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-500">URL</dt>
                    <dd className="mt-1 break-all text-slate-800">
                      {selected.currentUrl || "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-500">再現手順</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-800">
                      {selected.reproductionSteps || "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-500">ブラウザ情報</dt>
                    <dd className="mt-1 break-all text-[12px] text-slate-600">
                      {selected.browserInfo || "—"}
                    </dd>
                  </div>
                </dl>

                <div className="border-t border-slate-100 pt-5">
                  <label className="block text-[13px] font-semibold text-slate-600">
                    対応状況
                    <select
                      value={editStatus}
                      onChange={(event) =>
                        setEditStatus(event.target.value as FeedbackStatus)
                      }
                      className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
                    >
                      {FEEDBACK_STATUSES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-4 block text-[13px] font-semibold text-slate-600">
                    優先順位
                    <select
                      value={editPriority}
                      onChange={(event) =>
                        setEditPriority(event.target.value as FeedbackPriority)
                      }
                      className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
                    >
                      {FEEDBACK_PRIORITIES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-4 block text-[13px] font-semibold text-slate-600">
                    管理者メモ
                    <textarea
                      value={editMemo}
                      onChange={(event) => setEditMemo(event.target.value)}
                      className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                      placeholder="対応メモを入力"
                      maxLength={5000}
                    />
                  </label>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={saving}
                      onClick={() => void save()}
                    >
                      {saving ? "保存中…" : "対応状況を更新"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={saving}
                      onClick={() => {
                        setEditStatus("resolved");
                        void (async () => {
                          if (!selected) return;
                          setSaving(true);
                          setMessage(null);
                          try {
                            const response = await fetch("/api/admin/feedback", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                id: selected.id,
                                status: "resolved",
                                priority: editPriority,
                                adminMemo: editMemo,
                              }),
                            });
                            const json = (await response.json()) as {
                              error?: string;
                            };
                            if (!response.ok) {
                              throw new Error(json.error ?? "更新に失敗しました");
                            }
                            setMessage("対応完了に更新しました");
                            await load();
                          } catch (error) {
                            setMessage(
                              error instanceof Error
                                ? error.message
                                : "更新に失敗しました",
                            );
                          } finally {
                            setSaving(false);
                          }
                        })();
                      }}
                    >
                      対応完了にする
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </AdminShell>
  );
}
