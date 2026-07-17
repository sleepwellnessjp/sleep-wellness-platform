import { useCallback, useEffect, useState } from "react";
import { clearDemoSession } from "@/lib/auth/demo-session";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AuthState = {
  loading: boolean;
  /** Supabase 環境変数が設定されている */
  supabaseEnabled: boolean;
  /** Supabase でログイン済み */
  isAuthenticated: boolean;
  /** Supabase 未設定＝デモモード */
  isDemoMode: boolean;
  email: string | null;
};

const initialState: AuthState = {
  loading: true,
  supabaseEnabled: false,
  isAuthenticated: false,
  isDemoMode: true,
  email: null,
};

export function useAuth(): AuthState & { signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>(initialState);

  const refresh = useCallback(async () => {
    const supabaseEnabled = isSupabaseConfigured();

    if (!supabaseEnabled) {
      setState({
        loading: false,
        supabaseEnabled: false,
        isAuthenticated: false,
        isDemoMode: true,
        email: null,
      });
      return;
    }

    const supabase = createBrowserClient();
    if (!supabase) {
      setState({
        loading: false,
        supabaseEnabled: false,
        isAuthenticated: false,
        isDemoMode: true,
        email: null,
      });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setState({
      loading: false,
      supabaseEnabled: true,
      isAuthenticated: Boolean(user),
      isDemoMode: false,
      email: user?.email ?? null,
    });
  }, []);

  useEffect(() => {
    void refresh();

    if (!isSupabaseConfigured()) return;

    const supabase = createBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserClient();
      await supabase?.auth.signOut();
    }
    clearDemoSession();
    await refresh();
  }, [refresh]);

  return { ...state, signOut };
}
