export type FeedbackCategory =
  | "bug"
  | "improvement"
  | "confusing"
  | "feature_request"
  | "positive"
  | "other";

export type FeedbackTargetScreen =
  | "dashboard"
  | "clients"
  | "analysis"
  | "report"
  | "journey"
  | "homework"
  | "follow_up"
  | "ai_assistant"
  | "demo_mode"
  | "other";

export type FeedbackSeverity = "low" | "medium" | "high" | "urgent";

export type FeedbackStatus =
  | "unconfirmed"
  | "reviewing"
  | "planned"
  | "resolved"
  | "on_hold";

export type FeedbackDeviceType = "pc" | "mobile" | "tablet" | "";

/** HQ 対応優先順位（Version 2.4） */
export type FeedbackPriority = "p0" | "p1" | "p2" | "p3";

export type FeedbackRecord = {
  id: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  category: FeedbackCategory;
  targetScreen: FeedbackTargetScreen;
  severity: FeedbackSeverity;
  content: string;
  reproductionSteps: string;
  device: string;
  browser: string;
  currentUrl: string;
  screenName: string;
  deviceType: FeedbackDeviceType;
  browserInfo: string;
  appVersion: string;
  /** 使いやすさ評価 1〜5（任意） */
  usabilityRating: number | null;
  /** 本部が設定する優先順位 */
  priority: FeedbackPriority;
  status: FeedbackStatus;
  adminMemo: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateFeedbackInput = {
  category: FeedbackCategory;
  targetScreen: FeedbackTargetScreen;
  severity: FeedbackSeverity;
  content: string;
  reproductionSteps?: string;
  device?: string;
  browser?: string;
  currentUrl?: string;
  screenName?: string;
  deviceType?: FeedbackDeviceType;
  browserInfo?: string;
  appVersion?: string;
  usabilityRating?: number | null;
};

export type UpdateFeedbackAdminInput = {
  id: string;
  status?: FeedbackStatus;
  adminMemo?: string;
  priority?: FeedbackPriority;
};
