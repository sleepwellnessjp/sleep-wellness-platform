import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

let browserClient: SupabaseClient<Database> | null = null;

/** ブラウザ用 Supabase クライアント。未設定時は null。 */
export function createBrowserClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  if (!browserClient) {
    browserClient = createSupabaseBrowserClient<Database>(url, key);
  }

  return browserClient;
}
