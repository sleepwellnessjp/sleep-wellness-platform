import {
  getCurrentProfile,
  requireAdminOrSchoolProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  addYearsIso,
  CE_REQUIRED_HOURS,
  ceRequirementText,
  daysUntil,
  generateCertificateNumber,
  generateLicenseNumber,
  generateVerificationCode,
  isCertificationLevel,
  isLicenseStatus,
  PLAN_PRICING,
  todayIso,
} from "./constants";
import type {
  AdminLicenseListItem,
  CertificateRecord,
  ContinuingEducationRecord,
  IssueLicenseInput,
  LicenseHistoryEntry,
  LicenseRecord,
  MyLicenseBundle,
  PaymentHistoryRecord,
  SubscriptionRecord,
  UpdateLicenseAdminInput,
} from "./types";

function asHistory(value: unknown): LicenseHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const action = String(row.action ?? "updated");
      const fromStatus = row.fromStatus ? String(row.fromStatus) : null;
      const toStatus = row.toStatus ? String(row.toStatus) : null;
      return {
        at: String(row.at ?? ""),
        action: action as LicenseHistoryEntry["action"],
        fromStatus:
          fromStatus && isLicenseStatus(fromStatus) ? fromStatus : null,
        toStatus: toStatus && isLicenseStatus(toStatus) ? toStatus : null,
        note: String(row.note ?? ""),
        actorEmail:
          typeof row.actorEmail === "string" ? row.actorEmail : null,
      } satisfies LicenseHistoryEntry;
    })
    .filter((item): item is LicenseHistoryEntry => item !== null);
}

function mapLicense(row: Record<string, unknown>): LicenseRecord {
  const level = String(row.certification_level);
  const status = String(row.status);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userEmail: row.user_email ? String(row.user_email) : null,
    userDisplayName: row.user_display_name
      ? String(row.user_display_name)
      : null,
    licenseNumber: String(row.license_number),
    certificationLevel: isCertificationLevel(level) ? level : "instructor",
    certifiedAt: String(row.certified_at).slice(0, 10),
    expiresAt: String(row.expires_at).slice(0, 10),
    status: isLicenseStatus(status) ? status : "active",
    statusHistory: asHistory(row.status_history),
    adminMemo: String(row.admin_memo ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSubscription(row: Record<string, unknown>): SubscriptionRecord {
  const plan = String(row.plan);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    licenseId: row.license_id ? String(row.license_id) : null,
    plan: isCertificationLevel(plan) ? plan : "instructor",
    billingCycle: row.billing_cycle === "monthly" ? "monthly" : "yearly",
    monthlyAmount: Number(row.monthly_amount ?? 0),
    yearlyAmount: Number(row.yearly_amount ?? 0),
    status: (String(row.status) as SubscriptionRecord["status"]) || "active",
    currentPeriodStart: String(row.current_period_start).slice(0, 10),
    currentPeriodEnd: String(row.current_period_end).slice(0, 10),
    nextRenewalAt: String(row.next_renewal_at).slice(0, 10),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCertificate(row: Record<string, unknown>): CertificateRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    licenseId: String(row.license_id),
    certificateNumber: String(row.certificate_number),
    holderName: String(row.holder_name ?? ""),
    issuedAt: String(row.issued_at).slice(0, 10),
    verificationCode: String(row.verification_code),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapCe(row: Record<string, unknown>): ContinuingEducationRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    licenseId: String(row.license_id),
    hoursCompleted: Number(row.hours_completed ?? 0),
    creditsEarned: Number(row.credits_earned ?? 0),
    requiredHours: Number(row.required_hours ?? 0),
    renewalRequirement: String(row.renewal_requirement ?? ""),
    periodStart: String(row.period_start).slice(0, 10),
    periodEnd: String(row.period_end).slice(0, 10),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPayment(row: Record<string, unknown>): PaymentHistoryRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    subscriptionId: row.subscription_id
      ? String(row.subscription_id)
      : null,
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "JPY"),
    paidAt: String(row.paid_at),
    method: String(row.method ?? ""),
    description: String(row.description ?? ""),
    status: (String(row.status) as PaymentHistoryRecord["status"]) || "paid",
    createdAt: String(row.created_at),
  };
}

export async function getMyLicenseBundle(): Promise<MyLicenseBundle> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("ログインが必要です");

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const { data: licenseRows, error: licenseError } = await supabase
    .from("licenses")
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (licenseError) {
    console.error("[license] list mine failed:", licenseError.message);
    throw new Error("ライセンス情報の取得に失敗しました");
  }

  const licenses = (licenseRows ?? []).map((row) =>
    mapLicense(row as Record<string, unknown>),
  );
  const license =
    licenses.find((item) => item.status === "active") ??
    licenses.find((item) => item.status === "renewal_pending") ??
    licenses[0] ??
    null;

  if (!license) {
    return {
      license: null,
      subscription: null,
      certificate: null,
      continuingEducation: null,
      paymentHistory: [],
      daysUntilExpiry: null,
    };
  }

  const [subRes, certRes, ceRes, payRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("license_id", license.id)
      .maybeSingle(),
    supabase
      .from("certificates")
      .select("*")
      .eq("license_id", license.id)
      .maybeSingle(),
    supabase
      .from("continuing_education")
      .select("*")
      .eq("license_id", license.id)
      .maybeSingle(),
    supabase
      .from("payment_history")
      .select("*")
      .eq("user_id", profile.id)
      .order("paid_at", { ascending: false })
      .limit(50),
  ]);

  if (subRes.error) {
    console.error("[license] subscription failed:", subRes.error.message);
  }
  if (certRes.error) {
    console.error("[license] certificate failed:", certRes.error.message);
  }
  if (ceRes.error) {
    console.error("[license] ce failed:", ceRes.error.message);
  }
  if (payRes.error) {
    console.error("[license] payments failed:", payRes.error.message);
  }

  return {
    license,
    subscription: subRes.data
      ? mapSubscription(subRes.data as Record<string, unknown>)
      : null,
    certificate: certRes.data
      ? mapCertificate(certRes.data as Record<string, unknown>)
      : null,
    continuingEducation: ceRes.data
      ? mapCe(ceRes.data as Record<string, unknown>)
      : null,
    paymentHistory: (payRes.data ?? []).map((row) =>
      mapPayment(row as Record<string, unknown>),
    ),
    daysUntilExpiry: daysUntil(license.expiresAt),
  };
}

export async function listAdminLicenses(filters?: {
  q?: string;
  status?: string;
  level?: string;
}): Promise<AdminLicenseListItem[]> {
  await requireAdminOrSchoolProfile();
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  let query = supabase
    .from("licenses")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.level && filters.level !== "all") {
    query = query.eq("certification_level", filters.level);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[license] admin list failed:", error.message);
    throw new Error("ライセンス一覧の取得に失敗しました");
  }

  const licenses = (data ?? []).map((row) =>
    mapLicense(row as Record<string, unknown>),
  );
  const ids = licenses.map((item) => item.id);

  const { data: subs } = ids.length
    ? await supabase.from("subscriptions").select("*").in("license_id", ids)
    : { data: [] as Record<string, unknown>[] };

  const subByLicense = new Map<string, SubscriptionRecord>();
  for (const row of subs ?? []) {
    const mapped = mapSubscription(row as Record<string, unknown>);
    if (mapped.licenseId) subByLicense.set(mapped.licenseId, mapped);
  }

  const q = (filters?.q ?? "").trim().toLowerCase();
  return licenses
    .filter((item) => {
      if (!q) return true;
      const hay = [
        item.licenseNumber,
        item.userEmail ?? "",
        item.userDisplayName ?? "",
        item.userId,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .map((item) => {
      const sub = subByLicense.get(item.id) ?? null;
      return {
        ...item,
        plan: sub?.plan ?? item.certificationLevel,
        nextRenewalAt: sub?.nextRenewalAt ?? item.expiresAt,
        subscriptionStatus: sub?.status ?? null,
      };
    });
}

export async function issueLicense(
  input: IssueLicenseInput,
): Promise<LicenseRecord> {
  const admin = await requireAdminProfile();
  if (!isCertificationLevel(input.certificationLevel)) {
    throw new Error("認定レベルが不正です");
  }
  if (!input.userId?.trim()) {
    throw new Error("対象ユーザーを指定してください");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const certifiedAt = (input.certifiedAt ?? todayIso()).slice(0, 10);
  const expiresAt = (input.expiresAt ?? addYearsIso(certifiedAt, 1)).slice(
    0,
    10,
  );
  const licenseNumber = generateLicenseNumber(input.certificationLevel);
  const pricing = PLAN_PRICING[input.certificationLevel];
  const billingCycle = input.billingCycle ?? "yearly";
  const now = new Date().toISOString();
  const history: LicenseHistoryEntry[] = [
    {
      at: now,
      action: "issued",
      fromStatus: null,
      toStatus: "active",
      note: "管理者による発行",
      actorEmail: admin.email,
    },
  ];

  const { data: licenseRow, error: licenseError } = await supabase
    .from("licenses")
    .insert({
      user_id: input.userId,
      user_email: input.userEmail ?? null,
      user_display_name: input.userDisplayName ?? null,
      license_number: licenseNumber,
      certification_level: input.certificationLevel,
      certified_at: certifiedAt,
      expires_at: expiresAt,
      status: "active",
      status_history: history,
      admin_memo: (input.adminMemo ?? "").trim(),
    })
    .select("*")
    .single();

  if (licenseError || !licenseRow) {
    console.error("[license] issue failed:", licenseError?.message);
    throw new Error("ライセンスの発行に失敗しました");
  }

  const license = mapLicense(licenseRow as Record<string, unknown>);

  const { data: subRow, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: input.userId,
      license_id: license.id,
      plan: input.certificationLevel,
      billing_cycle: billingCycle,
      monthly_amount: pricing.monthly,
      yearly_amount: pricing.yearly,
      status: "active",
      current_period_start: certifiedAt,
      current_period_end: expiresAt,
      next_renewal_at: expiresAt,
    })
    .select("*")
    .single();

  if (subError) {
    console.error("[license] subscription create failed:", subError.message);
  }

  await supabase.from("certificates").insert({
    user_id: input.userId,
    license_id: license.id,
    certificate_number: generateCertificateNumber(licenseNumber),
    holder_name: input.userDisplayName?.trim() || "認定講師",
    issued_at: certifiedAt,
    verification_code: generateVerificationCode(),
  });

  await supabase.from("continuing_education").insert({
    user_id: input.userId,
    license_id: license.id,
    hours_completed: 0,
    credits_earned: 0,
    required_hours: CE_REQUIRED_HOURS[input.certificationLevel],
    renewal_requirement: ceRequirementText(input.certificationLevel),
    period_start: certifiedAt,
    period_end: expiresAt,
  });

  if (subRow) {
    const amount =
      billingCycle === "yearly" ? pricing.yearly : pricing.monthly;
    await supabase.from("payment_history").insert({
      user_id: input.userId,
      subscription_id: String((subRow as { id: string }).id),
      amount,
      currency: "JPY",
      paid_at: now,
      method: "管理者登録",
      description: `${input.certificationLevel} ${billingCycle === "yearly" ? "年額" : "月額"}（初回）`,
      status: "paid",
    });
  }

  return license;
}

export async function updateLicenseAdmin(
  input: UpdateLicenseAdminInput,
): Promise<LicenseRecord> {
  const admin = await requireAdminProfile();
  if (!input.id) throw new Error("対象が指定されていません");

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");

  const { data: existing, error: fetchError } = await supabase
    .from("licenses")
    .select("*")
    .eq("id", input.id)
    .single();

  if (fetchError || !existing) {
    throw new Error("ライセンスが見つかりません");
  }

  const current = mapLicense(existing as Record<string, unknown>);
  const now = new Date().toISOString();
  const note = (input.note ?? "").trim();

  let nextStatus = current.status;
  let nextExpires = current.expiresAt;
  let nextLevel = current.certificationLevel;
  let historyAction: LicenseHistoryEntry["action"] = "updated";

  if (input.certificationLevel) {
    if (!isCertificationLevel(input.certificationLevel)) {
      throw new Error("認定レベルが不正です");
    }
    nextLevel = input.certificationLevel;
  }
  if (input.expiresAt) nextExpires = input.expiresAt.slice(0, 10);

  if (input.action === "renew") {
    nextStatus = "active";
    nextExpires = (input.expiresAt ?? addYearsIso(todayIso(), 1)).slice(0, 10);
    historyAction = "renewed";
  } else if (input.action === "suspend") {
    nextStatus = "suspended";
    historyAction = "suspended";
  } else if (input.action === "revoke") {
    nextStatus = "expired";
    nextExpires = todayIso();
    historyAction = "revoked";
  } else if (input.action === "reactivate") {
    nextStatus = "active";
    nextExpires = (input.expiresAt ?? addYearsIso(todayIso(), 1)).slice(0, 10);
    historyAction = "reactivated";
  }

  const historyEntry: LicenseHistoryEntry = {
    at: now,
    action: historyAction,
    fromStatus: current.status,
    toStatus: nextStatus,
    note:
      note ||
      (input.action === "renew"
        ? "ライセンス更新"
        : input.action === "suspend"
          ? "ライセンス停止"
          : input.action === "revoke"
            ? "ライセンス失効"
            : input.action === "reactivate"
              ? "ライセンス再開"
              : "管理者による編集"),
    actorEmail: admin.email,
  };

  const { data: updated, error: updateError } = await supabase
    .from("licenses")
    .update({
      status: nextStatus,
      expires_at: nextExpires,
      certification_level: nextLevel,
      admin_memo:
        input.adminMemo !== undefined ? input.adminMemo : current.adminMemo,
      status_history: [historyEntry, ...current.statusHistory],
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[license] update failed:", updateError?.message);
    throw new Error("ライセンスの更新に失敗しました");
  }

  if (input.action === "renew" || input.action === "reactivate") {
    await supabase
      .from("subscriptions")
      .update({
        status: "active",
        plan: nextLevel,
        current_period_start: todayIso(),
        current_period_end: nextExpires,
        next_renewal_at: nextExpires,
      })
      .eq("license_id", input.id);

    await supabase
      .from("continuing_education")
      .update({
        hours_completed: 0,
        credits_earned: 0,
        required_hours: CE_REQUIRED_HOURS[nextLevel],
        renewal_requirement: ceRequirementText(nextLevel),
        period_start: todayIso(),
        period_end: nextExpires,
      })
      .eq("license_id", input.id);
  }

  if (input.action === "revoke") {
    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("license_id", input.id);
  }

  if (
    input.hoursCompleted !== undefined ||
    input.creditsEarned !== undefined
  ) {
    await supabase
      .from("continuing_education")
      .update({
        ...(input.hoursCompleted !== undefined
          ? { hours_completed: input.hoursCompleted }
          : {}),
        ...(input.creditsEarned !== undefined
          ? { credits_earned: input.creditsEarned }
          : {}),
      })
      .eq("license_id", input.id);
  }

  return mapLicense(updated as Record<string, unknown>);
}

export function buildLicensesCsv(rows: AdminLicenseListItem[]): string {
  const header = [
    "license_number",
    "display_name",
    "email",
    "level",
    "status",
    "certified_at",
    "expires_at",
    "plan",
    "next_renewal_at",
    "subscription_status",
  ];
  const lines = rows.map((row) =>
    [
      row.licenseNumber,
      row.userDisplayName ?? "",
      row.userEmail ?? "",
      row.certificationLevel,
      row.status,
      row.certifiedAt,
      row.expiresAt,
      row.plan ?? "",
      row.nextRenewalAt ?? "",
      row.subscriptionStatus ?? "",
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function toJapaneseAuthError(message: string): {
  error: string;
  status: number;
} {
  if (message === "Unauthorized" || message === "ログインが必要です") {
    return { error: "ログインが必要です", status: 401 };
  }
  if (message === "Forbidden") {
    return { error: "この操作を行う権限がありません", status: 403 };
  }
  return { error: message, status: 400 };
}
