"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { NAVY } from "@/components/ui/tokens";
import { CREDIT_REQUEST_STATUS_LABELS } from "@/lib/platform/credit-pack-constants";
import type { CreditRequestRecord } from "@/lib/platform/credit-request-types";

type TabKey = "pending" | "processed";

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

function formatYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function applicantLabel(item: CreditRequestRecord): string {
  return (
    item.applicantDisplayName ||
    item.applicantEmail ||
    item.userId.slice(0, 8)
  );
}

export default function AdminCreditRequestsPage() {
  const [requests, setRequests] = useState<CreditRequestRecord[]>([]);
  const [tab, setTab] = useState<TabKey>("pending");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [memoById, setMemoById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/credit-requests", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        requests?: CreditRequestRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "取得に失敗しました");
      }
      setRequests(json.requests ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "取得に失敗しました");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => requests.filter((item) => item.status === "pending"),
    [requests],
  );
  const processed = useMemo(
    () =>
      requests.filter(
        (item) => item.status === "approved" || item.status === "rejected",
      ),
    [requests],
  );
  const visible = tab === "pending" ? pending : processed;

  const review = async (id: string, action: "approve" | "reject") => {
    setActingId(id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/credit-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          adminMemo: memoById[id] ?? "",
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "操作に失敗しました");
      }
      setMessage(
        action === "approve"
          ? "承認し、クレジットを付与しました"
          : "申請を却下しました",
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作に失敗しました");
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminShell
      title="追加パック申請"
      description="講師からの振込申請を確認し、承認時にクレジットを付与します。"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton
          active={tab === "pending"}
          onClick={() => setTab("pending")}
          label={`未処理 (${pending.length})`}
        />
        <TabButton
          active={tab === "processed"}
          onClick={() => setTab("processed")}
          label={`処理済み (${processed.length})`}
        />
      </div>

      {message && (
        <p className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      )}

      <SectionCard title={tab === "pending" ? "未処理の申請" : "処理済みの申請"}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500">
            {tab === "pending"
              ? "未処理の申請はありません"
              : "処理済みの申請はありません"}
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-slate-100 bg-[#fafaf8] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold" style={{ color: NAVY }}>
                      {applicantLabel(item)}
                    </p>
                    {item.applicantEmail && item.applicantDisplayName && (
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {item.applicantEmail}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-slate-600">
                      {item.sets}セット — {item.credits}回 /{" "}
                      {formatYen(item.amountYen)}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      申請: {formatDateTime(item.requestedAt)}
                      {item.approvedAt
                        ? ` / 処理: ${formatDateTime(item.approvedAt)}`
                        : ""}
                    </p>
                    {item.note && (
                      <p className="mt-2 text-sm text-slate-600">
                        備考: {item.note}
                      </p>
                    )}
                    <p className="mt-2 text-[12px] font-semibold text-slate-500">
                      {CREDIT_REQUEST_STATUS_LABELS[item.status]}
                    </p>
                  </div>

                  {item.status === "pending" && (
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-56">
                      <textarea
                        value={memoById[item.id] ?? ""}
                        onChange={(event) =>
                          setMemoById((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="管理者メモ（任意）"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="primary"
                          className="min-h-11 w-full"
                          disabled={actingId === item.id}
                          onClick={() => void review(item.id, "approve")}
                        >
                          承認
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-11 w-full"
                          disabled={actingId === item.id}
                          onClick={() => void review(item.id, "reject")}
                        >
                          却下
                        </Button>
                      </div>
                    </div>
                  )}

                  {item.status !== "pending" && item.adminMemo && (
                    <p className="text-sm text-slate-500 sm:max-w-xs">
                      メモ: {item.adminMemo}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </AdminShell>
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
