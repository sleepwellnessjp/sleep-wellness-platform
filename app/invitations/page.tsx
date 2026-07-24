"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import OsShell from "@/components/os/OsShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import {
  INVITATION_STATUS_LABELS,
} from "@/lib/invitations/constants";
import type { InvitationRecord } from "@/lib/invitations/types";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import { normalizeOsRole, type OsRole } from "@/lib/os/roles";

export default function InvitationsPage() {
  const { isDemoMode } = useAuth();
  const { data, loading: profileLoading } = usePlatformMe();
  const role: OsRole = normalizeOsRole(data?.profile.role ?? "instructor");
  const { success, error: toastError } = useToast();

  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const canEdit = role === "instructor" || isDemoMode;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/invitations", { cache: "no-store" });
      const json = (await response.json()) as {
        invitations?: InvitationRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setInvitations(json.invitations ?? []);
    } catch (err) {
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
    if (!canEdit) {
      toastError("認定講師のみ招待を発行できます");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, clientEmail }),
      });
      const json = (await response.json()) as {
        invitation?: InvitationRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "作成に失敗しました");
      setClientName("");
      setClientEmail("");
      success("招待を作成しました");
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (id: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", id }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "送信に失敗しました");
      success("招待メールを送信しました（モック）");
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const revokeInvite = async (id: string) => {
    setBusy(true);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", id }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "取消に失敗しました");
      success("招待を取り消しました");
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "取消に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OsShell
      role={role}
      eyebrow="INVITATIONS"
      contentClassName="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14"
    >
      <header className="mb-8 sm:mb-10">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          INVITATIONS
        </p>
        <h1
          className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-[1.85rem]"
          style={{ color: NAVY }}
        >
          クライアント招待
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-7 text-slate-500">
          認定講師のみが招待コードと招待メールを発行できます。
        </p>
      </header>

      {!canEdit ? (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          この画面の編集は認定講師のみ可能です。
        </p>
      ) : null}

      <SectionCard eyebrow="NEW" title="招待を発行">
        <form onSubmit={createInvite} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-500">
              クライアント氏名
            </span>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              disabled={!canEdit || busy}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[16px] outline-none focus:border-[#315f68]/40 sm:text-[15px]"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-500">
              メールアドレス
            </span>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              required
              disabled={!canEdit || busy}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[16px] outline-none focus:border-[#315f68]/40 sm:text-[15px]"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!canEdit || busy}>
              招待コードを発行
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard className="mt-6" eyebrow="LIST" title="発行済み招待">
        {profileLoading || loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-slate-500">まだ招待はありません。</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="rounded-2xl border border-slate-100 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p
                      className="text-[10px] font-semibold tracking-[0.18em]"
                      style={{ color: GOLD }}
                    >
                      {INVITATION_STATUS_LABELS[inv.status]}
                    </p>
                    <p className="mt-1 font-semibold" style={{ color: NAVY }}>
                      {inv.clientName}
                    </p>
                    <p className="mt-1 text-[13px] text-slate-500">
                      {inv.clientEmail}
                    </p>
                    <p
                      className="mt-2 text-[13px] font-medium"
                      style={{ color: SUCCESS }}
                    >
                      コード: {inv.code}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      有効期限{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {inv.status === "pending" || inv.status === "sent" ? (
                      <>
                        {inv.status === "pending" ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy || !canEdit}
                            onClick={() => void sendInvite(inv.id)}
                          >
                            メール送信
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy || !canEdit}
                          onClick={() => void revokeInvite(inv.id)}
                        >
                          取消
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </OsShell>
  );
}
