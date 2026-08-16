import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  isPasswordRecoveryRedirect,
  PASSWORD_UPDATE_PATH,
} from "@/lib/auth/password-recovery";
import { evaluateClosedBetaLoginAccess } from "@/lib/closed-beta/beta-access-service";
import {
  homePathForRole,
  isClientOnlyPath,
  isInstructorOnlyPath,
  isSchoolAllowedAdminPath,
  sanitizeAppRedirect,
  appPathname,
} from "@/lib/safe-redirect";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

function asOtpType(value: string | null): EmailOtpType | null {
  if (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  ) {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=supabase_not_configured", request.url),
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = asOtpType(searchParams.get("type"));
  const flow = searchParams.get("flow");
  const requestedRedirect = sanitizeAppRedirect(
    searchParams.get("redirect"),
    "/dashboard",
  );
  const errorDescription =
    searchParams.get("error_description") || searchParams.get("error");

  const isRecovery = isPasswordRecoveryRedirect(
    searchParams.get("redirect"),
    flow,
    type,
  );

  if (errorDescription) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", errorDescription);
    if (isRecovery) {
      loginUrl.searchParams.set("mode", "update-password");
    }
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(
      new URL("/login?error=supabase_not_configured", request.url),
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  // 1) token_hash（メールテンプレート / スマホで PKCE なし）
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set(
        "error",
        error.message ||
          "再設定リンクが無効か期限切れです。もう一度お試しください。",
      );
      if (type === "recovery" || isRecovery) {
        loginUrl.searchParams.set("mode", "update-password");
      }
      return NextResponse.redirect(loginUrl);
    }
  } else if (code) {
    // 2) PKCE code 交換
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", origin);
      const pkceHint =
        /code verifier|pkce|both auth code and code verifier/i.test(
          error.message,
        );
      loginUrl.searchParams.set(
        "error",
        pkceHint
          ? "再設定リンクは、メール送信を依頼した同じブラウザで開いてください。別アプリのプレビューで開くと失敗することがあります。"
          : error.message,
      );
      if (isRecovery) {
        loginUrl.searchParams.set("mode", "update-password");
      }
      return NextResponse.redirect(loginUrl);
    }
  } else {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      "認証コードが見つかりませんでした。メールのリンクから再度お試しください。",
    );
    if (isRecovery) {
      loginUrl.searchParams.set("mode", "update-password");
    }
    return NextResponse.redirect(loginUrl);
  }

  // パスワード再設定: Closed Beta 判定で signOut しない（セッションを維持して更新画面へ）
  if (isRecovery || type === "recovery") {
    return NextResponse.redirect(new URL(PASSWORD_UPDATE_PATH, origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = requestedRedirect;
  if (user) {
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
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", access.message);
      return NextResponse.redirect(loginUrl);
    }

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
      // table may not exist yet
    });

    const home = homePathForRole(role || "instructor");
    const destinationPath = appPathname(destination);
    if (
      (role === "client" || role === "enterprise") &&
      isInstructorOnlyPath(destination)
    ) {
      destination = home;
    } else if (
      role &&
      role !== "client" &&
      isClientOnlyPath(destination) &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      destination = home;
    } else if (
      role &&
      role !== "enterprise" &&
      (destinationPath === "/enterprise" ||
        destinationPath.startsWith("/enterprise/")) &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      destination = home;
    } else if (
      (destinationPath === "/admin" ||
        destinationPath.startsWith("/admin/")) &&
      role &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      if (!(role === "school" && isSchoolAllowedAdminPath(destinationPath))) {
        destination = home;
      }
    } else if (!searchParams.get("redirect")) {
      destination = home;
    }
  }

  return NextResponse.redirect(new URL(destination, origin));
}
