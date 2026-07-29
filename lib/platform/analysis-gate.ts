import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  checkDemoAnalysisAccess,
  consumeDemoAnalysisCredit,
  getDemoPlatformMe,
} from "./demo-platform-store";
import {
  buildAccessStatus,
  consumeAnalysisCredit,
  getCurrentProfile,
  getPlatformMe,
} from "./platform-service";
import type { PlatformAccessStatus, PlatformMeResponse } from "./types";

/** localhost（next dev）のみ。Vercel 本番・プレビューでは false。 */
function isLocalDevAuthBypass(): boolean {
  return process.env.NODE_ENV === "development";
}

const LOCAL_DEV_ACCESS: PlatformAccessStatus = {
  allowed: true,
  reason: "demo",
  message: "開発環境: 認証をスキップしています。",
  remainingCredits: 999,
  membershipStatus: null,
  role: "instructor",
};

export async function fetchPlatformMe(): Promise<PlatformMeResponse | null> {
  if (!isSupabaseConfigured()) {
    return getDemoPlatformMe("instructor");
  }
  return getPlatformMe();
}

export async function checkAnalysisAccess(): Promise<PlatformAccessStatus> {
  if (!isSupabaseConfigured()) {
    return checkDemoAnalysisAccess("instructor");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    if (isLocalDevAuthBypass()) {
      return LOCAL_DEV_ACCESS;
    }
    return {
      allowed: false,
      reason: "unauthenticated",
      message: "ログインが必要です。",
      remainingCredits: 0,
      membershipStatus: null,
      role: "instructor",
    };
  }

  return buildAccessStatus(profile);
}

export async function recordAnalysisUsage(input: {
  clientName: string;
  measurementDate?: string;
  sleepScore?: number | null;
  clientId?: string;
  analysisId?: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return consumeDemoAnalysisCredit(input);
  }
  if (isLocalDevAuthBypass()) {
    const profile = await getCurrentProfile();
    if (!profile) {
      return {
        ok: true,
        message: "開発環境: クレジット消費をスキップしました。",
      };
    }
  }
  return consumeAnalysisCredit(input);
}
