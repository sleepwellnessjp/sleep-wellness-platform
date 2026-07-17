import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

/** ブラウザ用 Supabase クライアント。未設定時は null。 */
export function createBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  if (!browserClient) {
    browserClient = createSupabaseBrowserClient(url, key);
  }

  return browserClient;
}
