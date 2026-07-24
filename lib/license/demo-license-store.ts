import {
  addYearsIso,
  CE_REQUIRED_HOURS,
  ceRequirementText,
  daysUntil,
  generateCertificateNumber,
  generateLicenseNumber,
  generateVerificationCode,
  PLAN_PRICING,
  todayIso,
} from "./constants";
import type {
  AdminLicenseAction,
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

const DEMO_USER_ID = "demo-instructor";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function dateDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const seedLicenseId = "lic-demo-1";
const seedSubId = "sub-demo-1";

let licenses: LicenseRecord[] = [
  {
    id: seedLicenseId,
    userId: DEMO_USER_ID,
    userEmail: "demo@swij.local",
    userDisplayName: "デモ インストラクター",
    licenseNumber: "SWIJ-INS-2025-DEMO01",
    certificationLevel: "instructor",
    certifiedAt: "2025-04-01",
    expiresAt: dateDaysFromNow(120),
    status: "active",
    statusHistory: [
      {
        at: "2025-04-01T09:00:00.000Z",
        action: "issued",
        fromStatus: null,
        toStatus: "active",
        note: "初回認定",
        actorEmail: "admin@swij.local",
      },
    ],
    adminMemo: "",
    createdAt: "2025-04-01T09:00:00.000Z",
    updatedAt: "2025-04-01T09:00:00.000Z",
  },
  {
    id: "lic-demo-2",
    userId: "demo-instructor-2",
    userEmail: "sato@swij.local",
    userDisplayName: "佐藤 美咲",
    licenseNumber: "SWIJ-PRC-2024-SAT001",
    certificationLevel: "practitioner",
    certifiedAt: "2024-06-15",
    expiresAt: dateDaysFromNow(-20),
    status: "expired",
    statusHistory: [
      {
        at: "2024-06-15T09:00:00.000Z",
        action: "issued",
        fromStatus: null,
        toStatus: "active",
        note: "初回認定",
        actorEmail: "admin@swij.local",
      },
      {
        at: isoDaysAgo(20),
        action: "revoked",
        fromStatus: "active",
        toStatus: "expired",
        note: "有効期限到来",
        actorEmail: "system",
      },
    ],
    adminMemo: "更新案内送付済",
    createdAt: "2024-06-15T09:00:00.000Z",
    updatedAt: isoDaysAgo(20),
  },
  {
    id: "lic-demo-3",
    userId: "demo-instructor-3",
    userEmail: "tanaka@swij.local",
    userDisplayName: "田中 健",
    licenseNumber: "SWIJ-NAV-2025-TAN001",
    certificationLevel: "navigator",
    certifiedAt: "2025-01-10",
    expiresAt: dateDaysFromNow(25),
    status: "renewal_pending",
    statusHistory: [
      {
        at: "2025-01-10T09:00:00.000Z",
        action: "issued",
        fromStatus: null,
        toStatus: "active",
        note: "初回認定",
        actorEmail: "admin@swij.local",
      },
      {
        at: isoDaysAgo(5),
        action: "updated",
        fromStatus: "active",
        toStatus: "renewal_pending",
        note: "更新期限接近",
        actorEmail: "system",
      },
    ],
    adminMemo: "",
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: isoDaysAgo(5),
  },
];

let subscriptions: SubscriptionRecord[] = [
  {
    id: seedSubId,
    userId: DEMO_USER_ID,
    licenseId: seedLicenseId,
    plan: "instructor",
    billingCycle: "yearly",
    monthlyAmount: PLAN_PRICING.instructor.monthly,
    yearlyAmount: PLAN_PRICING.instructor.yearly,
    status: "active",
    currentPeriodStart: "2025-04-01",
    currentPeriodEnd: dateDaysFromNow(120),
    nextRenewalAt: dateDaysFromNow(120),
    createdAt: "2025-04-01T09:00:00.000Z",
    updatedAt: "2025-04-01T09:00:00.000Z",
  },
  {
    id: "sub-demo-2",
    userId: "demo-instructor-2",
    licenseId: "lic-demo-2",
    plan: "practitioner",
    billingCycle: "monthly",
    monthlyAmount: PLAN_PRICING.practitioner.monthly,
    yearlyAmount: PLAN_PRICING.practitioner.yearly,
    status: "canceled",
    currentPeriodStart: "2025-05-01",
    currentPeriodEnd: dateDaysFromNow(-20),
    nextRenewalAt: dateDaysFromNow(-20),
    createdAt: "2024-06-15T09:00:00.000Z",
    updatedAt: isoDaysAgo(20),
  },
  {
    id: "sub-demo-3",
    userId: "demo-instructor-3",
    licenseId: "lic-demo-3",
    plan: "navigator",
    billingCycle: "yearly",
    monthlyAmount: PLAN_PRICING.navigator.monthly,
    yearlyAmount: PLAN_PRICING.navigator.yearly,
    status: "active",
    currentPeriodStart: "2025-01-10",
    currentPeriodEnd: dateDaysFromNow(25),
    nextRenewalAt: dateDaysFromNow(25),
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
];

let certificates: CertificateRecord[] = [
  {
    id: "cert-demo-1",
    userId: DEMO_USER_ID,
    licenseId: seedLicenseId,
    certificateNumber: "CERT-INS-2025-DEMO01",
    holderName: "デモ インストラクター",
    issuedAt: "2025-04-01",
    verificationCode: "SWIJ-DEMO-A1B2",
    createdAt: "2025-04-01T09:00:00.000Z",
    updatedAt: "2025-04-01T09:00:00.000Z",
  },
  {
    id: "cert-demo-2",
    userId: "demo-instructor-2",
    licenseId: "lic-demo-2",
    certificateNumber: "CERT-PRC-2024-SAT001",
    holderName: "佐藤 美咲",
    issuedAt: "2024-06-15",
    verificationCode: "SWIJ-SAT0-C3D4",
    createdAt: "2024-06-15T09:00:00.000Z",
    updatedAt: "2024-06-15T09:00:00.000Z",
  },
  {
    id: "cert-demo-3",
    userId: "demo-instructor-3",
    licenseId: "lic-demo-3",
    certificateNumber: "CERT-NAV-2025-TAN001",
    holderName: "田中 健",
    issuedAt: "2025-01-10",
    verificationCode: "SWIJ-TAN0-E5F6",
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: "2025-01-10T09:00:00.000Z",
  },
];

let continuingEducation: ContinuingEducationRecord[] = [
  {
    id: "ce-demo-1",
    userId: DEMO_USER_ID,
    licenseId: seedLicenseId,
    hoursCompleted: 6.5,
    creditsEarned: 6.5,
    requiredHours: CE_REQUIRED_HOURS.instructor,
    renewalRequirement: ceRequirementText("instructor"),
    periodStart: "2025-04-01",
    periodEnd: dateDaysFromNow(120),
    createdAt: "2025-04-01T09:00:00.000Z",
    updatedAt: isoDaysAgo(10),
  },
  {
    id: "ce-demo-2",
    userId: "demo-instructor-2",
    licenseId: "lic-demo-2",
    hoursCompleted: 3,
    creditsEarned: 3,
    requiredHours: CE_REQUIRED_HOURS.practitioner,
    renewalRequirement: ceRequirementText("practitioner"),
    periodStart: "2024-06-15",
    periodEnd: dateDaysFromNow(-20),
    createdAt: "2024-06-15T09:00:00.000Z",
    updatedAt: isoDaysAgo(40),
  },
  {
    id: "ce-demo-3",
    userId: "demo-instructor-3",
    licenseId: "lic-demo-3",
    hoursCompleted: 9,
    creditsEarned: 9,
    requiredHours: CE_REQUIRED_HOURS.navigator,
    renewalRequirement: ceRequirementText("navigator"),
    periodStart: "2025-01-10",
    periodEnd: dateDaysFromNow(25),
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: isoDaysAgo(3),
  },
];

let paymentHistory: PaymentHistoryRecord[] = [
  {
    id: "pay-demo-1",
    userId: DEMO_USER_ID,
    subscriptionId: seedSubId,
    amount: PLAN_PRICING.instructor.yearly,
    currency: "JPY",
    paidAt: "2025-04-01T09:05:00.000Z",
    method: "銀行振込",
    description: "Instructor 年額（2025年度）",
    status: "paid",
    createdAt: "2025-04-01T09:05:00.000Z",
  },
  {
    id: "pay-demo-2",
    userId: DEMO_USER_ID,
    subscriptionId: seedSubId,
    amount: PLAN_PRICING.instructor.yearly,
    currency: "JPY",
    paidAt: "2024-04-01T09:05:00.000Z",
    method: "銀行振込",
    description: "Instructor 年額（2024年度）",
    status: "paid",
    createdAt: "2024-04-01T09:05:00.000Z",
  },
  {
    id: "pay-demo-3",
    userId: "demo-instructor-3",
    subscriptionId: "sub-demo-3",
    amount: PLAN_PRICING.navigator.yearly,
    currency: "JPY",
    paidAt: "2025-01-10T10:00:00.000Z",
    method: "クレジットカード",
    description: "Navigator 年額（2025年度）",
    status: "paid",
    createdAt: "2025-01-10T10:00:00.000Z",
  },
];

function pushHistory(
  license: LicenseRecord,
  entry: LicenseHistoryEntry,
): LicenseRecord {
  return {
    ...license,
    statusHistory: [entry, ...license.statusHistory],
    updatedAt: entry.at,
  };
}

export function getDemoLicenseActor() {
  return {
    userId: DEMO_USER_ID,
    email: "demo@swij.local",
    displayName: "デモ インストラクター",
  };
}

export function getDemoMyLicenseBundle(
  userId = DEMO_USER_ID,
): MyLicenseBundle {
  const license =
    licenses.find((item) => item.userId === userId && item.status !== "suspended") ??
    licenses.find((item) => item.userId === userId) ??
    null;
  const subscription = license
    ? (subscriptions.find((item) => item.licenseId === license.id) ?? null)
    : (subscriptions.find((item) => item.userId === userId) ?? null);
  const certificate = license
    ? (certificates.find((item) => item.licenseId === license.id) ?? null)
    : null;
  const ce = license
    ? (continuingEducation.find((item) => item.licenseId === license.id) ??
      null)
    : null;
  const payments = paymentHistory
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  return {
    license,
    subscription,
    certificate,
    continuingEducation: ce,
    paymentHistory: payments,
    daysUntilExpiry: license ? daysUntil(license.expiresAt) : null,
  };
}

export function listDemoAdminLicenses(filters?: {
  q?: string;
  status?: string;
  level?: string;
}): AdminLicenseListItem[] {
  const q = (filters?.q ?? "").trim().toLowerCase();
  return licenses
    .filter((item) => {
      if (filters?.status && filters.status !== "all" && item.status !== filters.status)
        return false;
      if (
        filters?.level &&
        filters.level !== "all" &&
        item.certificationLevel !== filters.level
      )
        return false;
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
      const sub = subscriptions.find((s) => s.licenseId === item.id) ?? null;
      return {
        ...item,
        plan: sub?.plan ?? item.certificationLevel,
        nextRenewalAt: sub?.nextRenewalAt ?? item.expiresAt,
        subscriptionStatus: sub?.status ?? null,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function issueDemoLicense(
  input: IssueLicenseInput,
  actorEmail: string | null = "admin@swij.local",
): LicenseRecord {
  const certifiedAt = (input.certifiedAt ?? todayIso()).slice(0, 10);
  const expiresAt = (
    input.expiresAt ?? addYearsIso(certifiedAt, 1)
  ).slice(0, 10);
  const now = new Date().toISOString();
  const licenseNumber = generateLicenseNumber(input.certificationLevel);
  const pricing = PLAN_PRICING[input.certificationLevel];
  const billingCycle = input.billingCycle ?? "yearly";

  const license: LicenseRecord = {
    id: `lic-demo-${Date.now()}`,
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    userDisplayName: input.userDisplayName ?? null,
    licenseNumber,
    certificationLevel: input.certificationLevel,
    certifiedAt,
    expiresAt,
    status: "active",
    statusHistory: [
      {
        at: now,
        action: "issued",
        fromStatus: null,
        toStatus: "active",
        note: "管理者による発行",
        actorEmail,
      },
    ],
    adminMemo: (input.adminMemo ?? "").trim(),
    createdAt: now,
    updatedAt: now,
  };

  const subscription: SubscriptionRecord = {
    id: `sub-demo-${Date.now()}`,
    userId: input.userId,
    licenseId: license.id,
    plan: input.certificationLevel,
    billingCycle,
    monthlyAmount: pricing.monthly,
    yearlyAmount: pricing.yearly,
    status: "active",
    currentPeriodStart: certifiedAt,
    currentPeriodEnd: expiresAt,
    nextRenewalAt: expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  const certificate: CertificateRecord = {
    id: `cert-demo-${Date.now()}`,
    userId: input.userId,
    licenseId: license.id,
    certificateNumber: generateCertificateNumber(licenseNumber),
    holderName: input.userDisplayName?.trim() || "認定講師",
    issuedAt: certifiedAt,
    verificationCode: generateVerificationCode(),
    createdAt: now,
    updatedAt: now,
  };

  const ce: ContinuingEducationRecord = {
    id: `ce-demo-${Date.now()}`,
    userId: input.userId,
    licenseId: license.id,
    hoursCompleted: 0,
    creditsEarned: 0,
    requiredHours: CE_REQUIRED_HOURS[input.certificationLevel],
    renewalRequirement: ceRequirementText(input.certificationLevel),
    periodStart: certifiedAt,
    periodEnd: expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  const payment: PaymentHistoryRecord = {
    id: `pay-demo-${Date.now()}`,
    userId: input.userId,
    subscriptionId: subscription.id,
    amount: billingCycle === "yearly" ? pricing.yearly : pricing.monthly,
    currency: "JPY",
    paidAt: now,
    method: "管理者登録",
    description: `${input.certificationLevel} ${billingCycle === "yearly" ? "年額" : "月額"}（初回）`,
    status: "paid",
    createdAt: now,
  };

  licenses = [license, ...licenses];
  subscriptions = [subscription, ...subscriptions];
  certificates = [certificate, ...certificates];
  continuingEducation = [ce, ...continuingEducation];
  paymentHistory = [payment, ...paymentHistory];
  return license;
}

export function updateDemoLicenseAdmin(
  input: UpdateLicenseAdminInput,
  actorEmail: string | null = "admin@swij.local",
): LicenseRecord {
  const index = licenses.findIndex((item) => item.id === input.id);
  if (index < 0) throw new Error("ライセンスが見つかりません");

  let current = licenses[index]!;
  const now = new Date().toISOString();
  const note = (input.note ?? "").trim();

  const applyAction = (action: AdminLicenseAction) => {
    const fromStatus = current.status;
    if (action === "renew") {
      const expiresAt = (
        input.expiresAt ?? addYearsIso(todayIso(), 1)
      ).slice(0, 10);
      current = pushHistory(
        {
          ...current,
          status: "active",
          expiresAt,
          certificationLevel:
            input.certificationLevel ?? current.certificationLevel,
          adminMemo:
            input.adminMemo !== undefined
              ? input.adminMemo
              : current.adminMemo,
        },
        {
          at: now,
          action: "renewed",
          fromStatus,
          toStatus: "active",
          note: note || "ライセンス更新",
          actorEmail,
        },
      );
      subscriptions = subscriptions.map((sub) =>
        sub.licenseId === current.id
          ? {
              ...sub,
              status: "active" as const,
              plan: current.certificationLevel,
              currentPeriodStart: todayIso(),
              currentPeriodEnd: expiresAt,
              nextRenewalAt: expiresAt,
              updatedAt: now,
            }
          : sub,
      );
      continuingEducation = continuingEducation.map((ce) =>
        ce.licenseId === current.id
          ? {
              ...ce,
              hoursCompleted: 0,
              creditsEarned: 0,
              requiredHours: CE_REQUIRED_HOURS[current.certificationLevel],
              renewalRequirement: ceRequirementText(current.certificationLevel),
              periodStart: todayIso(),
              periodEnd: expiresAt,
              updatedAt: now,
            }
          : ce,
      );
      return;
    }

    if (action === "suspend") {
      current = pushHistory(
        { ...current, status: "suspended" },
        {
          at: now,
          action: "suspended",
          fromStatus,
          toStatus: "suspended",
          note: note || "ライセンス停止",
          actorEmail,
        },
      );
      return;
    }

    if (action === "revoke") {
      current = pushHistory(
        { ...current, status: "expired", expiresAt: todayIso() },
        {
          at: now,
          action: "revoked",
          fromStatus,
          toStatus: "expired",
          note: note || "ライセンス失効",
          actorEmail,
        },
      );
      subscriptions = subscriptions.map((sub) =>
        sub.licenseId === current.id
          ? { ...sub, status: "canceled" as const, updatedAt: now }
          : sub,
      );
      return;
    }

    if (action === "reactivate") {
      current = pushHistory(
        {
          ...current,
          status: "active",
          expiresAt: (input.expiresAt ?? addYearsIso(todayIso(), 1)).slice(
            0,
            10,
          ),
        },
        {
          at: now,
          action: "reactivated",
          fromStatus,
          toStatus: "active",
          note: note || "ライセンス再開",
          actorEmail,
        },
      );
    }
  };

  if (input.action) {
    applyAction(input.action);
  } else {
    current = pushHistory(
      {
        ...current,
        certificationLevel:
          input.certificationLevel ?? current.certificationLevel,
        expiresAt: input.expiresAt
          ? input.expiresAt.slice(0, 10)
          : current.expiresAt,
        adminMemo:
          input.adminMemo !== undefined ? input.adminMemo : current.adminMemo,
      },
      {
        at: now,
        action: "updated",
        fromStatus: current.status,
        toStatus: current.status,
        note: note || "管理者による編集",
        actorEmail,
      },
    );
  }

  if (
    input.hoursCompleted !== undefined ||
    input.creditsEarned !== undefined
  ) {
    continuingEducation = continuingEducation.map((ce) =>
      ce.licenseId === current.id
        ? {
            ...ce,
            hoursCompleted:
              input.hoursCompleted !== undefined
                ? input.hoursCompleted
                : ce.hoursCompleted,
            creditsEarned:
              input.creditsEarned !== undefined
                ? input.creditsEarned
                : ce.creditsEarned,
            updatedAt: now,
          }
        : ce,
    );
  }

  licenses = [
    ...licenses.slice(0, index),
    current,
    ...licenses.slice(index + 1),
  ];
  return current;
}

export function buildDemoLicensesCsv(
  rows: AdminLicenseListItem[],
): string {
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
