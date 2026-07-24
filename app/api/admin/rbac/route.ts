import { NextResponse } from "next/server";
import { listRoleCatalog } from "@/lib/subscription/subscription-service";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  AUTHORITY_LABELS,
  AUTHORITY_DESCRIPTIONS,
  PERMISSION_MATRIX,
  RESOURCE_LABELS,
  PLATFORM_AUTHORITIES,
} from "@/lib/rbac/constants";
import type { ResourceKey } from "@/lib/rbac/types";

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      await requireAdminProfile();
    }
    const roles = await listRoleCatalog();
    const resources = Object.keys(RESOURCE_LABELS) as ResourceKey[];

    return NextResponse.json({
      roles,
      authorities: PLATFORM_AUTHORITIES.map((key) => ({
        key,
        label: AUTHORITY_LABELS[key],
        description: AUTHORITY_DESCRIPTIONS[key],
        permissions: PERMISSION_MATRIX[key],
      })),
      resources: resources.map((key) => ({
        key,
        label: RESOURCE_LABELS[key],
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
