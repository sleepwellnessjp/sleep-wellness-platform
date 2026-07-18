"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { enableDemoSession } from "@/lib/auth/demo-session";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const inputClass =
  "mt-2.5 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const queryError = searchParams.get("error");

  const supabaseEnabled = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    queryError ? decodeURIComponent(queryError) : null,
  );
  const [busy, setBusy] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabaseEnabled) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserClient();
      if (!supabase) {
        setError("Supabase の設定を確認してください。");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ログインに失敗しました。しばらくしてから再度お試しください。",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    setMessage(null);

    if (!supabaseEnabled) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserClient();
      if (!supabase) {
        setError("Supabase の設定を確認してください。");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const identities = data.user?.identities ?? [];
      if (data.user && identities.length === 0) {
        setError(
          "このメールアドレスは既に登録されています。ログインするか、パスワード再設定をご利用ください。",
        );
        return;
      }

      if (!data.user) {
        setError("ユーザーの作成に失敗しました。入力内容を確認して再度お試しください。");
        return;
      }

      if (data.session) {
        setMessage("登録が完了しました。ダッシュボードへ移動します。");
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      setMessage(
        "登録を受け付けました。確認メールを送信したので、メール内のリンクから登録を完了してください。",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "新規登録に失敗しました。しばらくしてから再度お試しください。",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setMessage(null);

    if (!supabaseEnabled) return;
    if (!email.trim()) {
      setError("パスワード再設定用のメールアドレスを入力してください。");
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserClient();
      if (!supabase) {
        setError("Supabase の設定を確認してください。");
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
        },
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage("パスワード再設定メールを送信しました。");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "パスワード再設定メールの送信に失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDemoDashboard = () => {
    enableDemoSession();
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={160}
              height={40}
              className="h-auto w-[120px] sm:w-[140px]"
            />
          </Link>
          <p
            className="text-[10px] font-semibold tracking-[0.22em] sm:text-xs sm:tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            INSTRUCTOR LOGIN
          </p>
        </div>
      </div>

      <div className="mx-auto px-5 py-12 sm:py-16">
        <header className="mx-auto max-w-xl text-center sm:max-w-2xl">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS PLATFORM
          </p>
          <h1
            className="mt-4 text-[1.65rem] font-semibold leading-snug tracking-[-0.05em] sm:text-[1.85rem] sm:leading-tight sm:whitespace-nowrap lg:text-4xl"
            style={{ color: NAVY }}
          >
            <span className="block sm:inline">インストラクター</span>
            <span className="block sm:inline">ログイン</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[20rem] text-[14px] leading-7 text-slate-600 [word-break:keep-all] sm:max-w-none sm:whitespace-nowrap sm:text-[14.5px]">
            クライアントデータを安全に管理するためのログイン画面です。
          </p>
        </header>

        {!supabaseEnabled ? (
          <div className="mx-auto mt-10 max-w-md rounded-[28px] border border-[#8a6a2d]/25 bg-[#faf7f1] px-6 py-8 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)]">
            <p
              className="text-[11px] font-semibold tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              DEMO MODE
            </p>
            <p
              className="mt-3 text-lg font-semibold tracking-[-0.03em]"
              style={{ color: NAVY }}
            >
              現在はデモモードです
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Supabase の環境変数が未設定のため、データはこのブラウザの
              localStorage に保存されます。
            </p>
            <button
              type="button"
              onClick={handleDemoDashboard}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              デモとしてダッシュボードを見る
            </button>
            <p className="mt-5 text-xs leading-6 text-slate-400">
              本番利用時は SUPABASE_SETUP.md を参照して Supabase を設定してください。
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleLogin}
            className="mx-auto mt-10 max-w-md space-y-5 rounded-[28px] border border-slate-200/90 bg-white px-6 py-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)] sm:px-8"
          >
            <label className="block">
              <span className="text-sm font-semibold" style={{ color: NAVY }}>
                メールアドレス
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="instructor@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold" style={{ color: NAVY }}>
                パスワード
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8文字以上"
              />
            </label>

            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            {message && (
              <p className="rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: NAVY }}
            >
              {busy ? "処理中..." : "ログイン"}
            </button>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={busy}
                onClick={handleSignUp}
                className="text-sm font-semibold transition hover:underline"
                style={{ color: GOLD }}
              >
                新規登録
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleForgotPassword}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
              >
                パスワードを忘れた方
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-slate-400">
          <Link href="/" className="font-medium transition hover:text-slate-600">
            ← トップページへ戻る
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
          <p className="text-sm text-slate-400">読み込み中...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
