/** First-visit / onboarding / beta agreement helpers (client-only local + server sync). */

import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const ONBOARDING_KEY = "swij-onboarding-v27-seen";
const BETA_AGREEMENT_KEY = "swij-beta-agreement-v27-accepted";

export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

export function hasAcceptedBetaAgreement(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(BETA_AGREEMENT_KEY) === "1";
  } catch {
    return true;
  }
}

export function markBetaAgreementAccepted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BETA_AGREEMENT_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

/**
 * 初回ログイン時の利用規約同意を確認する。
 * localStorage または profiles.beta_terms_accepted_at のいずれかがあれば同意済み。
 */
export async function resolveBetaAgreementAccepted(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  if (hasAcceptedBetaAgreement()) return true;

  if (!isSupabaseConfigured()) return false;

  const supabase = createBrowserClient();
  if (!supabase) return false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("profiles")
      .select("beta_terms_accepted_at")
      .eq("id", user.id)
      .maybeSingle();

    const acceptedAt =
      data &&
      typeof data === "object" &&
      "beta_terms_accepted_at" in data &&
      (data as { beta_terms_accepted_at?: string | null }).beta_terms_accepted_at;

    if (acceptedAt) {
      markBetaAgreementAccepted();
      return true;
    }
  } catch {
    // ignore — fall through to show gate
  }

  return false;
}

/** 利用規約同意を localStorage + profiles に永続化する（初回のみ） */
export async function persistBetaAgreementAccepted(): Promise<void> {
  markBetaAgreementAccepted();

  if (!isSupabaseConfigured()) return;

  const supabase = createBrowserClient();
  if (!supabase) return;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ beta_terms_accepted_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("beta_terms_accepted_at", null);
  } catch {
    // localStorage 側は完了済み。サーバー同期失敗は次回も local で通過可能
  }
}
