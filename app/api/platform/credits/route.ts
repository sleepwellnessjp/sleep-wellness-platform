import { NextResponse } from "next/server";
import { getCreditBalance, getCurrentUserId } from "@/lib/platform/platform-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  currentYearMonth,
  MONTHLY_CREDIT_ALLOWANCE,
} from "@/lib/platform/constants";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      remaining: MONTHLY_CREDIT_ALLOWANCE,
      granted: MONTHLY_CREDIT_ALLOWANCE,
      used: 0,
      yearMonth: currentYearMonth(),
      demo: true,
    });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const balance = await getCreditBalance(userId);
  return NextResponse.json(balance);
}
