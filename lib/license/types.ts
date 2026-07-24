export type CertificationLevel =
  | "foundation"
  | "practitioner"
  | "instructor"
  | "navigator"
  | "producer";

export type LicenseStatus =
  | "active"
  | "renewal_pending"
  | "expired"
  | "suspended";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

export type BillingCycle = "monthly" | "yearly";

export type PaymentStatus = "paid" | "refunded" | "failed";

export type LicenseHistoryAction =
  | "issued"
  | "renewed"
  | "suspended"
  | "revoked"
  | "reactivated"
  | "updated";

export type LicenseHistoryEntry = {
  at: string;
  action: LicenseHistoryAction;
  fromStatus: LicenseStatus | null;
  toStatus: LicenseStatus | null;
  note: string;
  actorEmail: string | null;
};

export type LicenseRecord = {
  id: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  licenseNumber: string;
  certificationLevel: CertificationLevel;
  certifiedAt: string;
  expiresAt: string;
  status: LicenseStatus;
  statusHistory: LicenseHistoryEntry[];
  adminMemo: string;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionRecord = {
  id: string;
  userId: string;
  licenseId: string | null;
  plan: CertificationLevel;
  billingCycle: BillingCycle;
  monthlyAmount: number;
  yearlyAmount: number;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextRenewalAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CertificateRecord = {
  id: string;
  userId: string;
  licenseId: string;
  certificateNumber: string;
  holderName: string;
  issuedAt: string;
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
};

export type ContinuingEducationRecord = {
  id: string;
  userId: string;
  licenseId: string;
  hoursCompleted: number;
  creditsEarned: number;
  requiredHours: number;
  renewalRequirement: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentHistoryRecord = {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  paidAt: string;
  method: string;
  description: string;
  status: PaymentStatus;
  createdAt: string;
};

export type MyLicenseBundle = {
  license: LicenseRecord | null;
  subscription: SubscriptionRecord | null;
  certificate: CertificateRecord | null;
  continuingEducation: ContinuingEducationRecord | null;
  paymentHistory: PaymentHistoryRecord[];
  daysUntilExpiry: number | null;
};

export type AdminLicenseListItem = LicenseRecord & {
  plan: CertificationLevel | null;
  nextRenewalAt: string | null;
  subscriptionStatus: SubscriptionStatus | null;
};

export type IssueLicenseInput = {
  userId: string;
  userEmail?: string | null;
  userDisplayName?: string | null;
  certificationLevel: CertificationLevel;
  certifiedAt?: string;
  expiresAt?: string;
  adminMemo?: string;
  billingCycle?: BillingCycle;
};

export type AdminLicenseAction =
  | "renew"
  | "suspend"
  | "revoke"
  | "reactivate";

export type UpdateLicenseAdminInput = {
  id: string;
  action?: AdminLicenseAction;
  certificationLevel?: CertificationLevel;
  expiresAt?: string;
  adminMemo?: string;
  note?: string;
  hoursCompleted?: number;
  creditsEarned?: number;
};
