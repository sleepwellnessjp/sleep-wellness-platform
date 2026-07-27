import { NextResponse } from "next/server";
import {
  issueAdminInstructorLicense,
  listAdminCertifiedInstructors,
  renewAdminInstructorLicenseOneYear,
  setAdminInstructorLicenseStatus,
  toJapaneseInstructorLicenseError,
  upsertAdminCertifiedInstructor,
  decideAdminRenewal,
} from "@/lib/instructor-license/instructor-license-service";
import { isInstructorLicenseStatus } from "@/lib/instructor-license/constants";
import type { UpsertCertifiedInstructorInput } from "@/lib/instructor-license/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase が設定されていません" },
        { status: 503 },
      );
    }
    const instructors = await listAdminCertifiedInstructors();
    return NextResponse.json({ instructors });
  } catch (error) {
    const mapped = toJapaneseInstructorLicenseError(error);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status === 400 ? 500 : mapped.status },
    );
  }
}

type Body = {
  action?:
    | "upsert_instructor"
    | "issue_license"
    | "set_license_status"
    | "renew_one_year"
    | "approve_renewal"
    | "reject_renewal";
  instructor?: UpsertCertifiedInstructorInput;
  instructorId?: string;
  licenseId?: string;
  status?: string;
  levelId?: string;
  issuedAt?: string;
  expiresAt?: string;
  adminNote?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が正しくありません" },
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

    const action = body.action ?? "upsert_instructor";

    if (action === "upsert_instructor") {
      if (!body.instructor) {
        return NextResponse.json(
          { error: "講師情報が必要です" },
          { status: 400 },
        );
      }
      const instructor = await upsertAdminCertifiedInstructor(body.instructor);
      return NextResponse.json(
        { instructor },
        { status: body.instructor.id ? 200 : 201 },
      );
    }

    if (action === "issue_license") {
      const instructorId = body.instructorId?.trim() ?? "";
      if (!instructorId) {
        return NextResponse.json(
          { error: "認定講師 ID が必要です" },
          { status: 400 },
        );
      }
      const license = await issueAdminInstructorLicense(instructorId, {
        issuedAt: body.issuedAt,
        expiresAt: body.expiresAt,
        levelId: body.levelId,
      });
      return NextResponse.json({ license }, { status: 201 });
    }

    if (action === "set_license_status") {
      const licenseId = body.licenseId?.trim() ?? "";
      if (!licenseId || !body.status || !isInstructorLicenseStatus(body.status)) {
        return NextResponse.json(
          { error: "ライセンス ID と状態が必要です" },
          { status: 400 },
        );
      }
      const license = await setAdminInstructorLicenseStatus(
        licenseId,
        body.status,
      );
      return NextResponse.json({ license });
    }

    if (action === "renew_one_year") {
      const licenseId = body.licenseId?.trim() ?? "";
      if (!licenseId) {
        return NextResponse.json(
          { error: "ライセンス ID が必要です" },
          { status: 400 },
        );
      }
      const license = await renewAdminInstructorLicenseOneYear(licenseId);
      return NextResponse.json({ license });
    }

    if (action === "approve_renewal" || action === "reject_renewal") {
      const licenseId = body.licenseId?.trim() ?? "";
      if (!licenseId) {
        return NextResponse.json(
          { error: "ライセンス ID が必要です" },
          { status: 400 },
        );
      }
      const license = await decideAdminRenewal(
        licenseId,
        action === "approve_renewal" ? "approved" : "rejected",
        body.adminNote,
      );
      return NextResponse.json({ license });
    }

    return NextResponse.json({ error: "不明なアクションです" }, { status: 400 });
  } catch (error) {
    const mapped = toJapaneseInstructorLicenseError(error);
    return NextResponse.json(
      { error: mapped.error },
      { status: mapped.status },
    );
  }
}
