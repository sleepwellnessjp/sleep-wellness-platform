"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import type { BetaVerifyResult } from "@/lib/beta-verify";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

export default function BetaVerifyPage() {
  const [result, setResult] = useState<BetaVerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSignedIn(false);
      setCheckingSession(false);
      setMessage("Supabase が未設定です。");
      return;
    }
    const supabase = createBrowserClient();
    if (!supabase) {
      setSignedIn(false);
      setCheckingSession(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setSignedIn(Boolean(user));
    setCheckingSession(false);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createBrowserClient();
      if (!supabase) {
        setMessage("Supabase クライアントを初期化できません。");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setMessage(error.message);
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      setMessage("ログインしました。実機確認を実行できます。");
    } catch (error) {
      console.error("[beta-verify] sign-in failed:", error);
      setMessage("ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const run = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/setup/beta-verify", {
        method: "POST",
        cache: "no-store",
      });
      const json = (await res.json()) as BetaVerifyResult;
      setResult(json);
      setMessage(json.summary);
      if (json.checks.some((c) => c.id === "auth" && c.status === "fail")) {
        setSignedIn(false);
      }
    } catch (error) {
      console.error("[beta-verify] failed:", error);
      setMessage("検証リクエストに失敗しました。ログイン状態を確認してください。");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#f7f4ef", color: NAVY }}>
      <InstructorNav />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm tracking-wide" style={{ color: GOLD }}>
          Version 1.0 Beta
        </p>
        <h1 className="mt-2 text-3xl font-semibold">データ連携 実機確認</h1>
        <p className="mt-3 text-sm leading-relaxed opacity-80">
          認定講師セッションで Clients / Sleep Analysis / Journey / Homework /
          Follow Up / Report の保存と読み込みを実行し、テストデータは自動削除します。
        </p>

        {checkingSession ? (
          <p className="mt-8 text-sm opacity-70">セッション確認中…</p>
        ) : !signedIn ? (
          <form
            className="mt-8 space-y-4 rounded-md border bg-white/80 p-5"
            style={{ borderColor: "rgba(7,20,38,0.12)" }}
            onSubmit={(event) => {
              event.preventDefault();
              void signIn();
            }}
          >
            <p className="text-sm opacity-80">
              実機確認には認定講師アカウントでのログインが必要です。
            </p>
            <label className="block text-sm">
              <span className="opacity-70">メール</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                style={{ borderColor: "rgba(7,20,38,0.2)" }}
              />
            </label>
            <label className="block text-sm">
              <span className="opacity-70">パスワード</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded border px-3 py-2"
                style={{ borderColor: "rgba(7,20,38,0.2)" }}
              />
            </label>
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="rounded-md px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {loading ? "ログイン中…" : "ログイン"}
            </button>
          </form>
        ) : (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className="rounded-md px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {loading ? "検証中…" : "実機確認を実行"}
            </button>
            <Link href="/setup" className="text-sm underline opacity-70">
              セットアップへ戻る
            </Link>
          </div>
        )}

        {message ? (
          <p
            className="mt-6 rounded-md border px-4 py-3 text-sm"
            style={{
              borderColor: result?.overall === "pass" ? "#2f6b4f" : "#8a3b2d",
              background: result?.overall === "pass" ? "#edf7f1" : "#fbebe8",
            }}
          >
            {message}
          </p>
        ) : null}

        {result ? (
          <div className="mt-8 space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold">判定</h2>
              <p className="text-sm opacity-70">
                {result.publishable ? "公開可能" : "公開不可"} · {result.ranAt}
              </p>
            </div>
            <ul className="space-y-2">
              {result.checks.map((check) => (
                <li
                  key={check.id}
                  className="flex items-start justify-between gap-4 rounded-md border bg-white/70 px-4 py-3 text-sm"
                  style={{ borderColor: "rgba(7,20,38,0.12)" }}
                >
                  <div>
                    <p className="font-medium">{check.label}</p>
                    <p className="mt-1 opacity-70">{check.detail}</p>
                  </div>
                  <span
                    className="shrink-0 font-medium"
                    style={{
                      color:
                        check.status === "pass"
                          ? "#2f6b4f"
                          : check.status === "skip"
                            ? GOLD
                            : "#8a3b2d",
                    }}
                  >
                    {check.status.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}
