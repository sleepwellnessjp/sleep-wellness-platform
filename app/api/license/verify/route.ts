import { NextResponse } from "next/server";
import { verifyInstructorLicensePublic } from "@/lib/instructor-license/instructor-license-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const result = await verifyInstructorLicensePublic(code);
    if (!result) {
      return NextResponse.json(
        { error: "該当する認定証が見つかりません" },
        { status: 404 },
      );
    }
    return NextResponse.json({ verification: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "検証に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
