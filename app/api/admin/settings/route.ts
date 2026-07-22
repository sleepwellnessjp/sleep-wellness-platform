import { NextResponse } from "next/server";
import {
  getDemoPlatformSettings,
  updateDemoPlatformSettings,
} from "@/lib/admin/demo-admin-store";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/lib/admin/admin-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ settings: getDemoPlatformSettings() });
    }
    const settings = await getPlatformSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

type Body = {
  brandPrimary?: string;
  brandAccent?: string;
  logoUrl?: string;
  termsOfService?: string;
  privacyPolicy?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactNote?: string;
};

export async function PUT(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      const settings = updateDemoPlatformSettings(body);
      return NextResponse.json({ settings });
    }
    const settings = await updatePlatformSettings(body);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
