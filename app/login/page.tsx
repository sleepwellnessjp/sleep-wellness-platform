"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { enableDemoSession } from "@/lib/auth/demo-session";
import { evaluateClosedBetaLoginAccess } from "@/lib/closed-beta/beta-access-service";
import {
  appPathname,
  homePathForRole,
  isClientOnlyPath,
  isInstructorOnlyPath,
  isSchoolAllowedAdminPath,
  sanitizeAppRedirect,
} from "@/lib/safe-redirect";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  "mt-2.5 min-h-12 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:px-5 sm:py-4 sm:text-base disabled:opacity-60";

function safeSearchParamMessage(value: string | null): string | null {
  if (!value) return null;
  try {
    // useSearchParams は既に decode 済み。二重 decode は % を含む文言で落ちる
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function resolvePostAuthDestination(
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>,
  requestedRedirect: string,
  hasExplicitRedirect: boolean,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return requestedRedirect;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();
  const role =
    profile && typeof profile === "object" && "role" in profile
      ? String((profile as { role?: unknown }).role ?? "")
      : "";
  const profileEmail =
    profile && typeof profile === "object" && "email" in profile
      ? String((profile as { email?: unknown }).email ?? "")
      : "";

  const access = await evaluateClosedBetaLoginAccess(supabase, user.id, {
    role,
    email: profileEmail || user.email,
  });
  if (!access.allowed) {
    await supabase.auth.signOut();
    throw new Error(access.message);
  }

  const home = homePathForRole(role || "instructor");
  const redirectPath = appPathname(requestedRedirect);

  void Promise.all([
    supabase.from("system_activity_logs").insert({
      actor_id: user.id,
      category: "login",
      action: "sign_in",
      summary: "ログインしました",
      payload: { email: user.email ?? null },
    }),
    supabase.from("audit_logs").insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      actor_role: role || null,
      action: "login",
      resource_type: "session",
      summary: "ログインしました",
      payload: { email: user.email ?? null },
    }),
    supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id),
  ]).catch(() => {
    // ignore — table may not exist yet
  });

  if (!hasExplicitRedirect) return home;
  if (
    (role === "client" || role === "enterprise") &&
    isInstructorOnlyPath(requestedRedirect)
  ) {
    return home;
  }
  if (
    role &&
    role !== "client" &&
    isClientOnlyPath(requestedRedirect) &&
    role !== "admin" &&
    role !== "super_admin"
  ) {
    return home;
  }
  if (
    role &&
    role !== "enterprise" &&
    (redirectPath === "/enterprise" ||
      redirectPath.startsWith("/enterprise/")) &&
    role !== "admin" &&
    role !== "super_admin"
  ) {
    return home;
  }
  if (
    (redirectPath === "/admin" || redirectPath.startsWith("/admin/")) &&
    role &&
    role !== "admin" &&
    role !== "super_admin"
  ) {
    if (role === "school" && isSchoolAllowedAdminPath(redirectPath)) {
      return requestedRedirect;
    }
    return home;
  }
  if (
    (redirectPath === "/school" || redirectPath.startsWith("/school/")) &&
    role &&
    role !== "school" &&
    role !== "admin" &&
    role !== "super_admin"
  ) {
    return home;
  }
  return requestedRedirect;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasExplicitRedirect = Boolean(searchParams.get("redirect"));
  const redirectTo = sanitizeAppRedirect(
    searchParams.get("redirect"),
    "/dashboard",
  );
  const isUpdatePasswordMode = searchParams.get("mode") === "update-password";
  const queryError = searchParams.get("error");

  const supabaseEnabled = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    safeSearchParamMessage(queryError),
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

      const destination = await resolvePostAuthDestination(
        supabase,
        redirectTo,
        hasExplicitRedirect,
      );

      router.replace(destination);
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

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください。`,
      );
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
        setError(
          "ユーザーの作成に失敗しました。入力内容を確認して再度お試しください。",
        );
        return;
      }

      if (data.session) {
        const destination = await resolvePostAuthDestination(
          supabase,
          redirectTo,
          hasExplicitRedirect,
        );
        setMessage("登録が完了しました。移動します。");
        router.replace(destination);
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
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent("/login?mode=update-password")}`,
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

  const handleUpdatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabaseEnabled) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください。`);
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserClient();
      if (!supabase) {
        setError("Supabase の設定を確認してください。");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(
          "再設定用のセッションが見つかりません。メールのリンクから再度お試しください。",
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      const destination = await resolvePostAuthDestination(
        supabase,
        "/dashboard",
        false,
      );
      setMessage("パスワードを更新しました。移動します。");
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "パスワードの更新に失敗しました。しばらくしてから再度お試しください。",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStartDemo = () => {
    enableDemoSession();
    router.push("/demo");
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7f5]">
      <div className="border-b border-slate-200/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href="/" className="flex min-h-11 items-center gap-3">
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
            LOGIN
          </p>
        </div>
      </div>

      <div className="mx-auto px-4 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-16 sm:pb-16">
        <header className="mx-auto max-w-xl text-center sm:max-w-2xl">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS PLATFORM
          </p>
          <h1
            className="mt-4 break-words text-[1.65rem] font-semibold leading-snug tracking-[-0.05em] sm:text-[1.85rem] sm:leading-tight sm:whitespace-nowrap lg:text-4xl"
            style={{ color: NAVY }}
          >
            {isUpdatePasswordMode ? "パスワード再設定" : "ログイン"}
          </h1>
          <p className="mx-auto mt-4 max-w-[22rem] text-[14px] leading-7 text-slate-600 [word-break:keep-all] sm:max-w-none sm:text-[14.5px]">
            {isUpdatePasswordMode
              ? "新しいパスワードを設定してください。"
              : "Closed Beta は認定講師向けです。利用開始日以降にログインしてください。"}
          </p>
        </header>

        {!supabaseEnabled ? (
          <div className="mx-auto mt-10 w-full max-w-md rounded-[28px] border border-[#8a6a2d]/25 bg-[#faf7f1] px-5 py-7 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)] sm:px-6 sm:py-8">
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
              約30秒で全体像を体験
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              サンプル認定講師・クライアント12名のデータで、収集から改善レポートまでの流れをワンクリックで体験できます。実データには触れません。
            </p>
            <button
              type="button"
              onClick={handleStartDemo}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition active:opacity-90 sm:hover:opacity-90 sm:active:opacity-100"
              style={{ backgroundColor: NAVY }}
            >
              デモをはじめる
            </button>
            <p className="mt-5 text-xs leading-6 text-slate-400">
              Supabase 未設定のため、講師画面のデータはブラウザの localStorage
              に保存されます。
            </p>
          </div>
        ) : isUpdatePasswordMode ? (
          <form
            onSubmit={handleUpdatePassword}
            className="mx-auto mt-10 grid w-full max-w-md grid-cols-1 gap-5 rounded-[28px] border border-slate-200/90 bg-white px-5 py-7 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)] sm:px-8 sm:py-8"
          >
            <label className="block">
              <span className="text-sm font-semibold" style={{ color: NAVY }}>
                新しいパスワード
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                disabled={busy}
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`${MIN_PASSWORD_LENGTH}文字以上`}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold" style={{ color: NAVY }}>
                新しいパスワード（確認）
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                disabled={busy}
                className={inputClass}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={`${MIN_PASSWORD_LENGTH}文字以上`}
              />
            </label>

            {error && (
              <p className="break-words rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            {message && (
              <p className="break-words rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition active:opacity-90 disabled:opacity-60 sm:hover:opacity-90 sm:active:opacity-100"
              style={{ backgroundColor: NAVY }}
            >
              {busy ? "処理中..." : "パスワードを更新"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleLogin}
            className="mx-auto mt-10 grid w-full max-w-md grid-cols-1 gap-5 rounded-[28px] border border-slate-200/90 bg-white px-5 py-7 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)] sm:px-8 sm:py-8"
          >
            <label className="block">
              <span className="text-sm font-semibold" style={{ color: NAVY }}>
                メールアドレス
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                disabled={busy}
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
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
                disabled={busy}
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`${MIN_PASSWORD_LENGTH}文字以上`}
              />
            </label>

            {error && (
              <p className="break-words rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            )}

            {message && (
              <p className="break-words rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition active:opacity-90 disabled:opacity-60 sm:hover:opacity-90 sm:active:opacity-100"
              style={{ backgroundColor: NAVY }}
            >
              {busy ? "処理中..." : "ログイン"}
            </button>

            <div className="flex flex-col gap-1 pt-1 sm:flex-row sm:justify-between sm:gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleSignUp}
                className="inline-flex min-h-11 items-center justify-center text-sm font-semibold transition active:opacity-70 disabled:opacity-60 sm:min-h-0 sm:justify-start sm:hover:underline sm:active:opacity-100"
                style={{ color: GOLD }}
              >
                認定講師として新規登録
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleForgotPassword}
                className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-slate-500 transition active:text-slate-700 disabled:opacity-60 sm:min-h-0 sm:justify-start sm:hover:text-slate-700 sm:active:text-slate-500"
              >
                パスワードを忘れた方
              </button>
            </div>
          </form>
        )}

        {supabaseEnabled && !isUpdatePasswordMode ? (
          <div className="mx-auto mt-8 w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 text-center sm:px-6">
            <p
              className="text-[11px] font-semibold tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              DEMO MODE
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              ログイン前に、サンプルデータだけで全体像を体験できます。
            </p>
            <button
              type="button"
              onClick={handleStartDemo}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border px-6 text-[14px] font-semibold transition active:opacity-80 sm:hover:opacity-90"
              style={{ borderColor: "rgba(7,20,38,0.15)", color: NAVY }}
            >
              デモをはじめる
            </button>
          </div>
        ) : null}

        <p className="mt-8 text-center text-sm text-slate-400">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center font-medium transition active:text-slate-600 sm:min-h-0 sm:hover:text-slate-600 sm:active:text-slate-400"
          >
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
        <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <p className="text-sm text-slate-400">読み込み中...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
