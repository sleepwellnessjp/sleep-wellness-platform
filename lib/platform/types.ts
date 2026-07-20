export type UserRole = "super_admin" | "admin" | "instructor" | "client";

export type CertificationType =
  | "navigator"
  | "melatonin_yoga_instructor"
  | "sleep_wellness_producer";

export type MembershipStatus =
  | "active"
  | "renewal_pending"
  | "suspended"
  | "expired";

export type CreditTransactionType =
  | "monthly_grant"
  | "analysis_use"
  | "purchase"
  | "admin_grant"
  | "admin_adjustment";

export type RoleRecord = {
  id: UserRole;
  label: string;
  description: string;
  permissions: Record<string, unknown>;
  createdAt: string;
};

export type PlatformProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
};

export type MembershipRecord = {
  id: string;
  userId: string;
  certificationType: CertificationType;
  certifiedAt: string | null;
  expiresAt: string | null;
  status: MembershipStatus;
  continuingEducation: Record<string, unknown>;
  adminMemo: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyCreditRecord = {
  id: string;
  userId: string;
  yearMonth: string;
  grantedAmount: number;
  usedAmount: number;
  createdAt: string;
};

export type CreditTransaction = {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  referenceId: string | null;
  description: string;
  createdBy: string | null;
  createdAt: string;
};

export type AnalysisHistoryRecord = {
  id: string;
  userId: string;
  clientId: string | null;
  analysisId: string | null;
  clientName: string;
  measurementDate: string | null;
  sleepScore: number | null;
  creditsConsumed: number;
  status: string;
  createdAt: string;
};

export type AdminLogRecord = {
  id: string;
  actorId: string;
  targetUserId: string | null;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export type InstructorSummary = {
  profile: PlatformProfile;
  membership: MembershipRecord | null;
  monthlyCredit: MonthlyCreditRecord | null;
  remainingCredits: number;
  analysesThisMonth: number;
};

export type PlatformAccessStatus = {
  allowed: boolean;
  reason: "ok" | "membership" | "credits" | "unauthenticated" | "demo";
  message: string;
  remainingCredits: number;
  membershipStatus: MembershipStatus | null;
  role: UserRole;
};

export type PlatformMeResponse = {
  profile: PlatformProfile;
  membership: MembershipRecord | null;
  monthlyCredit: MonthlyCreditRecord | null;
  remainingCredits: number;
  analysesThisMonth: number;
  recentAnalyses: AnalysisHistoryRecord[];
  notifications: NotificationRecord[];
  access: PlatformAccessStatus;
};
