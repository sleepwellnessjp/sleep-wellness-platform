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
          errorType: "unavailable",
          path: "public.certified_instructors",
        },
        { status: 503 },
      );
    }
    const view = await getMyInstructorLicense();
    return NextResponse.json({ view });
  } catch (error) {
    const mapped = toJapaneseInstructorLicenseError(error);
    const diagnostic = mapped.diagnostic;
    console.error("[api/license] GET failed", {
      path: diagnostic?.path ?? "/api/license",
      filter: diagnostic?.filter ?? null,
      uid: diagnostic?.uid ?? null,
      category: diagnostic?.category ?? null,
      code: diagnostic?.code ?? null,
      supabaseMessage: diagnostic?.supabaseMessage ?? null,
      details: diagnostic?.details ?? null,
      hint: diagnostic?.hint ?? null,
      rls:
        diagnostic?.category === "rls"
          ? "RLS/権限エラー候補（policy・grant・auth.uid 不一致）"
          : diagnostic?.filter &&
              typeof diagnostic.filter === "object" &&
              "rls" in diagnostic.filter
            ? String((diagnostic.filter as { rls?: unknown }).rls ?? "")
            : null,
      mappedError: mapped.error,
      errorType: mapped.errorType,
      status: mapped.status,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: mapped.error,
        errorType: mapped.errorType ?? "fetch",
        path: diagnostic?.path ?? "public.certified_instructors",
        filter: diagnostic?.filter ?? null,
        uid: diagnostic?.uid ?? null,
        category: diagnostic?.category ?? null,
        code: diagnostic?.code ?? null,
        supabaseMessage: diagnostic?.supabaseMessage ?? null,
        details: diagnostic?.details ?? null,
        hint: diagnostic?.hint ?? null,
      },
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
    const mapped = toJapaneseInstructorLicenseError(error);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
