import { NextResponse } from "next/server";
import { listDemoAdminInstructors } from "@/lib/admin/demo-admin-store";
import { listAdminInstructors } from "@/lib/admin/admin-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  grantDemoCredits,
  updateDemoMembership,
} from "@/lib/platform/demo-platform-store";
import {
  grantCredits,
  requireAdminProfile,
  updateMembership,
} from "@/lib/platform/platform-service";
import type { MembershipStatus } from "@/lib/platform/types";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ instructors: listDemoAdminInstructors() });
    }
    const instructors = await listAdminInstructors();
    return NextResponse.json({ instructors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

type Body = {
  userId?: string;
  amount?: number;
  status?: MembershipStatus;
  expiresAt?: string | null;
  adminMemo?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      const actor = { id: "demo-super-admin" };
      if (typeof body.amount === "number" && body.amount > 0) {
        grantDemoCredits({
          userId: body.userId,
          amount: body.amount,
          actorId: actor.id,
        });
      }
      if (
        body.status ||
        body.expiresAt !== undefined ||
        body.adminMemo !== undefined
      ) {
        updateDemoMembership({
          userId: body.userId,
          status: body.status,
          expiresAt: body.expiresAt,
          adminMemo: body.adminMemo,
          actorId: actor.id,
        });
      }
      return NextResponse.json({ ok: true });
    }

    const actor = await requireAdminProfile();

    if (typeof body.amount === "number" && body.amount > 0) {
      await grantCredits({
        targetUserId: body.userId,
        amount: body.amount,
        actorId: actor.id,
      });
    }

    if (
      body.status ||
      body.expiresAt !== undefined ||
      body.adminMemo !== undefined
    ) {
      await updateMembership({
        targetUserId: body.userId,
        status: body.status,
        expiresAt: body.expiresAt,
        adminMemo: body.adminMemo,
        actorId: actor.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
