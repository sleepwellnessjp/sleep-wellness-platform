import {
  getCurrentProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { generateCertificateNumber } from "@/lib/academy/scoring";
import {
  daysUntil,
  EXPIRING_SOON_DAYS,
  generateVerificationCode,
  isInstructorLicenseStatus,
  isInstructorRenewalStatus,
  LICENSE_ISSUER_ORG,
  licenseVerificationUrl,
  renewalConditionText,
  resolveActivityName,
  resolveCertificationName,
  resolveDisplayStatus,
  SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME,
  toPublicLicenseStatusLabel,
  toPublicLicenseVerdict,
} from "./constants";
import type {
  AdminCertifiedInstructorListItem,
  AdminInstructorLicenseFilters,
  AdminInstructorLicenseListItem,
  CreateAdminCertifiedInstructorInput,
  InstructorLicenseRecord,
  InstructorLicenseStatus,
  InstructorRenewalStatus,
  MyInstructorLicenseView,
  PublicLicenseVerification,
  UpsertCertifiedInstructorInput,
  UpsertInstructorLicenseInput,
} from "./types";

type LicenseRow = Record<string, unknown>;

/** エラー分類（調査用） */
export type LicenseErrorCategory =
  | "not_registered"
  | "rls"
  | "query"
  | "column_mismatch";

export type LicenseLookupDiagnostic = {
  category: LicenseErrorCategory;
  path: string;
  filter: Record<string, unknown>;
  uid: string | null;
  code: string | null;
  supabaseMessage: string;
  details: string | null;
  hint: string | null;
};

const CERTIFIED_INSTRUCTOR_SELECT =
  "id, display_name, public_name, public_display_name, legal_name, email, level_id, user_id, instructor_number, certified_at, renews_at, status, admin_memo";

const CERTIFIED_INSTRUCTORS_PATH = "public.certified_instructors";
const INSTRUCTOR_LICENSES_PATH = "public.instructor_licenses";

const MSG_NOT_REGISTERED = "ライセンス情報はまだ登録されていません";
const MSG_FETCH_FAILED = "認定講師情報を取得できませんでした";

function isMissingRelationError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("could not find the table") ||
    (m.includes("schema cache") && m.includes("table")) ||
    /relation ["'].*["'] does not exist/i.test(message)
  );
}

function isMissingColumnError(message: string, code?: string): boolean {
  if (code === "42703") return true;
  const m = message.toLowerCase();
  return (
    (m.includes("could not find the") && m.includes("column")) ||
    /column ["'].*["'] does not exist/i.test(message) ||
    (m.includes("schema cache") && m.includes("column"))
  );
}

function isRlsOrPermissionError(message: string, code?: string): boolean {
  if (code === "42501" || code === "PGRST301") return true;
  const m = message.toLowerCase();
  return (
    m.includes("permission denied") ||
    m.includes("row-level security") ||
    m.includes("rls") ||
    m.includes("new row violates row-level security")
  );
}

export function classifyLicenseSupabaseError(
  error: { message: string; code?: string },
): LicenseErrorCategory {
  if (isMissingColumnError(error.message, error.code)) {
    return "column_mismatch";
  }
  if (isRlsOrPermissionError(error.message, error.code)) {
    return "rls";
  }
  return "query";
}

export class InstructorLicenseLookupError extends Error {
  readonly diagnostic: LicenseLookupDiagnostic;

  constructor(
    userMessage: string,
    diagnostic: LicenseLookupDiagnostic,
  ) {
    super(userMessage);
    this.name = "InstructorLicenseLookupError";
    this.diagnostic = diagnostic;
  }
}

function logLicenseLookupError(
  label: string,
  diagnostic: LicenseLookupDiagnostic,
  extras?: Record<string, unknown>,
) {
  console.error(`[instructor-license] ${label}`, {
    category: diagnostic.category,
    path: diagnostic.path,
    filter: diagnostic.filter,
    uid: diagnostic.uid,
    code: diagnostic.code,
    supabaseMessage: diagnostic.supabaseMessage,
    details: diagnostic.details,
    hint: diagnostic.hint,
    rlsNote:
      diagnostic.category === "rls"
        ? "RLS/権限エラーの可能性（policy / grant / auth.uid 不一致）"
        : null,
    ...extras,
  });
}

function logLicenseSupabaseResult(
  label: string,
  meta: {
    path: string;
    filter: Record<string, unknown>;
    uid: string | null;
    data: unknown;
    error: { message: string; code?: string; details?: string; hint?: string } | null;
  },
) {
  const hasRow =
    meta.data != null &&
    !(Array.isArray(meta.data) && meta.data.length === 0);
  console.info(`[instructor-license] ${label}`, {
    path: meta.path,
    filter: meta.filter,
    uid: meta.uid,
    hasData: hasRow,
    dataPreview: hasRow
      ? Array.isArray(meta.data)
        ? { count: meta.data.length, firstKeys: Object.keys((meta.data[0] as object) ?? {}) }
        : { keys: Object.keys((meta.data as object) ?? {}) }
      : null,
    error: meta.error
      ? {
          code: meta.error.code ?? null,
          message: meta.error.message,
          details: meta.error.details ?? null,
          hint: meta.error.hint ?? null,
          category: classifyLicenseSupabaseError(meta.error),
        }
      : null,
  });
}

function toLookupDiagnostic(
  path: string,
  filter: Record<string, unknown>,
  uid: string | null,
  error: { message: string; code?: string; details?: string; hint?: string },
  category?: LicenseErrorCategory,
): LicenseLookupDiagnostic {
  return {
    category: category ?? classifyLicenseSupabaseError(error),
    path,
    filter,
    uid,
    code: error.code ?? null,
    supabaseMessage: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

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
    certificationName: resolveCertificationName(
      String(row.certification_name ?? ""),
    ),
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
    issuerName: String(row.issuer_name ?? LICENSE_ISSUER_ORG),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function legalNameFromInstructor(row: LicenseRow): string {
  return String(row.legal_name ?? "").trim();
}

function buildMyLicenseView(
  profile: { email?: string | null },
  instructorRow: LicenseRow,
  license: InstructorLicenseRecord,
): MyInstructorLicenseView {
  const remaining = daysUntil(license.expiresAt);
  return {
    license,
    activityName: activityNameFromInstructor(instructorRow),
    legalName: legalNameFromInstructor(instructorRow),
    email: String(instructorRow.email ?? profile.email ?? ""),
    daysUntilExpiry: remaining,
    isExpiringSoon:
      remaining >= 0 &&
      remaining <= EXPIRING_SOON_DAYS &&
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

function activityNameFromInstructor(row: LicenseRow): string {
  return resolveActivityName({
    publicName: String(row.public_name ?? ""),
    publicDisplayName: String(row.public_display_name ?? ""),
    displayName: String(row.display_name ?? ""),
  });
}

function emptyNotRegisteredView(
  profile: { displayName?: string | null; email?: string | null },
  extras?: Partial<MyInstructorLicenseView>,
): MyInstructorLicenseView {
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
    ...extras,
  };
}

export function toJapaneseInstructorLicenseError(
  error: unknown,
): {
  error: string;
  status: number;
  errorType?: "not_found" | "auth" | "forbidden" | "unavailable" | "fetch";
  diagnostic?: LicenseLookupDiagnostic;
} {
  if (error instanceof InstructorLicenseLookupError) {
    const category = error.diagnostic.category;
    if (category === "column_mismatch") {
      return {
        error: MSG_FETCH_FAILED,
        status: 502,
        errorType: "fetch",
        diagnostic: error.diagnostic,
      };
    }
    if (category === "rls") {
      return {
        error: MSG_FETCH_FAILED,
        status: 502,
        errorType: "fetch",
        diagnostic: error.diagnostic,
      };
    }
    if (category === "not_registered") {
      return {
        error: MSG_NOT_REGISTERED,
        status: 404,
        errorType: "not_found",
        diagnostic: error.diagnostic,
      };
    }
    return {
      error: MSG_FETCH_FAILED,
      status: 502,
      errorType: "fetch",
      diagnostic: error.diagnostic,
    };
  }

  const message =
    error instanceof Error ? error.message : String(error ?? "取得に失敗しました");

  if (message === "Unauthorized" || message === "ログインが必要です") {
    return { error: "ログインが必要です", status: 401, errorType: "auth" };
  }
  if (message === "Forbidden") {
    return {
      error: "この操作を行う権限がありません",
      status: 403,
      errorType: "forbidden",
    };
  }
  if (message === MSG_NOT_REGISTERED) {
    return { error: MSG_NOT_REGISTERED, status: 404, errorType: "not_found" };
  }
  if (message === MSG_FETCH_FAILED) {
    return { error: MSG_FETCH_FAILED, status: 502, errorType: "fetch" };
  }
  if (isMissingRelationError(message) || isMissingColumnError(message)) {
    return {
      error:
        "ライセンス用テーブルが未作成です。Supabase SQL Editor でマイグレーションを実行してください。",
      status: 503,
      errorType: "unavailable",
    };
  }
  return { error: message, status: 400, errorType: "fetch" };
}

type LicenseBundleRpc = {
  ok?: boolean;
  not_certified_instructor?: boolean;
  instructor?: LicenseRow | null;
  license?: LicenseRow | null;
  level_label?: string | null;
};

async function fetchMyLicenseViaBundleRpc(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  profile: { id: string; email: string; displayName: string; role: string },
): Promise<{
  view: MyInstructorLicenseView | null;
  diagnostic: LicenseLookupDiagnostic | null;
  missingFunction: boolean;
}> {
  const filter = {
    auth_uid: profile.id,
    email: profile.email,
    role: profile.role,
    rls: "bypassed_by_security_definer",
  };
  const { data, error } = await supabase.rpc("get_my_instructor_license_bundle");

  logLicenseSupabaseResult("bundle rpc result", {
    path: "rpc:get_my_instructor_license_bundle",
    filter,
    uid: profile.id,
    data,
    error,
  });

  if (error) {
    const missingFunction =
      error.message.includes("Could not find the function") ||
      error.message.includes("schema cache");
    const notRegistered =
      error.message.includes("認定講師として登録されていません") ||
      error.message.includes("ログインが必要です");
    const diagnostic = toLookupDiagnostic(
      "rpc:get_my_instructor_license_bundle",
      filter,
      profile.id,
      error,
      notRegistered
        ? "not_registered"
        : classifyLicenseSupabaseError(error),
    );
    logLicenseLookupError("bundle rpc failed", diagnostic, {
      missingFunction,
      role: profile.role,
    });
    if (missingFunction) {
      return { view: null, diagnostic: null, missingFunction: true };
    }
    if (notRegistered) {
      return {
        view: emptyNotRegisteredView(profile),
        diagnostic: null,
        missingFunction: false,
      };
    }
    return { view: null, diagnostic, missingFunction: false };
  }

  const bundle = (data ?? null) as LicenseBundleRpc | null;
  if (!bundle || bundle.ok === false) {
    return {
      view: null,
      diagnostic: toLookupDiagnostic(
        "rpc:get_my_instructor_license_bundle",
        filter,
        profile.id,
        { message: "empty bundle payload" },
        "query",
      ),
      missingFunction: false,
    };
  }

  if (bundle.not_certified_instructor || !bundle.instructor) {
    console.info("[instructor-license] bundle: not certified instructor", {
      path: "rpc:get_my_instructor_license_bundle",
      filter,
      uid: profile.id,
      role: profile.role,
    });
    return {
      view: emptyNotRegisteredView(profile),
      diagnostic: null,
      missingFunction: false,
    };
  }

  const instructorRow = bundle.instructor;
  // 本人以外の講師データは返さない
  if (
    instructorRow.user_id != null &&
    String(instructorRow.user_id) !== profile.id
  ) {
    console.error("[instructor-license] bundle returned non-owned instructor", {
      uid: profile.id,
      rowUserId: instructorRow.user_id,
    });
    return {
      view: null,
      diagnostic: toLookupDiagnostic(
        "rpc:get_my_instructor_license_bundle",
        filter,
        profile.id,
        { message: "owner mismatch" },
        "rls",
      ),
      missingFunction: false,
    };
  }

  if (!bundle.license) {
    console.info("[instructor-license] bundle: license pending setup", {
      path: INSTRUCTOR_LICENSES_PATH,
      filter: { instructor_id: String(instructorRow.id) },
      uid: profile.id,
    });
    return {
      view: pendingLicenseView(profile, instructorRow),
      diagnostic: null,
      missingFunction: false,
    };
  }

  const license = mapLicense(
    bundle.license,
    bundle.level_label ? String(bundle.level_label) : undefined,
  );
  return {
    view: buildMyLicenseView(profile, instructorRow, license),
    diagnostic: null,
    missingFunction: false,
  };
}

async function lookupCertifiedInstructorByUserId(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
): Promise<{
  row: LicenseRow | null;
  diagnostic: LicenseLookupDiagnostic | null;
}> {
  const filter = { user_id: userId, rls: "certified_instructors_select_own_or_admin" };
  const { data, error } = await supabase
    .from("certified_instructors")
    .select(CERTIFIED_INSTRUCTOR_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  logLicenseSupabaseResult("instructor select", {
    path: CERTIFIED_INSTRUCTORS_PATH,
    filter,
    uid: userId,
    data,
    error,
  });

  if (error) {
    const diagnostic = toLookupDiagnostic(
      CERTIFIED_INSTRUCTORS_PATH,
      filter,
      userId,
      error,
      isMissingRelationError(error.message)
        ? "query"
        : classifyLicenseSupabaseError(error),
    );
    logLicenseLookupError("instructor lookup failed", diagnostic);
    return { row: null, diagnostic };
  }

  if (!data) {
    console.info("[instructor-license] instructor not found by user_id", {
      category: "not_registered",
      path: CERTIFIED_INSTRUCTORS_PATH,
      filter,
      uid: userId,
      note: "RLS で隠されているか、user_id 未連結の可能性",
    });
  }

  return { row: (data as LicenseRow | null) ?? null, diagnostic: null };
}

async function ensureCertifiedInstructorForCurrentUser(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  profile: { id: string; email: string; displayName: string; role: string },
): Promise<{
  row: LicenseRow | null;
  diagnostic: LicenseLookupDiagnostic | null;
}> {
  const filter = {
    auth_uid: profile.id,
    email: profile.email,
    role: profile.role,
    rls: "bypassed_by_security_definer",
  };
  const { data, error } = await supabase.rpc("ensure_my_certified_instructor");

  logLicenseSupabaseResult("ensure rpc result", {
    path: "rpc:ensure_my_certified_instructor",
    filter,
    uid: profile.id,
    data,
    error,
  });

  if (error) {
    const notRegistered =
      error.message.includes("認定講師として登録されていません") ||
      error.message.includes("ログインが必要です");
    const diagnostic = toLookupDiagnostic(
      "rpc:ensure_my_certified_instructor",
      filter,
      profile.id,
      error,
      notRegistered
        ? "not_registered"
        : classifyLicenseSupabaseError(error),
    );
    logLicenseLookupError("ensure_my_certified_instructor failed", diagnostic);

    // RPC 未適用・未登録は呼び出し元でフォールバック
    if (
      notRegistered ||
      isMissingRelationError(error.message) ||
      error.message.includes("Could not find the function")
    ) {
      return {
        row: null,
        diagnostic: notRegistered ? diagnostic : null,
      };
    }
    return { row: null, diagnostic };
  }

  if (!data) return { row: null, diagnostic: null };
  return {
    row: (Array.isArray(data) ? data[0] : data) as LicenseRow,
    diagnostic: null,
  };
}

function pendingLicenseView(
  profile: { email?: string | null },
  instructorRow: LicenseRow,
): MyInstructorLicenseView {
  return {
    license: null,
    activityName: activityNameFromInstructor(instructorRow),
    legalName: legalNameFromInstructor(instructorRow),
    email: String(instructorRow.email ?? profile.email ?? ""),
    daysUntilExpiry: null,
    isExpiringSoon: false,
    renewalCondition: "",
    verificationUrl: null,
    licensePendingSetup: true,
    notCertifiedInstructor: false,
  };
}

export async function getMyInstructorLicense(): Promise<MyInstructorLicenseView> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("ログインが必要です");

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  console.info("[instructor-license] resolve my license", {
    uid: profile.id,
    role: profile.role,
  });

  // 1) security definer 一括取得（RLS / user_id 未連結 / protect トリガー問題を回避）
  const bundled = await fetchMyLicenseViaBundleRpc(supabase, {
    id: profile.id,
    email: profile.email ?? "",
    displayName: profile.displayName ?? "",
    role: profile.role,
  });
  if (bundled.view) return bundled.view;
  if (bundled.diagnostic && !bundled.missingFunction) {
    throw new InstructorLicenseLookupError(MSG_FETCH_FAILED, bundled.diagnostic);
  }

  // 2) RPC 未適用時フォールバック: SELECT → ensure → license SELECT
  const lookup = await lookupCertifiedInstructorByUserId(supabase, profile.id);
  let instructor = lookup.row;

  if (!instructor) {
    const ensured = await ensureCertifiedInstructorForCurrentUser(supabase, {
      id: profile.id,
      email: profile.email ?? "",
      displayName: profile.displayName ?? "",
      role: profile.role,
    });
    instructor = ensured.row;

    if (instructor) {
      console.info("[instructor-license] ensured certified instructor", {
        instructorId: String(instructor.id),
        uid: profile.id,
      });
    } else if (lookup.diagnostic) {
      throw new InstructorLicenseLookupError(MSG_FETCH_FAILED, lookup.diagnostic);
    } else if (ensured.diagnostic?.category === "not_registered") {
      return emptyNotRegisteredView(profile);
    } else if (ensured.diagnostic) {
      throw new InstructorLicenseLookupError(
        MSG_FETCH_FAILED,
        ensured.diagnostic,
      );
    }
  }

  if (!instructor) {
    return emptyNotRegisteredView(profile);
  }

  const instructorRow = instructor;
  const licenseFilter = {
    instructor_id: String(instructorRow.id),
    rls: "instructor_licenses_select_own_or_admin",
  };
  const { data: licenseRow, error: licenseError } = await supabase
    .from("instructor_licenses")
    .select("*")
    .eq("instructor_id", String(instructorRow.id))
    .maybeSingle();

  logLicenseSupabaseResult("license select", {
    path: INSTRUCTOR_LICENSES_PATH,
    filter: licenseFilter,
    uid: profile.id,
    data: licenseRow,
    error: licenseError,
  });

  if (licenseError) {
    const diagnostic = toLookupDiagnostic(
      INSTRUCTOR_LICENSES_PATH,
      licenseFilter,
      profile.id,
      licenseError,
    );
    logLicenseLookupError("license lookup failed", diagnostic);
    if (isMissingRelationError(licenseError.message)) {
      return pendingLicenseView(profile, instructorRow);
    }
    throw new InstructorLicenseLookupError(MSG_FETCH_FAILED, diagnostic);
  }

  if (!licenseRow) {
    return pendingLicenseView(profile, instructorRow);
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

  return buildMyLicenseView(
    profile,
    instructorRow,
    mapLicense(licenseRow as LicenseRow, levelLabel),
  );
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
    const diagnostic = toLookupDiagnostic(
      "rpc:request_instructor_license_renewal",
      { license_id: current.license.id },
      profile.id,
      error,
    );
    logLicenseLookupError("renewal rpc failed", diagnostic);
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
        .select(CERTIFIED_INSTRUCTOR_SELECT),
      supabase.from("certification_levels").select("id, label"),
    ]);

  if (licenseError) {
    const diagnostic = toLookupDiagnostic(
      INSTRUCTOR_LICENSES_PATH,
      {},
      null,
      licenseError,
    );
    logLicenseLookupError("admin list failed", diagnostic);
    throw new Error(
      isMissingRelationError(licenseError.message)
        ? toJapaneseInstructorLicenseError(licenseError).error
        : MSG_FETCH_FAILED,
    );
  }
  if (instructorError) {
    const diagnostic = toLookupDiagnostic(
      CERTIFIED_INSTRUCTORS_PATH,
      {},
      null,
      instructorError,
    );
    logLicenseLookupError("instructors failed", diagnostic);
    throw new Error(MSG_FETCH_FAILED);
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
      .select(CERTIFIED_INSTRUCTOR_SELECT)
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

  const issuedAt = input.issuedAt.slice(0, 10);
  const expiresAt = input.expiresAt.slice(0, 10);
  if (!issuedAt || !expiresAt) {
    throw new Error("認定日と有効期限を入力してください");
  }
  if (expiresAt < issuedAt) {
    throw new Error("有効期限は認定日以降の日付を指定してください");
  }

  const renewalStatus: InstructorRenewalStatus =
    input.renewalStatus && isInstructorRenewalStatus(input.renewalStatus)
      ? input.renewalStatus
      : "not_requested";

  const payload = {
    instructor_id: input.instructorId.trim(),
    certification_level_id: input.certificationLevelId.trim(),
    certification_name: resolveCertificationName(input.certificationName),
    license_number: input.licenseNumber.trim(),
    issued_at: issuedAt,
    expires_at: expiresAt,
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
  const expiresAt = String(row.expires_at ?? "").slice(0, 10);
  const storedStatus = isInstructorLicenseStatus(statusRaw)
    ? statusRaw
    : "active";
  const status = resolveDisplayStatus(storedStatus, expiresAt);
  return {
    licenseNumber: String(row.license_number ?? ""),
    certificationName: resolveCertificationName(
      String(row.certification_name ?? ""),
    ),
    holderName: String(row.holder_name ?? ""),
    issuedAt: String(row.issued_at ?? "").slice(0, 10),
    expiresAt,
    status,
    publicStatus: toPublicLicenseStatusLabel(storedStatus, expiresAt),
    verdict: toPublicLicenseVerdict(status, expiresAt),
    issuerName: String(row.issuer_name ?? LICENSE_ISSUER_ORG),
  };
}

export async function listAdminCertifiedInstructors(): Promise<
  AdminCertifiedInstructorListItem[]
> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const [
    { data: instructors, error: instructorError },
    { data: licenses, error: licenseError },
    { data: levels },
  ] = await Promise.all([
    supabase
      .from("certified_instructors")
      .select(CERTIFIED_INSTRUCTOR_SELECT)
      .order("display_name", { ascending: true }),
    supabase.from("instructor_licenses").select("*"),
    supabase.from("certification_levels").select("id, label"),
  ]);

  if (instructorError) {
    throw new Error(MSG_FETCH_FAILED);
  }
  if (licenseError && !isMissingRelationError(licenseError.message)) {
    throw new Error(MSG_FETCH_FAILED);
  }

  const levelLabelById = new Map<string, string>();
  for (const level of levels ?? []) {
    levelLabelById.set(String(level.id), String(level.label));
  }

  const licenseByInstructor = new Map<string, LicenseRow>();
  for (const row of licenses ?? []) {
    licenseByInstructor.set(
      String((row as LicenseRow).instructor_id),
      row as LicenseRow,
    );
  }

  return (instructors ?? []).map((row) => {
    const r = row as LicenseRow;
    const licenseRow = licenseByInstructor.get(String(r.id));
    return {
      instructorId: String(r.id),
      userId: String(r.user_id ?? ""),
      email: String(r.email ?? ""),
      activityName: activityNameFromInstructor(r),
      legalName: String(r.legal_name ?? "").trim(),
      levelId: String(r.level_id ?? "instructor"),
      instructorNumber: String(r.instructor_number ?? ""),
      certifiedAt: String(r.certified_at ?? "").slice(0, 10),
      renewsAt: String(r.renews_at ?? "").slice(0, 10),
      instructorStatus: String(r.status ?? "active"),
      adminMemo: String(r.admin_memo ?? ""),
      license: licenseRow
        ? mapLicense(
            licenseRow,
            levelLabelById.get(
              String(licenseRow.certification_level_id ?? ""),
            ),
          )
        : null,
    } satisfies AdminCertifiedInstructorListItem;
  });
}

async function resolveProfileIdByEmail(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return String((data as LicenseRow).id ?? "").trim() || null;
}

async function assertEmailAvailableForNewInstructor(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  email: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("certified_instructors")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error("メールアドレスの確認に失敗しました");
  }
  if (data) {
    throw new Error(
      "このメールアドレスの認定講師は既に登録されています。別のメールアドレスを使用するか、既存の講師を編集してください。",
    );
  }
}

async function assertUserAvailableForNewInstructor(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("certified_instructors")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error("アカウント紐づけの確認に失敗しました");
  }
  if (data) {
    throw new Error("このアカウントは既に認定講師として登録されています");
  }
}

async function generateUniqueInstructorNumber(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateCertificateNumber();
    const { data, error } = await supabase
      .from("certified_instructors")
      .select("id")
      .eq("instructor_number", candidate)
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error("認定番号の生成に失敗しました");
    }
    if (!data) return candidate;
  }
  throw new Error("認定番号の生成に失敗しました。再度お試しください。");
}

export async function createAdminCertifiedInstructor(
  input: CreateAdminCertifiedInstructorInput,
): Promise<AdminCertifiedInstructorListItem> {
  const licenseStatus: InstructorLicenseStatus =
    input.licenseStatus && isInstructorLicenseStatus(input.licenseStatus)
      ? input.licenseStatus
      : "active";

  return upsertAdminCertifiedInstructor({
    email: input.email,
    publicName: input.publicName,
    legalName: input.legalName,
    levelId: input.levelId || "instructor",
    certifiedAt: input.certifiedAt,
    renewsAt: input.renewsAt,
    certificationName:
      input.certificationName?.trim() || SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME,
    issueLicense: true,
    licenseStatus,
    requiredEducationHours: 12,
    completedEducationHours: 0,
    renewalStatus: "not_requested",
  });
}

export async function upsertAdminCertifiedInstructor(
  input: UpsertCertifiedInstructorInput,
): Promise<AdminCertifiedInstructorListItem> {
  await requireAdminProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const email = input.email.trim().toLowerCase();
  const publicName = input.publicName.trim();
  const legalName = input.legalName.trim();
  const displayName =
    (input.displayName ?? "").trim() || publicName || legalName;
  const levelId = (input.levelId || "instructor").trim() || "instructor";
  const certificationName = resolveCertificationName(
    input.certificationName ?? SLEEP_WELLNESS_INSTRUCTOR_CERT_NAME,
  );
  let instructorNumber = (input.instructorNumber ?? "").trim();
  const certifiedAt = input.certifiedAt.slice(0, 10);
  const renewsAt = input.renewsAt.slice(0, 10);
  const isNew = !input.id?.trim();

  if (!email) throw new Error("メールアドレスを入力してください");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }
  if (!publicName) throw new Error("活動名を入力してください");
  if (!legalName) throw new Error("本名を入力してください");
  if (!certifiedAt || !renewsAt) {
    throw new Error("認定日と有効期限を入力してください");
  }
  if (renewsAt < certifiedAt) {
    throw new Error("有効期限は認定日以降の日付を指定してください");
  }

  if (isNew) {
    await assertEmailAvailableForNewInstructor(supabase, email);
    if (!instructorNumber) {
      instructorNumber = await generateUniqueInstructorNumber(supabase);
    }
  } else if (!instructorNumber) {
    throw new Error("認定番号を入力してください");
  }

  const requiredEducationHours = Number(input.requiredEducationHours ?? 0);
  const completedEducationHours = Number(input.completedEducationHours ?? 0);
  if (
    !Number.isFinite(requiredEducationHours) ||
    requiredEducationHours < 0
  ) {
    throw new Error("継続教育の必要時間は0以上で入力してください");
  }
  if (
    !Number.isFinite(completedEducationHours) ||
    completedEducationHours < 0
  ) {
    throw new Error("継続教育の修了時間は0以上で入力してください");
  }

  // display_name は既存互換のため更新時は触らない（新規のみ設定）
  const basePayload = {
    email,
    public_name: publicName,
    public_display_name: publicName,
    legal_name: legalName,
    level_id: levelId,
    instructor_number: instructorNumber,
    certified_at: certifiedAt,
    renews_at: renewsAt,
    admin_memo: (input.adminMemo ?? "").trim(),
  };

  let instructorId = input.id?.trim() ?? "";

  if (instructorId) {
    const { data, error } = await supabase
      .from("certified_instructors")
      .update(basePayload)
      .eq("id", instructorId)
      .select(CERTIFIED_INSTRUCTOR_SELECT)
      .single();
    if (error || !data) {
      throw new Error(error?.message || "認定講師の更新に失敗しました");
    }
    instructorId = String((data as LicenseRow).id);
  } else {
    let userId = input.userId?.trim() ?? "";
    if (!userId) {
      const resolvedUserId = await resolveProfileIdByEmail(supabase, email);
      if (resolvedUserId) userId = resolvedUserId;
    }
    // ログインアカウント（profiles）が未作成でも、認定講師レコードだけ作成できるようにする。
    // user_id は後日本人が同一メールでアカウントを作成した際に、既存の紐づけ処理で安全に連結される。
    if (userId) {
      await assertUserAvailableForNewInstructor(supabase, userId);
    }
    const insertBody: Database["public"]["Tables"]["certified_instructors"]["Insert"] =
      {
        ...basePayload,
        display_name: displayName,
        user_id: userId || null,
        status: "active",
      };
    const { data, error } = await supabase
      .from("certified_instructors")
      .insert(insertBody)
      .select(CERTIFIED_INSTRUCTOR_SELECT)
      .single();
    if (error || !data) {
      const message = error?.message || "認定講師の登録に失敗しました";
      if (
        /null value.*user_id|user_id.*not-null|violates not-null constraint/i.test(
          message,
        )
      ) {
        throw new Error(
          "認定講師の登録に失敗しました。Supabase で certified_instructors.user_id を NULL 許可にするマイグレーション（20260727100000_certified_instructors_user_id_nullable.sql）を実行してください。",
        );
      }
      throw new Error(message);
    }
    instructorId = String((data as LicenseRow).id);
  }

  if (input.issueLicense) {
    const existing = await supabase
      .from("instructor_licenses")
      .select("id")
      .eq("instructor_id", instructorId)
      .maybeSingle();

    const licenseStatus: InstructorLicenseStatus =
      input.licenseStatus && isInstructorLicenseStatus(input.licenseStatus)
        ? input.licenseStatus
        : "active";

    if (existing.data?.id) {
      await upsertAdminInstructorLicense({
        id: String(existing.data.id),
        instructorId,
        certificationLevelId: levelId,
        certificationName,
        licenseNumber: instructorNumber,
        issuedAt: certifiedAt,
        expiresAt: renewsAt,
        status: licenseStatus,
        requiredEducationHours,
        completedEducationHours,
        renewalStatus: input.renewalStatus,
      });
    } else {
      await upsertAdminInstructorLicense({
        instructorId,
        certificationLevelId: levelId,
        certificationName,
        licenseNumber: instructorNumber,
        issuedAt: certifiedAt,
        expiresAt: renewsAt,
        status: licenseStatus,
        requiredEducationHours:
          requiredEducationHours > 0 ? requiredEducationHours : 12,
        completedEducationHours,
        renewalStatus: input.renewalStatus,
      });
    }
  }

  const list = await listAdminCertifiedInstructors();
  const found = list.find((item) => item.instructorId === instructorId);
  if (!found) throw new Error("登録後の取得に失敗しました");
  return found;
}

export async function setAdminInstructorLicenseStatus(
  licenseId: string,
  status: InstructorLicenseStatus,
): Promise<InstructorLicenseRecord> {
  await requireAdminProfile();
  if (!isInstructorLicenseStatus(status)) {
    throw new Error("ライセンス状態が不正です");
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const { data, error } = await supabase
    .from("instructor_licenses")
    .update({ status })
    .eq("id", licenseId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "ライセンス状態の更新に失敗しました");
  }
  return mapLicense(data as LicenseRow);
}
