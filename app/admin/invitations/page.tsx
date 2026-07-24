"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";
import {
  BETA_INVITATION_STATUS_LABELS,
  todayTokyoDate,
} from "@/lib/closed-beta/beta-invitation-constants";
import type { BetaInstructorInvitation } from "@/lib/closed-beta/beta-invitation-types";

export default function AdminInvitationsPage() {
  const { success, error: toastError } = useToast();
  const [invitations, setInvitations] = useState<BetaInstructorInvitation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [instructorName, setInstructorName] = useState("");
  const [instructorEmail, setInstructorEmail] = useState("");
  const [startDate, setStartDate] = useState(todayTokyoDate());
  const [termsRequired, setTermsRequired] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/beta-invitations", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        invitations?: BetaInstructorInvitation[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setInvitations(json.invitations ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/beta-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorName,
          instructorEmail,
          startDate,
          termsRequired,
        }),
      });
      const json = (await response.json()) as {
        invitation?: BetaInstructorInvitation;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "作成に失敗しました");
      setInstructorName("");
      setInstructorEmail("");
      setStartDate(todayTokyoDate());
      setTermsRequired(true);
      success("認定講師招待を作成しました");
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (id: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/beta-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", id }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "送信に失敗しました");
      success("招待メールを送信しました（モック）");
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const revokeInvite = async (id: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/beta-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", id }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "取消に失敗しました");
      success("招待を取り消しました");
      await load();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "取消に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell
      eyebrow="CLOSED BETA · MODULE 1"
      title="認定講師招待"
      description="Closed Beta 参加のための認定講師招待。メール送信（モック）・招待コード・利用開始日・利用規約同意を管理します。"
    >
      <SectionCard title="招待を作成" className="mb-8">
        <form onSubmit={createInvite} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-500">
                認定講師名
              </span>
              <input
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafaf8] px-3.5 py-3 text-[15px] outline-none focus:border-[#315f68]/40"
                placeholder="山田 太郎"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-500">
                メールアドレス
              </span>
              <input
                type="email"
                value={instructorEmail}
                onChange={(e) => setInstructorEmail(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafaf8] px-3.5 py-3 text-[15px] outline-none focus:border-[#315f68]/40"
                placeholder="instructor@example.com"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-slate-500">
                利用開始日
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafaf8] px-3.5 py-3 text-[15px] outline-none focus:border-[#315f68]/40"
              />
            </label>
            <label className="flex items-end gap-3 pb-3">
              <input
                type="checkbox"
                checked={termsRequired}
                onChange={(e) => setTermsRequired(e.target.checked)}
                className="size-4 rounded border-slate-300"
              />
              <span className="text-[13px] text-slate-600">
                受諾時に利用規約同意を必須にする
              </span>
            </label>
          </div>
          <Button type="submit" disabled={busy}>
            招待を作成
          </Button>
        </form>
      </SectionCard>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : invitations.length === 0 ? (
        <p className="text-sm text-slate-500">認定講師招待はまだありません。</p>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv) => (
            <SectionCard key={inv.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    className="text-[10px] font-semibold tracking-[0.18em]"
                    style={{
                      color:
                        inv.status === "accepted"
                          ? SUCCESS
                          : inv.status === "sent"
                            ? GOLD
                            : NAVY,
                    }}
                  >
                    {BETA_INVITATION_STATUS_LABELS[inv.status]}
                  </p>
                  <p className="mt-1 font-semibold" style={{ color: NAVY }}>
                    {inv.instructorName}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {inv.instructorEmail}
                  </p>
                  <p className="mt-2 text-[12px] text-slate-400">
                    コード {inv.code} · 利用開始日 {inv.startDate}
                    {inv.termsRequired ? " · 規約同意必須" : ""}
                    {inv.termsAcceptedAt ? " · 規約同意済" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inv.status === "draft" || inv.status === "sent" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void sendInvite(inv.id)}
                    >
                      メール送信（モック）
                    </Button>
                  ) : null}
                  {inv.status !== "accepted" && inv.status !== "revoked" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void revokeInvite(inv.id)}
                    >
                      取消
                    </Button>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
