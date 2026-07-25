"use client";

import { FormEvent, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";
import type { InvitationRecord } from "@/lib/invitations/types";

/**
 * 認定講師向け: クライアント詳細から招待コード／メールを発行する。
 */
export default function ClientInviteCard({
  clientId,
  clientName,
  initialEmail,
}: {
  clientId: string;
  clientName: string;
  initialEmail?: string;
}) {
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState(initialEmail?.trim() ?? "");
  const [busy, setBusy] = useState(false);
  const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createAndSend = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("招待先メールアドレスを入力してください。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const createRes = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim() || "クライアント",
          clientEmail: trimmed,
          clientId,
        }),
      });
      const createJson = (await createRes.json()) as {
        invitation?: InvitationRecord;
        error?: string;
      };
      if (!createRes.ok || !createJson.invitation) {
        throw new Error(createJson.error ?? "招待の作成に失敗しました");
      }

      const sendRes = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          id: createJson.invitation.id,
        }),
      });
      const sendJson = (await sendRes.json()) as {
        invitation?: InvitationRecord;
        error?: string;
      };
      if (!sendRes.ok || !sendJson.invitation) {
        throw new Error(sendJson.error ?? "招待メールの送信に失敗しました");
      }

      setInvitation(sendJson.invitation);
      success("招待コードを発行しました。リンクをコピーして共有できます");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "招待の発行に失敗しました。";
      setError(msg);
      toastError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#8a6a2d]/18 bg-[#fafaf8] px-4 py-4 sm:px-5">
      <p
        className="text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        CLIENT INVITE
      </p>
      <p className="mt-2 text-[14px] leading-7 text-slate-600">
        認定講師のみが招待コードと招待メールを発行できます。
      </p>
      {invitation ? (
        <div className="mt-4">
          <p className="text-[13px] font-semibold" style={{ color: SUCCESS }}>
            コード: {invitation.code}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            受諾URL: /invite/{invitation.code}
          </p>
        </div>
      ) : (
        <form onSubmit={createAndSend} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-500">
              招待メールアドレス
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[16px] outline-none focus:border-[#315f68]/40 focus:ring-2 focus:ring-[#315f68]/15 sm:text-[15px]"
            />
          </label>
          {error ? (
            <p className="text-[13px] text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: NAVY }}
          >
            {busy ? "発行中…" : "招待を発行・送信"}
          </button>
        </form>
      )}
    </div>
  );
}
