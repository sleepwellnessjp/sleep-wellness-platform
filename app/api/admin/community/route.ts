import { NextResponse } from "next/server";
import {
  deleteCommunityContent,
  loadAdminCommunityOverview,
} from "@/lib/repositories/community-repository";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      await requireAdminProfile();
    }
    const overview = await loadAdminCommunityOverview();
    return NextResponse.json({ overview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    if (isSupabaseConfigured()) {
      await requireAdminProfile();
    }
    const body = (await request.json()) as {
      kind?: "discussion" | "case" | "comment";
      id?: string;
    };
    if (!body.kind || !body.id) {
      return NextResponse.json(
        { error: "kind と id が必要です" },
        { status: 400 },
      );
    }
    await deleteCommunityContent(body.kind, body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
