export type InstructorLicenseStatus =
  | "active"
  | "expiring"
  | "expired"
  | "suspended"
  | "pending"
  | "withdrawn";

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

/** 公開認証ページの判定結果 */
export type PublicLicenseVerdict = "valid" | "invalid" | "expired";

/** 公開認証ページの状態表記（有効・期限切れ・停止・取消） */
export type PublicLicenseStatusLabel =
  | "active"
  | "expired"
  | "suspended"
  | "withdrawn";

export type PublicLicenseVerification = {
  licenseNumber: string;
  certificationName: string;
  /** 活動名のみ（本名は含めない） */
  holderName: string;
  issuedAt: string;
  expiresAt: string;
  status: InstructorLicenseStatus;
  /** 公開用状態: 有効 / 期限切れ / 停止 / 取消 */
  publicStatus: PublicLicenseStatusLabel;
  /** 有効 / 無効 / 期限切れ */
  verdict: PublicLicenseVerdict;
  issuerName: string;
};

/** 管理者向け: 認定講師 + ライセンス一覧 */
export type AdminCertifiedInstructorListItem = {
  instructorId: string;
  userId: string;
  email: string;
  activityName: string;
  legalName: string;
  levelId: string;
  instructorNumber: string;
  certifiedAt: string;
  renewsAt: string;
  instructorStatus: string;
  adminMemo: string;
  license: InstructorLicenseRecord | null;
};

export type UpsertCertifiedInstructorInput = {
  id?: string;
  email: string;
  publicName: string;
  legalName: string;
  displayName?: string;
  levelId: string;
  /** 新規登録時は空で自動生成 */
  instructorNumber?: string;
  certifiedAt: string;
  renewsAt: string;
  userId?: string | null;
  adminMemo?: string;
  certificationName?: string;
  /** 同時にライセンスを発行／更新する場合 */
  issueLicense?: boolean;
  licenseStatus?: InstructorLicenseStatus;
  requiredEducationHours?: number;
  completedEducationHours?: number;
  renewalStatus?: InstructorRenewalStatus;
};

export type CreateAdminCertifiedInstructorInput = {
  email: string;
  publicName: string;
  legalName: string;
  levelId: string;
  certifiedAt: string;
  renewsAt: string;
  certificationName?: string;
  licenseStatus?: InstructorLicenseStatus;
};
