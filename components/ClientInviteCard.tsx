"use client";

import { FormEvent, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";
import { isValidPortalEmail } from "@/lib/repositories/client-mypage-repository";
import type { InvitationRecord } from "@/lib/invitations/types";

function buildInviteUrl(code: string): string {
  if (typeof window === "undefined") return `/invite/${code}`;
  return `${window.location.origin}/invite/${encodeURIComponent(code)}`;
}

/**
 * 認定講師向け: クライアント詳細から招待コードを発行する。
 * メール送信設定が無い場合は送信済みと誤表示せず、URL/コードをコピー可能にする。
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
  const [inviteUrl, setInviteUrl] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "code" | null>(null);

  useEffect(() => {
    setEmail(initialEmail?.trim() ?? "");
  }, [initialEmail, clientId]);

  const copyText = async (value: string, kind: "url" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      success(kind === "url" ? "招待URLをコピーしました" : "招待コードをコピーしました");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toastError("コピーに失敗しました。手動で選択してください。");
    }
  };

  const createAndSend = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("招待先メールアドレスを入力してください。");
      return;
    }
    if (!isValidPortalEmail(trimmed)) {
      setError("メールアドレスの形式が正しくありません。");
      return;
    }
    setBusy(true);
    setError(null);
    setDeliveryNote(null);
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

      const created = createJson.invitation;
      const url = buildInviteUrl(created.code);

      const sendRes = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          id: created.id,
        }),
      });
      const sendJson = (await sendRes.json()) as {
        invitation?: InvitationRecord;
        emailSent?: boolean;
        message?: string;
        error?: string;
      };

      if (!sendRes.ok) {
        // 作成自体は成功しているので、手動共有用に表示する
        setInvitation(created);
        setInviteUrl(url);
        setEmailSent(false);
        setDeliveryNote(
          sendJson.error ??
            "メール送信に失敗しました。招待URLとコードを手動で共有してください。",
        );
        success("招待コードを発行しました");
        return;
      }

      const finalInvitation = sendJson.invitation ?? created;
      const sent = sendJson.emailSent === true;
      setInvitation(finalInvitation);
      setInviteUrl(url);
      setEmailSent(sent);
      setDeliveryNote(
        sendJson.message ??
          (sent
            ? null
            : "メール送信設定が未完了のため、招待URLとコードを手動で共有してください。"),
      );
      success(
        sent
          ? "招待メールを送信しました"
          : "招待コードを発行しました。リンクをコピーして共有できます",
      );
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
        認定講師のみが招待コードを発行できます。メール送信設定が無い場合は URL
        とコードを共有してください。
      </p>
      {invitation ? (
        <div className="mt-4 space-y-3">
          <p className="text-[13px] font-semibold" style={{ color: SUCCESS }}>
            {emailSent ? "招待メールを送信しました" : "招待を発行しました"}
          </p>
          {deliveryNote ? (
            <p className="text-[13px] leading-6 text-amber-800">{deliveryNote}</p>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500">
              招待コード
            </p>
            <p className="mt-1 break-all font-mono text-[15px]" style={{ color: NAVY }}>
              {invitation.code}
            </p>
            <button
              type="button"
              onClick={() => void copyText(invitation.code, "code")}
              className="mt-2 text-[12px] font-semibold text-[#315f68] underline-offset-2 hover:underline"
            >
              {copied === "code" ? "コピー済み" : "コードをコピー"}
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500">
              招待URL
            </p>
            <p className="mt-1 break-all text-[13px] leading-6 text-slate-700">
              {inviteUrl || `/invite/${invitation.code}`}
            </p>
            <button
              type="button"
              onClick={() =>
                void copyText(inviteUrl || buildInviteUrl(invitation.code), "url")
              }
              className="mt-2 text-[12px] font-semibold text-[#315f68] underline-offset-2 hover:underline"
            >
              {copied === "url" ? "コピー済み" : "URLをコピー"}
            </button>
          </div>
          <p className="text-[12px] text-slate-500">
            有効期限:{" "}
            {new Intl.DateTimeFormat("ja-JP", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(invitation.expiresAt))}
            {" / "}
            状態: {invitation.status}
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
