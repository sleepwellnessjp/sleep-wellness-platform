"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { ClientPortalMessage } from "@/lib/client-portal/types";

/**
 * 認定講師向け: Client Portal チャットへメッセージを送る。
 */
export default function InstructorClientChatCard({
  clientId,
}: {
  clientId: string;
}) {
  const { success, error: toastError } = useToast();
  const [messages, setMessages] = useState<ClientPortalMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setReady(false);
    try {
      const res = await fetch(
        `/api/client-portal/messages?clientId=${encodeURIComponent(clientId)}&markRead=1`,
      );
      const json = (await res.json()) as {
        messages?: ClientPortalMessage[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "取得に失敗しました");
      setMessages(json.messages ?? []);
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "メッセージの取得に失敗しました",
      );
      setMessages([]);
    } finally {
      setReady(true);
    }
  }, [clientId, toastError]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/client-portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          body,
          asRole: "instructor",
        }),
      });
      const json = (await res.json()) as {
        message?: ClientPortalMessage;
        error?: string;
      };
      if (!res.ok || !json.message) {
        throw new Error(json.error || "送信に失敗しました");
      }
      setMessages((prev) => [...prev, json.message!]);
      setDraft("");
      success("クライアントへメッセージを送信しました");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#8a6a2d]/18 bg-[#fafaf8] px-4 py-4 sm:px-5">
      <p
        className="text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        CLIENT PORTAL CHAT
      </p>
      <p className="mt-2 text-[14px] leading-7 text-slate-600">
        クライアントの Client Portal（Chat）へメッセージを送れます。
      </p>

      <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
        {!ready ? (
          <SoftSkeleton variant="card" />
        ) : messages.length === 0 ? (
          <EmptyState
            compact
            illustration="generic"
            title="まだメッセージがありません"
          />
        ) : (
          messages.slice(-8).map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl px-3 py-2 text-[13px] leading-6 ${
                msg.senderRole === "instructor"
                  ? "bg-[#071426] text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              <p className="text-[10px] font-semibold opacity-70">
                {msg.senderRole === "instructor" ? "あなた" : "クライアント"}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="クライアントへのメッセージ"
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[16px] outline-none focus:border-[#315f68]/40 focus:ring-2 focus:ring-[#315f68]/15 sm:text-[15px]"
          style={{ color: NAVY }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: NAVY }}
        >
          {sending ? "送信中…" : "メッセージを送る"}
        </button>
      </form>
    </div>
  );
}
