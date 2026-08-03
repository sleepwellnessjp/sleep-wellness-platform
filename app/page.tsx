import { redirect } from "next/navigation";
import { homePathForRole } from "@/lib/safe-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Sleep Wellness Platform のプロダクト入口。
 * ブランド紹介（「睡眠を、日本の新しい文化へ。」）は `/welcome`。
 * - ログイン済み → ロール別ホーム（/dashboard 等）
 * - 未ログイン → /login
 */
export default async function Home() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile && typeof profile === "object" && "role" in profile
      ? String((profile as { role?: unknown }).role ?? "")
      : "";

  redirect(homePathForRole(role || "instructor"));
}
