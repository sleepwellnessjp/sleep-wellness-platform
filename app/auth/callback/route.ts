import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  homePathForRole,
  isClientOnlyPath,
  isInstructorOnlyPath,
  sanitizeAppRedirect,
} from "@/lib/safe-redirect";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL("/login?error=supabase_not_configured", request.url),
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedRedirect = sanitizeAppRedirect(
    searchParams.get("redirect"),
    "/dashboard",
  );
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "認証コードが見つかりませんでした。");
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
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = requestedRedirect;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role =
      profile && typeof profile === "object" && "role" in profile
        ? String((profile as { role?: unknown }).role ?? "")
        : "";

    // ログイン履歴（失敗しても認証フローは継続）
    void Promise.all([
      supabase.from("system_activity_logs").insert({
        actor_id: user.id,
        category: "login",
        action: "sign_in",
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
      (destination === "/enterprise" ||
        destination.startsWith("/enterprise/")) &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      destination = home;
    } else if (
      (destination === "/admin" || destination.startsWith("/admin/")) &&
      role &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      destination = home;
    } else if (!searchParams.get("redirect")) {
      destination = home;
    }
  }

  return NextResponse.redirect(new URL(destination, origin));
}
