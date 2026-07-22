import type { CertificationType, MembershipStatus, UserRole } from "@/lib/platform/types";

export type ActivityLogCategory =
  | "login"
  | "analysis"
  | "pdf"
  | "ai"
  | "admin"
  | "other";

export type AdminDashboardStats = {
  instructorCount: number;
  clientCount: number;
  totalAnalyses: number;
  analysesThisMonth: number;
  averageSleepScore: number | null;
  newRegistrationsThisMonth: number;
  retentionRate: number | null;
};

export type AdminInstructorRow = {
  id: string;
  displayName: string | null;
  email: string | null;
  certificationType: CertificationType | null;
  certificationLabel: string;
  clientCount: number;
  analysisCount: number;
  lastLoginAt: string | null;
  status: MembershipStatus | null;
  statusLabel: string;
  remainingCredits: number;
  analysesThisMonth: number;
  adminMemo: string;
  expiresAt: string | null;
  createdAt: string;
};

export type AdminClientRow = {
  id: string;
  name: string;
  instructorId: string;
  instructorName: string;
  sleepWellnessScore: number | null;
  lastAnalysisAt: string | null;
  continuityDays: number;
  status: "active" | "inactive" | "new";
  statusLabel: string;
  registeredAt: string | null;
  analysisCount: number;
};

export type AdminAcademyQualificationStat = {
  qualificationId: CertificationType;
  label: string;
  issuedCount: number;
  renewingSoonCount: number;
  expiredCount: number;
};

export type AdminAcademyCredentialRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  qualificationId: CertificationType;
  qualificationLabel: string;
  certificateNumber: string;
  acquiredAt: string;
  expiresAt: string;
  renewedAt: string | null;
  daysUntilExpiry: number | null;
};

export type AdminAcademyOverview = {
  byQualification: AdminAcademyQualificationStat[];
  totalIssued: number;
  renewingSoon: AdminAcademyCredentialRow[];
  expiryCalendar: AdminAcademyCredentialRow[];
};

export type MonthlyAnalysisPoint = {
  yearMonth: string;
  label: string;
  count: number;
  averageScore: number | null;
};

export type AdminAnalyticsOverview = {
  monthly: MonthlyAnalysisPoint[];
  averageScore: number | null;
  improvementRate: number | null;
  averageAnalysisMinutes: number | null;
  totalAnalyses: number;
};

export type PlatformSettingsRecord = {
  id: string;
  brandPrimary: string;
  brandAccent: string;
  logoUrl: string;
  termsOfService: string;
  privacyPolicy: string;
  contactEmail: string;
  contactPhone: string;
  contactNote: string;
  updatedAt: string;
};

export type SystemActivityLogRecord = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  category: ActivityLogCategory;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AdminLogBundle = {
  activityLogs: SystemActivityLogRecord[];
  adminLogs: Array<{
    id: string;
    actorId: string;
    targetUserId: string | null;
    action: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
};

export type AdminRoleGate = {
  role: UserRole;
  allowed: boolean;
};
