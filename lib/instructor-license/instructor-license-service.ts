import {
  getCurrentProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  daysUntil,
  EXPIRING_SOON_DAYS,
  generateVerificationCode,
  isInstructorLicenseStatus,
  isInstructorRenewalStatus,
  licenseVerificationUrl,
  renewalConditionText,
  resolveDisplayStatus,
} from "./constants";
import type {
  AdminInstructorLicenseFilters,
  AdminInstructorLicenseListItem,
  InstructorLicenseRecord,
  InstructorLicenseStatus,
  InstructorRenewalStatus,
  MyInstructorLicenseView,
  PublicLicenseVerification,
  UpsertInstructorLicenseInput,
} from "./types";

type LicenseRow = Record<string, unknown>;

function mapLicense(
  row: LicenseRow,
  levelLabel?: string,
): InstructorLicenseRecord {
  const statusRaw = String(row.status ?? "active");
  const renewalRaw = String(row.renewal_status ?? "not_requested");
  const expiresAt = String(row.expires_at ?? "").slice(0, 10);
  const storedStatus = isInstructorLicenseStatus(statusRaw)
    ? statusRaw
    : "active";
  return {
    id: String(row.id),
    instructorId: String(row.instructor_id),
    certificationLevelId: String(row.certification_level_id ?? ""),
    certificationLevelLabel:
      levelLabel ?? String(row.certification_level_id ?? ""),
    certificationName: String(row.certification_name ?? ""),
    licenseNumber: String(row.license_number ?? ""),
    issuedAt: String(row.issued_at ?? "").slice(0, 10),
    expiresAt,
    status: resolveDisplayStatus(storedStatus, expiresAt),
    requiredEducationHours: Number(row.required_education_hours ?? 0),
    completedEducationHours: Number(row.completed_education_hours ?? 0),
    renewalStatus: isInstructorRenewalStatus(renewalRaw)
      ? renewalRaw
      : "not_requested",
    renewalRequestedAt: row.renewal_requested_at
      ? String(row.renewal_requested_at)
      : null,
    adminNote: String(row.admin_note ?? ""),
    verificationCode: String(row.verification_code ?? ""),
    issuerName: String(row.issuer_name ?? "Sleep Wellness Institute Japan"),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function activityNameFromInstructor(row: LicenseRow): string {
  return (
    String(row.public_display_name ?? "").trim() ||
    String(row.display_name ?? "").trim() ||
    "—"
  );
}

export function toJapaneseInstructorLicenseError(message: string): {
  error: string;
  status: number;
} {
  if (message === "Unauthorized" || message === "ログインが必要です") {
    return { error: "ログインが必要です", status: 401 };
  }
  if (message === "Forbidden") {
    return { error: "この操作を行う権限がありません", status: 403 };
  }
  if (message.includes("schema cache") || message.includes("does not exist")) {
    return {
      error:
        "ライセンス用テーブルが未作成です。Supabase SQL Editor でマイグレーションを実行してください。",
      status: 503,
    };
  }
  return { error: message, status: 400 };
}

export async function getMyInstructorLicense(): Promise<MyInstructorLicenseView> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("ログインが必要です");

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const { data: instructor, error: instructorError } = await supabase
    .from("certified_instructors")
    .select(
      "id, display_name, public_display_name, legal_name, email, level_id, user_id",
    )
    .eq("user_id", profile.id)
    .maybeSingle();

  if (instructorError) {
    console.error(
      "[instructor-license] instructor lookup failed:",
      instructorError.message,
    );
    throw new Error("認定講師情報の取得に失敗しました");
  }

  if (!instructor) {
    return {
      license: null,
      activityName: profile.displayName || profile.email || "",
      legalName: "",
      email: profile.email || "",
      daysUntilExpiry: null,
      isExpiringSoon: false,
      renewalCondition: "",
      verificationUrl: null,
      licensePendingSetup: false,
      notCertifiedInstructor: true,
    };
  }

  const instructorRow = instructor as LicenseRow;
  const { data: licenseRow, error: licenseError } = await supabase
    .from("instructor_licenses")
    .select("*")
    .eq("instructor_id", String(instructorRow.id))
    .maybeSingle();

  if (licenseError) {
    console.error(
      "[instructor-license] license lookup failed:",
      licenseError.message,
    );
    if (
      licenseError.message.includes("schema cache") ||
      licenseError.message.includes("does not exist")
    ) {
      throw new Error(toJapaneseInstructorLicenseError(licenseError.message).error);
    }
    throw new Error("ライセンス情報の取得に失敗しました");
  }

  if (!licenseRow) {
    return {
      license: null,
      activityName: activityNameFromInstructor(instructorRow),
      legalName: String(instructorRow.legal_name ?? "").trim(),
      email: String(instructorRow.email ?? profile.email),
      daysUntilExpiry: null,
      isExpiringSoon: false,
      renewalCondition: "",
      verificationUrl: null,
      licensePendingSetup: true,
      notCertifiedInstructor: false,
    };
  }

  const levelId = String(
    (licenseRow as LicenseRow).certification_level_id ?? "",
  );
  let levelLabel = levelId;
  if (levelId) {
    const { data: level } = await supabase
      .from("certification_levels")
      .select("label")
      .eq("id", levelId)
      .maybeSingle();
    if (level?.label) levelLabel = String(level.label);
  }

  const license = mapLicense(licenseRow as LicenseRow, levelLabel);
  const remaining = daysUntil(license.expiresAt);

  return {
    license,
    activityName: activityNameFromInstructor(instructorRow),
    legalName: String(instructorRow.legal_name ?? "").trim(),
    email: String(instructorRow.email ?? profile.email),
    daysUntilExpiry: remaining,
    isExpiringSoon:
      remaining >= 0 && remaining <= EXPIRING_SOON_DAYS &&
      license.status !== "suspended",
    renewalCondition: renewalConditionText(
      license.requiredEducationHours,
      license.completedEducationHours,
    ),
    verificationUrl: license.verificationCode
      ? licenseVerificationUrl(license.verificationCode)
      : null,
    licensePendingSetup: false,
    notCertifiedInstructor: false,
  };
}

export async function requestMyLicenseRenewal(): Promise<InstructorLicenseRecord> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("ログインが必要です");

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const current = await getMyInstructorLicense();
  if (!current.license) {
    throw new Error("ライセンス情報は現在準備中です。事務局へお問い合わせください。");
  }
  if (current.license.status === "suspended") {
    throw new Error("停止中のライセンスは更新申請できません");
  }
  if (current.license.renewalStatus === "requested") {
    throw new Error("すでに更新申請済みです");
  }

  const { data, error } = await supabase.rpc(
    "request_instructor_license_renewal",
    { p_license_id: current.license.id },
  );

  if (error) {
    console.error("[instructor-license] renewal rpc failed:", error.message);
    throw new Error(error.message || "更新申請に失敗しました");
  }

  const row = (Array.isArray(data) ? data[0] : data) as LicenseRow | null;
  if (!row) throw new Error("更新申請に失敗しました");
  return mapLicense(row, current.license.certificationLevelLabel);
}

export async function listAdminInstructorLicenses(
  filters: AdminInstructorLicenseFilters = {},
): Promise<AdminInstructorLicenseListItem[]> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const [{ data: licenses, error: licenseError }, { data: instructors, error: instructorError }, { data: levels }] =
    await Promise.all([
      supabase
        .from("instructor_licenses")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("certified_instructors")
        .select(
          "id, user_id, display_name, public_display_name, legal_name, email, level_id",
        ),
      supabase.from("certification_levels").select("id, label"),
    ]);

  if (licenseError) {
    console.error(
      "[instructor-license] admin list failed:",
      licenseError.message,
    );
    throw new Error(
      licenseError.message.includes("schema cache") ||
        licenseError.message.includes("does not exist")
        ? toJapaneseInstructorLicenseError(licenseError.message).error
        : "ライセンス一覧の取得に失敗しました",
    );
  }
  if (instructorError) {
    console.error(
      "[instructor-license] instructors failed:",
      instructorError.message,
    );
    throw new Error("認定講師一覧の取得に失敗しました");
  }

  const levelLabelById = new Map<string, string>();
  for (const level of levels ?? []) {
    levelLabelById.set(String(level.id), String(level.label));
  }

  const instructorById = new Map<string, LicenseRow>();
  for (const row of instructors ?? []) {
    instructorById.set(String((row as LicenseRow).id), row as LicenseRow);
  }

  const nameQ = (filters.nameQ ?? "").trim().toLowerCase();
  const emailQ = (filters.emailQ ?? "").trim().toLowerCase();
  const level = filters.level ?? "all";
  const status = filters.status ?? "all";
  const expiry = filters.expiry ?? "all";

  return (licenses ?? [])
    .map((row) => {
      const mapped = mapLicense(
        row as LicenseRow,
        levelLabelById.get(String((row as LicenseRow).certification_level_id)) ??
          undefined,
      );
      const instructor = instructorById.get(mapped.instructorId);
      return {
        ...mapped,
        activityName: instructor
          ? activityNameFromInstructor(instructor)
          : "—",
        legalName: instructor
          ? String(instructor.legal_name ?? "").trim()
          : "",
        email: instructor ? String(instructor.email ?? "") : "",
        userId: instructor ? String(instructor.user_id ?? "") : "",
      } satisfies AdminInstructorLicenseListItem;
    })
    .filter((item) => {
      if (level !== "all" && item.certificationLevelId !== level) return false;
      if (status !== "all" && item.status !== status) return false;
      if (nameQ) {
        const hay = `${item.activityName} ${item.legalName}`.toLowerCase();
        if (!hay.includes(nameQ)) return false;
      }
      if (emailQ && !item.email.toLowerCase().includes(emailQ)) return false;
      const remaining = daysUntil(item.expiresAt);
      if (expiry === "within_90") {
        if (!(remaining >= 0 && remaining <= EXPIRING_SOON_DAYS)) return false;
      } else if (expiry === "expired") {
        if (remaining >= 0 && item.status !== "expired") return false;
      } else if (expiry === "over_90") {
        if (!(remaining > EXPIRING_SOON_DAYS)) return false;
      }
      return true;
    });
}

export async function listInstructorsWithoutLicense(): Promise<
  Array<{
    id: string;
    activityName: string;
    legalName: string;
    email: string;
    levelId: string;
    instructorNumber: string;
    certifiedAt: string;
    renewsAt: string;
  }>
> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const [{ data: instructors }, { data: licenses }] = await Promise.all([
    supabase
      .from("certified_instructors")
      .select(
        "id, display_name, public_display_name, legal_name, email, level_id, instructor_number, certified_at, renews_at",
      )
      .order("display_name", { ascending: true }),
    supabase.from("instructor_licenses").select("instructor_id"),
  ]);

  const licensed = new Set(
    (licenses ?? []).map((row) => String((row as LicenseRow).instructor_id)),
  );

  return (instructors ?? [])
    .filter((row) => !licensed.has(String((row as LicenseRow).id)))
    .map((row) => {
      const r = row as LicenseRow;
      return {
        id: String(r.id),
        activityName: activityNameFromInstructor(r),
        legalName: String(r.legal_name ?? "").trim(),
        email: String(r.email ?? ""),
        levelId: String(r.level_id ?? ""),
        instructorNumber: String(r.instructor_number ?? ""),
        certifiedAt: String(r.certified_at ?? "").slice(0, 10),
        renewsAt: String(r.renews_at ?? "").slice(0, 10),
      };
    });
}

export async function upsertAdminInstructorLicense(
  input: UpsertInstructorLicenseInput,
): Promise<InstructorLicenseRecord> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  if (!input.instructorId?.trim()) {
    throw new Error("認定講師を選択してください");
  }
  if (!input.certificationLevelId?.trim()) {
    throw new Error("認定レベルを選択してください");
  }
  if (!input.licenseNumber?.trim()) {
    throw new Error("認定番号を入力してください");
  }
  if (!isInstructorLicenseStatus(input.status)) {
    throw new Error("ライセンス状態が不正です");
  }

  const renewalStatus: InstructorRenewalStatus =
    input.renewalStatus && isInstructorRenewalStatus(input.renewalStatus)
      ? input.renewalStatus
      : "not_requested";

  const payload = {
    instructor_id: input.instructorId.trim(),
    certification_level_id: input.certificationLevelId.trim(),
    certification_name: input.certificationName.trim(),
    license_number: input.licenseNumber.trim(),
    issued_at: input.issuedAt.slice(0, 10),
    expires_at: input.expiresAt.slice(0, 10),
    status: input.status as InstructorLicenseStatus,
    required_education_hours: Number(input.requiredEducationHours) || 0,
    completed_education_hours: Number(input.completedEducationHours) || 0,
    renewal_status: renewalStatus,
    admin_note: (input.adminNote ?? "").trim(),
    verification_code: generateVerificationCode(),
  };

  if (input.id) {
    const updateBody: Database["public"]["Tables"]["instructor_licenses"]["Update"] =
      {
        instructor_id: payload.instructor_id,
        certification_level_id: payload.certification_level_id,
        certification_name: payload.certification_name,
        license_number: payload.license_number,
        issued_at: payload.issued_at,
        expires_at: payload.expires_at,
        status: payload.status,
        required_education_hours: payload.required_education_hours,
        completed_education_hours: payload.completed_education_hours,
        renewal_status: payload.renewal_status,
        admin_note: payload.admin_note,
      };
    if (renewalStatus === "requested") {
      updateBody.renewal_requested_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from("instructor_licenses")
      .update(updateBody)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("[instructor-license] update failed:", error?.message);
      throw new Error(error?.message || "ライセンスの更新に失敗しました");
    }
    return mapLicense(data as LicenseRow);
  }

  const { data, error } = await supabase
    .from("instructor_licenses")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[instructor-license] insert failed:", error?.message);
    throw new Error(error?.message || "ライセンスの登録に失敗しました");
  }
  return mapLicense(data as LicenseRow);
}

export async function decideAdminRenewal(
  licenseId: string,
  decision: "approved" | "rejected",
  adminNote?: string,
): Promise<InstructorLicenseRecord> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const { data: existing, error: fetchError } = await supabase
    .from("instructor_licenses")
    .select("*")
    .eq("id", licenseId)
    .single();

  if (fetchError || !existing) {
    throw new Error("ライセンスが見つかりません");
  }

  const current = mapLicense(existing as LicenseRow);
  const patch: Database["public"]["Tables"]["instructor_licenses"]["Update"] = {
    renewal_status: decision,
    admin_note:
      adminNote !== undefined ? adminNote.trim() : current.adminNote,
  };

  if (decision === "approved") {
    const nextExpires = new Date(`${current.expiresAt}T00:00:00`);
    if (!Number.isNaN(nextExpires.getTime())) {
      nextExpires.setFullYear(nextExpires.getFullYear() + 1);
      patch.expires_at = nextExpires.toISOString().slice(0, 10);
    }
    patch.status = "active";
    patch.completed_education_hours = 0;
  } else {
    const remaining = daysUntil(current.expiresAt);
    patch.status =
      remaining < 0
        ? "expired"
        : remaining <= EXPIRING_SOON_DAYS
          ? "expiring"
          : "active";
  }

  const { data, error } = await supabase
    .from("instructor_licenses")
    .update(patch)
    .eq("id", licenseId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[instructor-license] renewal decide failed:", error?.message);
    throw new Error("更新申請の処理に失敗しました");
  }
  return mapLicense(data as LicenseRow);
}

export async function verifyInstructorLicensePublic(
  code: string,
): Promise<PublicLicenseVerification | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const { data, error } = await supabase.rpc("verify_instructor_license", {
    p_code: trimmed,
  });

  if (error) {
    console.error("[instructor-license] verify failed:", error.message);
    throw new Error("認定証の検証に失敗しました");
  }

  const row = (Array.isArray(data) ? data[0] : data) as LicenseRow | null;
  if (!row) return null;

  const statusRaw = String(row.status ?? "active");
  return {
    licenseNumber: String(row.license_number ?? ""),
    certificationName: String(row.certification_name ?? ""),
    holderName: String(row.holder_name ?? ""),
    issuedAt: String(row.issued_at ?? "").slice(0, 10),
    expiresAt: String(row.expires_at ?? "").slice(0, 10),
    status: isInstructorLicenseStatus(statusRaw) ? statusRaw : "active",
    issuerName: String(row.issuer_name ?? "Sleep Wellness Institute Japan"),
  };
}
