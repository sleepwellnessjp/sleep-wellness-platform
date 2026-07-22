import { NextResponse } from "next/server";
import { recordSystemActivity } from "@/lib/admin/admin-service";
import type { ActivityLogCategory } from "@/lib/admin/types";
import { getCurrentProfile } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const CATEGORIES = new Set<ActivityLogCategory>([
  "login",
  "analysis",
  "pdf",
  "ai",
  "admin",
  "other",
]);

type Body = {
  category?: string;
  action?: string;
  summary?: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
};

/** Authenticated users can append their own activity log entry. */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action || !body.category || !CATEGORIES.has(body.category as ActivityLogCategory)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true });
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await recordSystemActivity({
      category: body.category as ActivityLogCategory,
      action: body.action,
      summary: body.summary,
      targetType: body.targetType,
      targetId: body.targetId,
      payload: body.payload,
      actorId: profile.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
