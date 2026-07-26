import { NextResponse } from "next/server";
import { safeAudit } from "@/lib/audit/audit-service";
import {
  getMyInstructorLicense,
  requestMyLicenseRenewal,
  toJapaneseInstructorLicenseError,
} from "@/lib/instructor-license/instructor-license-service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            "Supabase が設定されていません。本番環境の接続設定を確認してください。",
        },
        { status: 503 },
      );
    }
    const view = await getMyInstructorLicense();
    return NextResponse.json({ view });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseInstructorLicenseError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

export async function POST(request: Request) {
  let body: { action?: string };
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (body.action !== "request_renewal") {
    return NextResponse.json({ error: "操作が不正です" }, { status: 400 });
  }

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const license = await requestMyLicenseRenewal();
    await safeAudit({
      action: "license_update",
      resourceType: "instructor_license",
      resourceId: license.id,
      summary: `ライセンス更新申請（${license.licenseNumber}）`,
      payload: { action: "request_renewal", status: license.status },
    });
    return NextResponse.json({ license });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新申請に失敗しました";
    const mapped = toJapaneseInstructorLicenseError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
