import { NextResponse } from "next/server";
import { safeAudit } from "@/lib/audit/audit-service";
import {
  addYearsIso,
  isInstructorLicenseStatus,
  isInstructorRenewalStatus,
  todayIso,
} from "@/lib/instructor-license/constants";
import {
  decideAdminRenewal,
  listAdminInstructorLicenses,
  listInstructorsWithoutLicense,
  toJapaneseInstructorLicenseError,
  upsertAdminInstructorLicense,
} from "@/lib/instructor-license/instructor-license-service";
import type {
  InstructorLicenseStatus,
  InstructorRenewalStatus,
  UpsertInstructorLicenseInput,
} from "@/lib/instructor-license/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nameQ = searchParams.get("nameQ") ?? "";
  const emailQ = searchParams.get("emailQ") ?? "";
  const status = searchParams.get("status") ?? "all";
  const level = searchParams.get("level") ?? "all";
  const expiry = (searchParams.get("expiry") ?? "all") as
    | "all"
    | "within_90"
    | "expired"
    | "over_90";
  const includeCandidates = searchParams.get("candidates") === "1";

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    const [licenses, candidates] = await Promise.all([
      listAdminInstructorLicenses({ nameQ, emailQ, status, level, expiry }),
      includeCandidates ? listInstructorsWithoutLicense() : Promise.resolve([]),
    ]);

    return NextResponse.json({ licenses, candidates });
  } catch (error) {
    const mapped = toJapaneseInstructorLicenseError(error);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

type UpsertBody = {
  id?: string;
  instructorId?: string;
  certificationLevelId?: string;
  certificationName?: string;
  licenseNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: string;
  requiredEducationHours?: number;
  completedEducationHours?: number;
  renewalStatus?: string;
  adminNote?: string;
};

export async function POST(request: Request) {
  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    );
  }

  const status = body.status ?? "active";
  if (!isInstructorLicenseStatus(status)) {
    return NextResponse.json(
      { error: "ライセンス状態が不正です" },
      { status: 400 },
    );
  }

  const issuedAt = (body.issuedAt ?? todayIso()).slice(0, 10);
  const input: UpsertInstructorLicenseInput = {
    id: body.id,
    instructorId: (body.instructorId ?? "").trim(),
    certificationLevelId: (body.certificationLevelId ?? "").trim(),
    certificationName: (body.certificationName ?? "").trim(),
    licenseNumber: (body.licenseNumber ?? "").trim(),
    issuedAt,
    expiresAt: (body.expiresAt ?? addYearsIso(issuedAt, 1)).slice(0, 10),
    status: status as InstructorLicenseStatus,
    requiredEducationHours: Number(body.requiredEducationHours ?? 0),
    completedEducationHours: Number(body.completedEducationHours ?? 0),
    renewalStatus:
      body.renewalStatus && isInstructorRenewalStatus(body.renewalStatus)
        ? (body.renewalStatus as InstructorRenewalStatus)
        : "not_requested",
    adminNote: body.adminNote,
  };

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const license = await upsertAdminInstructorLicense(input);
    await safeAudit({
      action: "license_update",
      resourceType: "instructor_license",
      resourceId: license.id,
      summary: `${input.id ? "更新" : "登録"}: ${license.licenseNumber}`,
      payload: { status: license.status, level: license.certificationLevelId },
    });
    return NextResponse.json(
      { license },
      { status: input.id ? 200 : 201 },
    );
  } catch (error) {
    const mapped = toJapaneseInstructorLicenseError(error);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}

type PatchBody = {
  id?: string;
  action?: "approve_renewal" | "reject_renewal" | "save";
  certificationLevelId?: string;
  certificationName?: string;
  licenseNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: string;
  requiredEducationHours?: number;
  completedEducationHours?: number;
  renewalStatus?: string;
  adminNote?: string;
  instructorId?: string;
};

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

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }

    if (body.action === "approve_renewal" || body.action === "reject_renewal") {
      const license = await decideAdminRenewal(
        body.id,
        body.action === "approve_renewal" ? "approved" : "rejected",
        body.adminNote,
      );
      await safeAudit({
        action: "license_update",
        resourceType: "instructor_license",
        resourceId: license.id,
        summary: `更新申請を${body.action === "approve_renewal" ? "承認" : "却下"}（${license.licenseNumber}）`,
        payload: { action: body.action, renewalStatus: license.renewalStatus },
      });
      return NextResponse.json({ license });
    }

    if (!body.instructorId || !body.certificationLevelId || !body.status) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 },
      );
    }
    if (!isInstructorLicenseStatus(body.status)) {
      return NextResponse.json(
        { error: "ライセンス状態が不正です" },
        { status: 400 },
      );
    }

    const license = await upsertAdminInstructorLicense({
      id: body.id,
      instructorId: body.instructorId,
      certificationLevelId: body.certificationLevelId,
      certificationName: body.certificationName ?? "",
      licenseNumber: body.licenseNumber ?? "",
      issuedAt: body.issuedAt ?? todayIso(),
      expiresAt: body.expiresAt ?? addYearsIso(todayIso(), 1),
      status: body.status as InstructorLicenseStatus,
      requiredEducationHours: Number(body.requiredEducationHours ?? 0),
      completedEducationHours: Number(body.completedEducationHours ?? 0),
      renewalStatus:
        body.renewalStatus && isInstructorRenewalStatus(body.renewalStatus)
          ? (body.renewalStatus as InstructorRenewalStatus)
          : undefined,
      adminNote: body.adminNote,
    });

    await safeAudit({
      action: "license_update",
      resourceType: "instructor_license",
      resourceId: license.id,
      summary: `ライセンス編集（${license.licenseNumber}）`,
      payload: { status: license.status },
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
