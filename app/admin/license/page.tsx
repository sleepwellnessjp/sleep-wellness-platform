"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  CERTIFICATION_LEVELS,
  CERTIFICATION_LEVEL_LABELS,
  formatJaDate,
  LICENSE_HISTORY_ACTION_LABELS,
  LICENSE_STATUSES,
  LICENSE_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/license/constants";
import type {
  AdminLicenseAction,
  AdminLicenseListItem,
  CertificationLevel,
  LicenseStatus,
} from "@/lib/license/types";

const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[16px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:text-[15px]";

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

export default function AdminLicensePage() {
  const [licenses, setLicenses] = useState<AdminLicenseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [issueUserId, setIssueUserId] = useState("demo-instructor");
  const [issueEmail, setIssueEmail] = useState("");
  const [issueName, setIssueName] = useState("");
  const [issueLevel, setIssueLevel] =
    useState<CertificationLevel>("instructor");
  const [issueCycle, setIssueCycle] = useState<"yearly" | "monthly">("yearly");
  const [issueMemo, setIssueMemo] = useState("");

  const [editMemo, setEditMemo] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editExpires, setEditExpires] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editCredits, setEditCredits] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        q,
        status: statusFilter,
        level: levelFilter,
      });
      const response = await fetch(`/api/admin/license?${params}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        licenses?: AdminLicenseListItem[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      const list = json.licenses ?? [];
      setLicenses(list);
      setSelectedId((prev) => {
        if (prev && list.some((item) => item.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
      setLicenses([]);
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, levelFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => licenses.find((item) => item.id === selectedId) ?? null,
    [licenses, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setEditMemo(selected.adminMemo);
    setEditNote("");
    setEditExpires(selected.expiresAt);
    setEditHours("");
    setEditCredits("");
  }, [selected]);

  const runAction = async (action?: AdminLicenseAction) => {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/license", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action,
          expiresAt: editExpires || undefined,
          adminMemo: editMemo,
          note: editNote,
          hoursCompleted: editHours === "" ? undefined : Number(editHours),
          creditsEarned: editCredits === "" ? undefined : Number(editCredits),
        }),
      });
      const json = (await response.json()) as {
        license?: unknown;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "更新に失敗しました");
      setMessage(
        action === "renew"
          ? "ライセンスを更新しました"
          : action === "suspend"
            ? "ライセンスを停止しました"
            : action === "revoke"
              ? "ライセンスを失効しました"
              : action === "reactivate"
                ? "ライセンスを再開しました"
                : "保存しました",
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const onIssue = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: issueUserId.trim(),
          userEmail: issueEmail.trim() || null,
          userDisplayName: issueName.trim() || null,
          certificationLevel: issueLevel,
          billingCycle: issueCycle,
          adminMemo: issueMemo,
        }),
      });
      const json = (await response.json()) as {
        license?: { id: string };
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "発行に失敗しました");
      setMessage("ライセンスを発行しました");
      setIssueMemo("");
      await load();
      if (json.license?.id) setSelectedId(json.license.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "発行に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const onExportCsv = () => {
    const params = new URLSearchParams({
      q,
      status: statusFilter,
      level: levelFilter,
      format: "csv",
    });
    window.location.href = `/api/admin/license?${params}`;
  };

  return (
    <AdminShell
      eyebrow="SLEEP WELLNESS OS · ADMIN"
      title="ライセンス管理"
      description="認定講師ライセンスの発行・更新・停止・失効、認定履歴の確認、CSV 出力を行います。"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="氏名・メール・ライセンス番号で検索"
          className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
          aria-label="検索"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
          aria-label="状態絞り込み"
        >
          <option value="all">すべての状態</option>
          {LICENSE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LICENSE_STATUS_LABELS[status as LicenseStatus]}
            </option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-[15px]"
          aria-label="レベル絞り込み"
        >
          <option value="all">すべてのレベル</option>
          {CERTIFICATION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {CERTIFICATION_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" onClick={onExportCsv}>
          CSV 出力
        </Button>
      </div>

      {message ? (
        <p className="mb-4 text-[13px] font-medium" style={{ color: NAVY }}>
          {message}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <SectionCard eyebrow="LIST" title="ライセンス一覧">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : licenses.length === 0 ? (
            <p className="text-[14px] text-slate-500">該当なし</p>
          ) : (
            <ul className="space-y-2">
              {licenses.map((item) => {
                const active = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-[#071426]/30 bg-[#071426]/[0.04]"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p
                          className="text-[14px] font-semibold"
                          style={{ color: NAVY }}
                        >
                          {item.userDisplayName || item.userEmail || "（無名）"}
                        </p>
                        <p className="text-[12px] text-slate-500">
                          {LICENSE_STATUS_LABELS[item.status]}
                        </p>
                      </div>
                      <p className="mt-1 break-all text-[12px] text-slate-500">
                        {item.licenseNumber} ·{" "}
                        {CERTIFICATION_LEVEL_LABELS[item.certificationLevel]}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard eyebrow="DETAIL" title="詳細・操作">
            {!selected ? (
              <p className="text-[14px] text-slate-500">
                左側からライセンスを選択してください。
              </p>
            ) : (
              <div className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["氏名", selected.userDisplayName || "—"],
                    ["メール", selected.userEmail || "—"],
                    ["ユーザー ID", selected.userId],
                    ["ライセンス番号", selected.licenseNumber],
                    [
                      "認定レベル",
                      CERTIFICATION_LEVEL_LABELS[selected.certificationLevel],
                    ],
                    ["状態", LICENSE_STATUS_LABELS[selected.status]],
                    ["認定日", formatJaDate(selected.certifiedAt)],
                    ["有効期限", formatJaDate(selected.expiresAt)],
                    [
                      "プラン",
                      selected.plan
                        ? CERTIFICATION_LEVEL_LABELS[selected.plan]
                        : "—",
                    ],
                    [
                      "サブスク",
                      selected.subscriptionStatus
                        ? SUBSCRIPTION_STATUS_LABELS[
                            selected.subscriptionStatus
                          ]
                        : "—",
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-semibold tracking-[0.12em] text-slate-500">
                        {label}
                      </dt>
                      <dd
                        className="mt-1 break-all text-[14px] font-semibold"
                        style={{ color: NAVY }}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <label className="block text-[13px] font-semibold text-slate-600">
                  有効期限
                  <input
                    type="date"
                    className={inputClass}
                    value={editExpires}
                    onChange={(event) => setEditExpires(event.target.value)}
                  />
                </label>
                <label className="block text-[13px] font-semibold text-slate-600">
                  管理者メモ
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={editMemo}
                    onChange={(event) => setEditMemo(event.target.value)}
                  />
                </label>
                <label className="block text-[13px] font-semibold text-slate-600">
                  操作メモ（履歴）
                  <input
                    className={inputClass}
                    value={editNote}
                    onChange={(event) => setEditNote(event.target.value)}
                    placeholder="任意"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[13px] font-semibold text-slate-600">
                    CE 受講時間
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className={inputClass}
                      value={editHours}
                      onChange={(event) => setEditHours(event.target.value)}
                      placeholder="未変更なら空欄"
                    />
                  </label>
                  <label className="block text-[13px] font-semibold text-slate-600">
                    CE 取得単位
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className={inputClass}
                      value={editCredits}
                      onChange={(event) => setEditCredits(event.target.value)}
                      placeholder="未変更なら空欄"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void runAction("renew")}
                  >
                    更新
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void runAction("suspend")}
                  >
                    停止
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={saving}
                    onClick={() => void runAction("revoke")}
                  >
                    失効
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void runAction("reactivate")}
                  >
                    再開
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => void runAction()}
                  >
                    メモ保存
                  </Button>
                </div>

                <div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: GOLD }}
                  >
                    認定履歴
                  </p>
                  {selected.statusHistory.length === 0 ? (
                    <p className="mt-2 text-[13px] text-slate-500">履歴なし</p>
                  ) : (
                    <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                      {selected.statusHistory.map((entry, index) => (
                        <li
                          key={`${entry.at}-${index}`}
                          className="rounded-xl border border-slate-200/80 bg-[#fafaf8] px-3 py-2.5"
                        >
                          <p className="text-[13px] font-semibold" style={{ color: NAVY }}>
                            {LICENSE_HISTORY_ACTION_LABELS[entry.action] ??
                              entry.action}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-500">
                            {formatDateTime(entry.at)}
                            {entry.actorEmail
                              ? ` · ${entry.actorEmail}`
                              : ""}
                          </p>
                          {entry.note ? (
                            <p className="mt-1 text-[12px] text-slate-600">
                              {entry.note}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard eyebrow="ISSUE" title="ライセンス発行">
            <form onSubmit={onIssue} className="grid gap-3">
              <label className="block text-[13px] font-semibold text-slate-600">
                ユーザー ID
                <input
                  required
                  className={inputClass}
                  value={issueUserId}
                  onChange={(event) => setIssueUserId(event.target.value)}
                  placeholder="profiles.id（UUID）"
                />
              </label>
              <label className="block text-[13px] font-semibold text-slate-600">
                表示名
                <input
                  className={inputClass}
                  value={issueName}
                  onChange={(event) => setIssueName(event.target.value)}
                />
              </label>
              <label className="block text-[13px] font-semibold text-slate-600">
                メール
                <input
                  type="email"
                  className={inputClass}
                  value={issueEmail}
                  onChange={(event) => setIssueEmail(event.target.value)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-slate-600">
                  認定レベル
                  <select
                    className={inputClass}
                    value={issueLevel}
                    onChange={(event) =>
                      setIssueLevel(event.target.value as CertificationLevel)
                    }
                  >
                    {CERTIFICATION_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {CERTIFICATION_LEVEL_LABELS[level]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[13px] font-semibold text-slate-600">
                  請求サイクル
                  <select
                    className={inputClass}
                    value={issueCycle}
                    onChange={(event) =>
                      setIssueCycle(
                        event.target.value as "yearly" | "monthly",
                      )
                    }
                  >
                    <option value="yearly">年額</option>
                    <option value="monthly">月額</option>
                  </select>
                </label>
              </div>
              <label className="block text-[13px] font-semibold text-slate-600">
                管理者メモ
                <textarea
                  className={`${inputClass} min-h-20`}
                  value={issueMemo}
                  onChange={(event) => setIssueMemo(event.target.value)}
                />
              </label>
              <Button type="submit" disabled={saving}>
                発行する
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  );
}
