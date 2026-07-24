import { NextResponse } from "next/server";
import { safeAudit } from "@/lib/audit/audit-service";
import { isCertificationLevel } from "@/lib/license/constants";
import {
  buildDemoLicensesCsv,
  issueDemoLicense,
  listDemoAdminLicenses,
  updateDemoLicenseAdmin,
} from "@/lib/license/demo-license-store";
import {
  buildLicensesCsv,
  issueLicense,
  listAdminLicenses,
  toJapaneseAuthError,
  updateLicenseAdmin,
} from "@/lib/license/license-service";
import type {
  AdminLicenseAction,
  BillingCycle,
  IssueLicenseInput,
  UpdateLicenseAdminInput,
} from "@/lib/license/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const level = searchParams.get("level") ?? "all";
  const format = searchParams.get("format") ?? "json";

  try {
    if (!isSupabaseConfigured()) {
      const licenses = listDemoAdminLicenses({ q, status, level });
      if (format === "csv") {
        const csv = buildDemoLicensesCsv(licenses);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="swij-licenses.csv"',
          },
        });
      }
      return NextResponse.json({ licenses });
    }

    const licenses = await listAdminLicenses({ q, status, level });
    if (format === "csv") {
      const csv = buildLicensesCsv(licenses);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="swij-licenses.csv"',
        },
      });
    }
    return NextResponse.json({ licenses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

type IssueBody = {
  userId?: string;
  userEmail?: string | null;
  userDisplayName?: string | null;
  certificationLevel?: string;
  certifiedAt?: string;
  expiresAt?: string;
  adminMemo?: string;
  billingCycle?: string;
};

export async function POST(request: Request) {
  let body: IssueBody;
  try {
    body = (await request.json()) as IssueBody;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  const level = body.certificationLevel ?? "";
  if (!body.userId?.trim()) {
    return NextResponse.json(
      { error: "対象ユーザー ID を入力してください" },
      { status: 400 },
    );
  }
  if (!isCertificationLevel(level)) {
    return NextResponse.json(
      { error: "認定レベルを選択してください" },
      { status: 400 },
    );
  }

  const input: IssueLicenseInput = {
    userId: body.userId.trim(),
    userEmail: body.userEmail ?? null,
    userDisplayName: body.userDisplayName ?? null,
    certificationLevel: level,
    certifiedAt: body.certifiedAt,
    expiresAt: body.expiresAt,
    adminMemo: body.adminMemo,
    billingCycle:
      body.billingCycle === "monthly" || body.billingCycle === "yearly"
        ? (body.billingCycle as BillingCycle)
        : "yearly",
  };

  try {
    if (!isSupabaseConfigured()) {
      const license = issueDemoLicense(input, "admin@swij.local");
      await safeAudit({
        action: "license_update",
        resourceType: "license",
        resourceId: license.id,
        summary: `ライセンスを発行しました（${license.licenseNumber}）`,
        payload: { action: "issued", level: license.certificationLevel },
      });
      return NextResponse.json({ license }, { status: 201 });
    }
    const license = await issueLicense(input);
    await safeAudit({
      action: "license_update",
      resourceType: "license",
      resourceId: license.id,
      summary: `ライセンスを発行しました（${license.licenseNumber}）`,
      payload: { action: "issued", level: license.certificationLevel },
    });
    return NextResponse.json({ license }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "発行に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}

type PatchBody = {
  id?: string;
  action?: string;
  certificationLevel?: string;
  expiresAt?: string;
  adminMemo?: string;
  note?: string;
  hoursCompleted?: number;
  creditsEarned?: number;
};

const ACTIONS = new Set([
  "renew",
  "suspend",
  "revoke",
  "reactivate",
]);

export async function PATCH(request: Request) {
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "対象が指定されていません" },
      { status: 400 },
    );
  }

  if (body.action !== undefined && !ACTIONS.has(body.action)) {
    return NextResponse.json(
      { error: "操作が不正です" },
      { status: 400 },
    );
  }

  if (
    body.certificationLevel !== undefined &&
    !isCertificationLevel(body.certificationLevel)
  ) {
    return NextResponse.json(
      { error: "認定レベルが不正です" },
      { status: 400 },
    );
  }

  const input: UpdateLicenseAdminInput = {
    id: body.id,
    action: body.action as AdminLicenseAction | undefined,
    certificationLevel: body.certificationLevel as
      | IssueLicenseInput["certificationLevel"]
      | undefined,
    expiresAt: body.expiresAt,
    adminMemo: body.adminMemo,
    note: body.note,
    hoursCompleted: body.hoursCompleted,
    creditsEarned: body.creditsEarned,
  };

  try {
    if (!isSupabaseConfigured()) {
      const license = updateDemoLicenseAdmin(input, "admin@swij.local");
      await safeAudit({
        action: "license_update",
        resourceType: "license",
        resourceId: license.id,
        summary: `ライセンスを更新しました（${license.licenseNumber}）`,
        payload: { action: body.action ?? "updated", status: license.status },
      });
      return NextResponse.json({ license });
    }
    const license = await updateLicenseAdmin(input);
    await safeAudit({
      action: "license_update",
      resourceType: "license",
      resourceId: license.id,
      summary: `ライセンスを更新しました（${license.licenseNumber}）`,
      payload: { action: body.action ?? "updated", status: license.status },
    });
    return NextResponse.json({ license });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新に失敗しました";
    const mapped = toJapaneseAuthError(message);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
