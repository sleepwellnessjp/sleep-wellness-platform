export type ClientMessageSenderRole = "instructor" | "client";

export type ClientNotificationKind =
  | "message"
  | "homework"
  | "report"
  | "goal"
  | "advice"
  | "system";

export type ClientGoalCategory =
  | "sleep"
  | "homework"
  | "lifestyle"
  | "recovery"
  | "other";

export type ClientGoalStatus = "active" | "achieved" | "paused" | "archived";

export type ClientHomeworkCategory =
  | "homework"
  | "breathing"
  | "yoga"
  | "other";

export type ClientHomeworkMediaType = "none" | "video" | "pdf";

export type ClientPortalMessage = {
  id: string;
  clientId: string;
  instructorId: string;
  senderRole: ClientMessageSenderRole;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientPortalNotification = {
  id: string;
  clientId: string;
  kind: ClientNotificationKind;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientGoalProgress = {
  id: string;
  clientId: string;
  instructorId: string | null;
  title: string;
  description: string;
  category: ClientGoalCategory;
  targetValue: number | null;
  currentValue: number | null;
  unit: string;
  progressPercent: number;
  status: ClientGoalStatus;
  startsOn: string | null;
  targetOn: string | null;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientPortalPrefs = {
  portalEnabled: boolean;
  currentGoalSummary: string;
  improvementTargetScore: number | null;
  notificationPrefs: Record<string, unknown>;
  lastPortalSeenAt: string | null;
};

export type WeeklyScorePoint = {
  date: string;
  label: string;
  score: number | null;
};

export type SleepRecordMetric = {
  key: string;
  label: string;
  value: string;
  unit?: string;
};

export type CreateClientMessageInput = {
  clientId: string;
  body: string;
  asRole?: ClientMessageSenderRole;
};

export type CreateClientGoalInput = {
  clientId: string;
  title: string;
  description?: string;
  category?: ClientGoalCategory;
  targetValue?: number | null;
  currentValue?: number | null;
  unit?: string;
  progressPercent?: number;
  startsOn?: string | null;
  targetOn?: string | null;
};
