"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import type { ClientPortalMessage } from "@/lib/client-portal/types";

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function ClientChatPage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();
  const { success, error: toastError } = useToast();
  const [messages, setMessages] = useState<ClientPortalMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setReady(false);
    try {
      const res = await fetch("/api/client-portal/messages?markRead=1");
      const json = (await res.json()) as {
        messages?: ClientPortalMessage[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "メッセージの取得に失敗しました");
      setMessages(json.messages ?? []);
    } catch (err) {
      toastError(
        err instanceof Error ? err.message : "メッセージの取得に失敗しました",
      );
      setMessages([]);
    } finally {
      setReady(true);
    }
  }, [toastError]);

  useEffect(() => {
    if (!bundle) return;
    void load();
  }, [bundle, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

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
          clientId: bundle.data.client.id,
          body,
          asRole: "client",
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
      success("メッセージを送信しました");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <ClientPortalShell eyebrow="CHAT" title="Chat">
      <SectionCard eyebrow="INSTRUCTOR" title="認定講師とのメッセージ">
        {!ready ? (
          <SoftSkeleton variant="card" />
        ) : messages.length === 0 ? (
          <EmptyState
            compact
            illustration="generic"
            title="メッセージはまだありません"
            description="認定講師に相談したいことがあれば、下の欄から送信できます。"
          />
        ) : (
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {messages.map((msg) => {
              const mine = msg.senderRole === "client";
              return (
                <div
                  key={msg.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      mine
                        ? "bg-[#071426] text-white"
                        : "border border-[#8a6a2d]/20 bg-[#faf7f1] text-slate-700"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-semibold tracking-[0.12em] ${
                        mine ? "text-white/70" : ""
                      }`}
                      style={mine ? undefined : { color: GOLD }}
                    >
                      {mine ? "あなた" : "認定講師"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] leading-7">
                      {msg.body}
                    </p>
                    <p
                      className={`mt-2 text-[11px] ${
                        mine ? "text-white/55" : "text-slate-400"
                      }`}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">メッセージ</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="認定講師へメッセージを送る"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[16px] outline-none focus:border-[#315f68]/40 focus:ring-2 focus:ring-[#315f68]/15 sm:text-[15px]"
              style={{ color: NAVY }}
            />
          </label>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex min-h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold text-white disabled:opacity-50 sm:self-end"
            style={{ backgroundColor: NAVY }}
          >
            {sending ? "送信中…" : "送信"}
          </button>
        </form>
      </SectionCard>
    </ClientPortalShell>
  );
}
