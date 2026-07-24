import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listRoleCatalog } from "@/lib/subscription/subscription-service";
import {
  AUTHORITY_LABELS,
  AUTHORITY_DESCRIPTIONS,
  PERMISSION_MATRIX,
  RESOURCE_LABELS,
  PLATFORM_AUTHORITIES,
} from "@/lib/rbac/constants";
import type { AccessLevel, ResourceKey } from "@/lib/rbac/types";

/** 認証済みユーザー向け権限マトリクス（公開情報は最小限） */
export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const profile = await getCurrentProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const roles = await listRoleCatalog();
    const resources = Object.keys(RESOURCE_LABELS) as ResourceKey[];
    const matrix: Record<
      string,
      Record<string, { level: AccessLevel; label: string }>
    > = {};

    for (const authority of PLATFORM_AUTHORITIES) {
      matrix[authority] = {};
      for (const resource of resources) {
        matrix[authority][resource] = {
          level: PERMISSION_MATRIX[authority][resource],
          label: RESOURCE_LABELS[resource],
        };
      }
    }

    return NextResponse.json({
      roles,
      authorities: PLATFORM_AUTHORITIES.map((key) => ({
        key,
        label: AUTHORITY_LABELS[key],
        description: AUTHORITY_DESCRIPTIONS[key],
      })),
      resources: resources.map((key) => ({
        key,
        label: RESOURCE_LABELS[key],
      })),
      matrix,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
