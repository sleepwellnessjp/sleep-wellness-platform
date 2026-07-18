import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  isMissingTableError,
  readSupabaseError,
} from "@/lib/supabase/errors";

export type SupabaseHealth = {
  configured: boolean;
  authenticated: boolean;
  clientsTableReady: boolean;
  errorMessage: string | null;
  errorCode: string | null;
};

export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      authenticated: false,
      clientsTableReady: false,
      errorMessage: null,
      errorCode: null,
    };
  }

  const supabase = createBrowserClient();
  if (!supabase) {
    return {
      configured: false,
      authenticated: false,
      clientsTableReady: false,
      errorMessage: "Supabase クライアントを初期化できません。",
      errorCode: null,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[supabase/health] getUser failed:", userError);
  }

  const { error: tableError } = await supabase
    .from("clients")
    .select("id")
    .limit(1);

  if (!tableError) {
    return {
      configured: true,
      authenticated: Boolean(user),
      clientsTableReady: true,
      errorMessage: null,
      errorCode: null,
    };
  }

  console.error("[supabase/health] clients probe failed:", tableError);
  const parsed = readSupabaseError(tableError);

  return {
    configured: true,
    authenticated: Boolean(user),
    clientsTableReady: false,
    errorMessage: isMissingTableError(tableError)
      ? "public.clients テーブルが見つかりません。supabase/schema.sql を実行してください。"
      : parsed.message || "clients テーブルにアクセスできません。",
    errorCode: parsed.code || null,
  };
}
