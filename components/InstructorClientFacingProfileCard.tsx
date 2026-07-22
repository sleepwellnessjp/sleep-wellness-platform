"use client";

import { useEffect, useState } from "react";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * 認定講師がクライアントマイページに表示する写真・メッセージを編集する。
 */
export default function InstructorClientFacingProfileCard() {
  const { success, error: toastError } = useToast();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured()) {
      queueMicrotask(() => {
        if (!cancelled) {
          setLoading(false);
          setAvailable(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    const supabase = createBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        if (!cancelled) {
          setLoading(false);
          setAvailable(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error: selectError } = await supabase
        .from("profiles")
        .select("avatar_url, client_message")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (selectError) {
        setAvailable(false);
      } else if (data) {
        setAvatarUrl(
          typeof data.avatar_url === "string" ? data.avatar_url : "",
        );
        setClientMessage(
          typeof data.client_message === "string" ? data.client_message : "",
        );
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("ログインが必要です。");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl.trim() || null,
          client_message: clientMessage.trim() || null,
        } as never)
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        toastError(updateError.message);
        return;
      }
      setMessage("クライアントマイページ表示用のプロフィールを保存しました。");
      success("プロフィールを更新しました");
    } finally {
      setBusy(false);
    }
  };

  if (!available) return null;

  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 sm:px-7 sm:py-8">
      <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
        <h2
          className="text-lg font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          クライアント向け表示
        </h2>
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          CLIENT FACING
        </p>
      </div>

      {loading ? (
        <SoftSkeleton variant="homework" />
      ) : (
        <>
          <p className="text-[14px] leading-7 text-slate-600">
            /client の「担当認定講師」に表示される写真とメッセージです。
          </p>

          <label className="mt-5 block">
            <span className="text-[12px] font-semibold text-slate-500">
              写真 URL
            </span>
            <input
              type="url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafaf8] px-3.5 py-3 text-[15px] outline-none focus:border-[#315f68]/40 focus:ring-2 focus:ring-[#315f68]/15"
              style={{ color: NAVY }}
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[12px] font-semibold text-slate-500">
              メッセージ
            </span>
            <textarea
              value={clientMessage}
              onChange={(event) => setClientMessage(event.target.value)}
              rows={4}
              placeholder="クライアントへのメッセージを入力"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#fafaf8] px-3.5 py-3 text-[15px] leading-7 outline-none focus:border-[#315f68]/40 focus:ring-2 focus:ring-[#315f68]/15"
              style={{ color: NAVY }}
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex min-h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: NAVY }}
            >
              {busy ? "保存中…" : "保存する"}
            </button>
            {message ? (
              <p className="text-[13px] font-medium text-[#315f68]">{message}</p>
            ) : null}
            {error ? (
              <p className="text-[13px] font-medium text-rose-600">{error}</p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
