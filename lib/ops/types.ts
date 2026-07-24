/** Sleep Wellness Institute Japan — Version 2.1 運営システム型 */

export type SchoolStatus = "active" | "suspended" | "closed";

export type InstructorOpsStatus =
  | "active"
  | "renewal_pending"
  | "suspended"
  | "withdrawn"
  | "expired";

export type InstructorOpsAction =
  | "renew"
  | "suspend"
  | "withdraw"
  | "reactivate"
  | "change_level"
  | "assign_school";

export type CourseType = "certification" | "workshop" | "ce" | "open";

export type CourseStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type StudentStatus = "enrolled" | "completed" | "dropped" | "deferred";

export type OpsNotificationKind =
  | "hq_announcement"
  | "certification_renewal"
  | "event"
  | "material_update"
  | "ai_notice";

export type OpsNotificationAudience =
  | "all"
  | "all_instructors"
  | "all_admins"
  | "school"
  | "instructor";

export type OpsEventType =
  | "seminar"
  | "workshop"
  | "webinar"
  | "ceremony"
  | "other";

export type OpsEventStatus =
  | "scheduled"
  | "open"
  | "closed"
  | "cancelled"
  | "completed";

export type InstructorStatusHistoryEntry = {
  at: string;
  action: InstructorOpsAction | "registered" | "expired";
  fromStatus: InstructorOpsStatus | null;
  toStatus: InstructorOpsStatus | null;
  note: string;
  actorEmail: string | null;
};

export type CertificationLevelRecord = {
  id: string;
  label: string;
  labelEn: string;
  sortOrder: number;
  description: string;
  renewalMonths: number;
  ceHoursRequired: number;
  isActive: boolean;
  instructorCount: number;
};

export type CertifiedSchoolRecord = {
  id: string;
  code: string;
  name: string;
  nameKana: string;
  region: string;
  prefecture: string;
  address: string;
  representativeName: string;
  contactEmail: string;
  contactPhone: string;
  status: SchoolStatus;
  certifiedAt: string;
  adminMemo: string;
  instructorCount: number;
  studentCount: number;
  courseCount: number;
  completionRate: number | null;
  activityLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type CertifiedInstructorRecord = {
  id: string;
  userId: string;
  schoolId: string | null;
  schoolName: string | null;
  levelId: string;
  levelLabel: string;
  instructorNumber: string;
  displayName: string;
  email: string;
  status: InstructorOpsStatus;
  certifiedAt: string;
  renewsAt: string;
  /** Closed Beta 利用開始日（YYYY-MM-DD）。未設定時は招待 start_date を参照 */
  usageStartDate: string | null;
  suspendedAt: string | null;
  withdrawnAt: string | null;
  lastRenewedAt: string | null;
  daysUntilRenewal: number | null;
  statusHistory: InstructorStatusHistoryEntry[];
  adminMemo: string;
  clientCountThisMonth: number;
  analysisCountThisMonth: number;
  createdAt: string;
  updatedAt: string;
};

export type SchoolCourseRecord = {
  id: string;
  schoolId: string;
  title: string;
  courseType: CourseType;
  levelId: string | null;
  startsOn: string | null;
  endsOn: string | null;
  capacity: number;
  enrolledCount: number;
  completedCount: number;
  status: CourseStatus;
  instructorId: string | null;
  instructorName: string | null;
};

export type SchoolStudentRecord = {
  id: string;
  schoolId: string;
  courseId: string | null;
  courseTitle: string | null;
  displayName: string;
  email: string;
  status: StudentStatus;
  enrolledAt: string;
  completedAt: string | null;
};

export type SchoolDetailBundle = {
  school: CertifiedSchoolRecord;
  instructors: CertifiedInstructorRecord[];
  students: SchoolStudentRecord[];
  courses: SchoolCourseRecord[];
  completionRate: number | null;
  activity: {
    label: string;
    activeInstructors: number;
    openCourses: number;
    recentCompletions: number;
  };
};

export type OpsNotificationRecord = {
  id: string;
  kind: OpsNotificationKind;
  audience: OpsNotificationAudience;
  title: string;
  body: string;
  href: string | null;
  publishedAt: string;
  expiresAt: string | null;
  isPinned: boolean;
  createdBy: string | null;
  readAt?: string | null;
};

export type OpsEventRecord = {
  id: string;
  title: string;
  eventType: OpsEventType;
  region: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  registeredCount: number;
  status: OpsEventStatus;
  schoolId: string | null;
};

/** Module 4 — SWIJ 本部ダッシュボード */
export type HqOpsDashboard = {
  instructorCount: number;
  schoolCount: number;
  analysisCount: number;
  averageImprovementRate: number | null;
  activeRate: number | null;
  eventCount: number;
  renewingSoonCount: number;
  suspendedCount: number;
  generatedAt: string;
};

/** Module 3 — 認定講師ダッシュボード KPI */
export type InstructorOpsDashboard = {
  clientsThisMonth: number;
  analysesThisMonth: number;
  improvementRate: number | null;
  retentionRate: number | null;
  licenseStatus: InstructorOpsStatus | "unknown";
  licenseStatusLabel: string;
  renewsAt: string | null;
  daysUntilRenewal: number | null;
  levelLabel: string | null;
  schoolName: string | null;
  instructorNumber: string | null;
  generatedAt: string;
};

export type UpdateInstructorOpsInput = {
  id: string;
  action: InstructorOpsAction;
  levelId?: string;
  schoolId?: string | null;
  renewsAt?: string;
  /** Closed Beta 利用開始日（YYYY-MM-DD）。null でクリア */
  usageStartDate?: string | null;
  note?: string;
  adminMemo?: string;
};

export type UpsertSchoolInput = {
  id?: string;
  code: string;
  name: string;
  nameKana?: string;
  region?: string;
  prefecture?: string;
  address?: string;
  representativeName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: SchoolStatus;
  certifiedAt?: string;
  adminMemo?: string;
};

export type PublishOpsNotificationInput = {
  kind: OpsNotificationKind;
  audience?: OpsNotificationAudience;
  title: string;
  body: string;
  href?: string | null;
  isPinned?: boolean;
  expiresAt?: string | null;
};

export type UpdateLevelInput = {
  id: string;
  label?: string;
  description?: string;
  renewalMonths?: number;
  ceHoursRequired?: number;
  isActive?: boolean;
};
