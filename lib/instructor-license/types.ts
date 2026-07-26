export type InstructorLicenseStatus =
  | "active"
  | "expiring"
  | "expired"
  | "suspended"
  | "pending";

export type InstructorRenewalStatus =
  | "not_requested"
  | "requested"
  | "approved"
  | "rejected";

export type InstructorLicenseRecord = {
  id: string;
  instructorId: string;
  certificationLevelId: string;
  certificationLevelLabel: string;
  certificationName: string;
  licenseNumber: string;
  issuedAt: string;
  expiresAt: string;
  status: InstructorLicenseStatus;
  requiredEducationHours: number;
  completedEducationHours: number;
  renewalStatus: InstructorRenewalStatus;
  renewalRequestedAt: string | null;
  adminNote: string;
  verificationCode: string;
  issuerName: string;
  createdAt: string;
  updatedAt: string;
};

export type MyInstructorLicenseView = {
  license: InstructorLicenseRecord | null;
  activityName: string;
  legalName: string;
  email: string;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  renewalCondition: string;
  verificationUrl: string | null;
  /** true when certified_instructors exists but license row does not */
  licensePendingSetup: boolean;
  /** true when user is not a certified instructor */
  notCertifiedInstructor: boolean;
};

export type AdminInstructorLicenseListItem = InstructorLicenseRecord & {
  activityName: string;
  legalName: string;
  email: string;
  userId: string;
};

export type UpsertInstructorLicenseInput = {
  id?: string;
  instructorId: string;
  certificationLevelId: string;
  certificationName: string;
  licenseNumber: string;
  issuedAt: string;
  expiresAt: string;
  status: InstructorLicenseStatus;
  requiredEducationHours: number;
  completedEducationHours: number;
  renewalStatus?: InstructorRenewalStatus;
  adminNote?: string;
};

export type AdminInstructorLicenseFilters = {
  nameQ?: string;
  emailQ?: string;
  level?: string;
  status?: string;
  expiry?: "all" | "within_90" | "expired" | "over_90";
};

export type PublicLicenseVerification = {
  licenseNumber: string;
  certificationName: string;
  holderName: string;
  issuedAt: string;
  expiresAt: string;
  status: InstructorLicenseStatus;
  issuerName: string;
};
