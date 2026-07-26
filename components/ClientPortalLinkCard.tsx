"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  isValidPortalEmail,
  linkClientPortalUser,
} from "@/lib/repositories/client-mypage-repository";

/**
 * 認定講師向け: クライアントマイページ（/client）連携メールを設定する。
 */
export default function ClientPortalLinkCard({
  clientId,
  initialEmail,
}: {
  clientId: string;
  initialEmail?: string;
}) {
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState(initialEmail?.trim() ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(initialEmail?.trim() ?? "");
  }, [initialEmail, clientId]);

  const save = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("マイページ連携用のメールアドレスを入力してください。");
      return;
    }
    if (!isValidPortalEmail(trimmed)) {
      setError("メールアドレスの形式が正しくありません。");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await linkClientPortalUser({
        clientId,
        email: trimmed,
      });
      setEmail(result.email);
      const okMsg = "連携を保存しました";
      setMessage(okMsg);
      success(okMsg);
    } catch (err) {
      console.error("[ClientPortalLinkCard] save failed:", err);
      const msg =
        err instanceof Error ? err.message : "連携の保存に失敗しました。";
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
        CLIENT PORTAL
      </p>
      <p className="mt-2 text-[14px] leading-7 text-slate-600">
        クライアント本人のログイン用メールを登録すると、専用マイページ（/client）に分析・宿題が表示されます。
      </p>
      <label className="mt-4 block">
        <span className="text-[12px] font-semibold text-slate-500">
          連携メールアドレス
        </span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="client@example.com"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[16px] outline-none focus:border-[#315f68]/40 focus:ring-2 focus:ring-[#315f68]/15 sm:text-[15px]"
          style={{ color: NAVY }}
          autoComplete="email"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white transition active:opacity-90 disabled:opacity-60 sm:min-h-10 sm:hover:opacity-90 sm:active:opacity-100"
          style={{ backgroundColor: NAVY }}
        >
          {busy ? "保存中…" : "マイページ連携を保存"}
        </button>
        {message ? (
          <p className="text-[13px] font-medium text-[#315f68]">{message}</p>
        ) : null}
        {error ? (
          <p className="text-[13px] font-medium text-rose-600">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
