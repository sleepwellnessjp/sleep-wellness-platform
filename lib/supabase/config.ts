/**
 * Supabase 環境変数の有無を安全に判定する。
 * 未設定でもアプリ全体がクラッシュしないようにする。
 */
export function getSupabaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url || null;
}

/**
 * ブラウザ公開用キー（publishable key または anon key）。
 * 優先順: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY → NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function getSupabaseAnonKey(): string | null {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return publishable || anon || null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
