"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { enableDemoSession } from "@/lib/auth/demo-session";
import { getPublicAppOrigin } from "@/lib/auth/password-recovery";
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
import { HOME_TOP_HREF } from "@/lib/home-intro";

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

  // ロール別 Home（admin / super_admin → /admin、instructor → /dashboard 等）
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
    (redirectPath === "/portal/school" ||
      redirectPath.startsWith("/portal/school/")) &&
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
  const [recoveryReady, setRecoveryReady] = useState(false);

  // スマホメールアプリ経由でも、hash / PASSWORD_RECOVERY / code を拾って再設定画面へ進める
  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabase = createBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    const ensureUpdatePasswordMode = () => {
      if (cancelled) return;
      if (searchParams.get("mode") === "update-password") {
        setRecoveryReady(true);
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set("mode", "update-password");
      url.hash = "";
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
      setRecoveryReady(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        ensureUpdatePasswordMode();
      }
    });

    void (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");

        if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (!error) {
            ensureUpdatePasswordMode();
            return;
          }
        }

        if (code && url.pathname === "/login") {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            ensureUpdatePasswordMode();
            return;
          }
        }

        // 旧形式: #access_token=...&type=recovery
        if (url.hash.includes("type=recovery") || url.hash.includes("access_token")) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            ensureUpdatePasswordMode();
            return;
          }
        }

        if (searchParams.get("mode") === "update-password") {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) setRecoveryReady(true);
        }
      } catch {
        // ignore — ユーザー操作で再送可能
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabaseEnabled, router, searchParams]);

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

      const origin = getPublicAppOrigin() || window.location.origin;
      // ネストした ?redirect=/login?mode=... はメールクライアントで壊れやすいため flow=recovery に一本化
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${origin}/auth/callback?flow=recovery`,
        },
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage(
        "パスワード再設定メールを送信しました。メール内のリンクは、この画面を開いている同じブラウザで開いてください（別アプリのプレビューだと失敗することがあります）。",
      );
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
          "再設定用のセッションが見つかりません。メールのリンクを、再設定メールを依頼した同じブラウザで開き直してください。",
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        const msg = updateError.message || "";
        if (/same password|should be different/i.test(msg)) {
          setError("現在と同じパスワードは使えません。別のパスワードを設定してください。");
        } else if (/weak|at least|characters/i.test(msg)) {
          setError(
            `パスワードは${MIN_PASSWORD_LENGTH}文字以上で、より複雑なものを設定してください。`,
          );
        } else {
          setError(msg);
        }
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
          <Link href={HOME_TOP_HREF} className="flex min-h-11 items-center gap-3">
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
            {!recoveryReady ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                メール内のリンクから開くと、ここに再設定用セッションが渡ります。リンクは再設定メールを送った同じブラウザで開いてください。
              </p>
            ) : null}
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

            <div className="pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={handleForgotPassword}
                className="inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-slate-500 transition active:text-slate-700 disabled:opacity-60 sm:min-h-0 sm:w-auto sm:justify-start sm:hover:text-slate-700 sm:active:text-slate-500"
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
            href={HOME_TOP_HREF}
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
