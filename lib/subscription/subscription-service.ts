import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  requireAdminOrSchoolProfile,
} from "@/lib/platform/platform-service";
import { canAccessResource } from "@/lib/rbac/access";
import { DEFAULT_ROLE_CATALOG } from "@/lib/rbac/constants";
import type { RoleCatalogRecord } from "@/lib/rbac/types";
import {
  getDemoCommercialSubscription,
  listDemoCommercialSubscriptions,
  setDemoCommercialPlan,
} from "./demo-subscription-store";
import type {
  CommercialPlanId,
  CommercialSubscriptionRecord,
} from "./types";

function mapCommercial(
  row: Record<string, unknown>,
): CommercialSubscriptionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userEmail: typeof row.user_email === "string" ? row.user_email : null,
    userDisplayName:
      typeof row.user_display_name === "string"
        ? row.user_display_name
        : null,
    planId: row.plan_id as CommercialPlanId,
    status: row.status as CommercialSubscriptionRecord["status"],
    billingCycle: row.billing_cycle as "monthly" | "yearly",
    currentPeriodEnd:
      typeof row.current_period_end === "string"
        ? row.current_period_end.slice(0, 10)
        : null,
    mockNote: typeof row.mock_note === "string" ? row.mock_note : "",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listRoleCatalog(): Promise<RoleCatalogRecord[]> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_ROLE_CATALOG;
  }
  // Version 2.2 権限マトリクスはアプリ定義を正とする（DB roles はラベル同期用）
  return DEFAULT_ROLE_CATALOG;
}

export async function listCommercialSubscriptions(): Promise<
  CommercialSubscriptionRecord[]
> {
  if (!isSupabaseConfigured()) {
    return listDemoCommercialSubscriptions();
  }
  await requireAdminOrSchoolProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("commercial_subscriptions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return listDemoCommercialSubscriptions();
  }

  return data.map((row) => mapCommercial(row as Record<string, unknown>));
}

export async function getMyCommercialSubscription(): Promise<CommercialSubscriptionRecord | null> {
  if (!isSupabaseConfigured()) {
    return getDemoCommercialSubscription("demo-instructor");
  }
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (!canAccessResource(profile.role, "billing", "view")) {
    throw new Error("Forbidden");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("commercial_subscriptions")
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return getDemoCommercialSubscription(profile.id);
  }
  return mapCommercial(data as Record<string, unknown>);
}

export async function selectMockCommercialPlan(
  planId: CommercialPlanId,
): Promise<CommercialSubscriptionRecord> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Unauthorized");
  if (!canAccessResource(profile.role, "billing", "view")) {
    throw new Error("Forbidden");
  }

  if (!isSupabaseConfigured()) {
    return setDemoCommercialPlan({
      userId: "demo-instructor",
      userEmail: profile.email,
      userDisplayName: profile.displayName,
      planId,
    });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Database unavailable");

  const payload = {
    user_id: profile.id,
    user_email: profile.email,
    user_display_name: profile.displayName,
    plan_id: planId,
    status: "trialing",
    billing_cycle: "monthly",
    current_period_end: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10),
    mock_note: "モック: 課金ゲートウェイ未接続（Version 2.2）",
  };

  const { data: existing } = await supabase
    .from("commercial_subscriptions")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing && typeof (existing as { id?: string }).id === "string") {
    const { data, error } = await supabase
      .from("commercial_subscriptions")
      .update(payload)
      .eq("id", (existing as { id: string }).id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapCommercial(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("commercial_subscriptions")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCommercial(data as Record<string, unknown>);
}
