/**
 * クライアントカルテへのアクセス判定。
 * 担当講師は自分のクライアントのみ。admin / super_admin は全件可。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** profiles.role が admin / super_admin、または RPC is_admin_or_above() */
export async function isAdminOrAbove(supabase: Client): Promise<boolean> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "is_admin_or_above",
  );
  if (!rpcError && typeof rpcData === "boolean") {
    return rpcData;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  return role === "admin" || role === "super_admin";
}

/**
 * カルテ閲覧・CSV取込などのクライアント単位操作。
 * 講師の担当範囲は変更しない（自分の instructor_id のみ）。
 */
export async function canAccessClientAsInstructorOrAdmin(options: {
  supabase: Client;
  userId: string;
  clientInstructorId: string | null | undefined;
}): Promise<boolean> {
  if (
    options.clientInstructorId &&
    options.clientInstructorId === options.userId
  ) {
    return true;
  }
  return isAdminOrAbove(options.supabase);
}
