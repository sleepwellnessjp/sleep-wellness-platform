import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
};

export async function getInstructorAuth(): Promise<SupabaseAuth | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return { supabase, userId: user.id };
}

export function todayInTokyo(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
