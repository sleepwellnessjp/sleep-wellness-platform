export const MELATONIN_YOGA_EVENT_TYPES = [
  "consultation",
  "workshop",
  "training_course",
] as const;

export type MelatoninYogaEventType = (typeof MELATONIN_YOGA_EVENT_TYPES)[number];

export const MELATONIN_YOGA_EVENT_TYPE_LABELS: Record<
  MelatoninYogaEventType,
  string
> = {
  consultation: "相談会",
  workshop: "ワークショップ",
  training_course: "養成コース",
};

/** 公開フォーム・メールでの参加費見出し（養成コースのみ「受講料」） */
export function melatoninYogaFeeLabel(eventType: MelatoninYogaEventType): string {
  return eventType === "training_course" ? "受講料" : "参加費";
}

export const MELATONIN_YOGA_SESSION_FORMATS = [
  "online",
  "in_person",
  "hybrid",
] as const;

export type MelatoninYogaSessionFormat =
  (typeof MELATONIN_YOGA_SESSION_FORMATS)[number];

export const MELATONIN_YOGA_SESSION_FORMAT_LABELS: Record<
  MelatoninYogaSessionFormat,
  string
> = {
  online: "オンライン",
  in_person: "対面",
  hybrid: "オンライン・対面",
};

export const MELATONIN_YOGA_TRAINING_FORMATS = [
  "online",
  "in_person",
  "archive",
] as const;

export type MelatoninYogaTrainingFormat =
  (typeof MELATONIN_YOGA_TRAINING_FORMATS)[number];

export const MELATONIN_YOGA_TRAINING_FORMAT_LABELS: Record<
  MelatoninYogaTrainingFormat,
  string
> = {
  online: "オンライン",
  in_person: "対面",
  archive: "アーカイブ",
};

export type MelatoninYogaEventSessionRow =
  import("@/lib/supabase/database.types").Database["public"]["Tables"]["melatonin_yoga_event_sessions"]["Row"];

export type MelatoninYogaSessionDayRow =
  import("@/lib/supabase/database.types").Database["public"]["Tables"]["melatonin_yoga_session_days"]["Row"];

export type MelatoninYogaSessionDay = {
  id: string;
  sessionId: string;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
};

export type MelatoninYogaSessionDayInput = {
  startsAt: string;
  endsAt: string;
};

export type MelatoninYogaSession = {
  id: string;
  eventType: MelatoninYogaEventType;
  startsAt: string;
  endsAt: string | null;
  format: MelatoninYogaSessionFormat;
  location: string;
  capacity: number;
  registrationClosed: boolean;
  published: boolean;
  adminNote: string;
  scheduleNote: string;
  feeNote: string;
  archiveAvailable: boolean;
  days: MelatoninYogaSessionDay[];
  createdAt: string;
  updatedAt: string;
  reservedCount: number;
};

export type MelatoninYogaSessionInput = {
  eventType: MelatoninYogaEventType;
  format: MelatoninYogaSessionFormat;
  location: string;
  capacity: number;
  registrationClosed: boolean;
  published: boolean;
  adminNote: string;
  scheduleNote: string;
  feeNote: string;
  archiveAvailable: boolean;
  days: MelatoninYogaSessionDayInput[];
};

/** 管理画面フォーム用（各開催日は日本時間の日付・時刻） */
export type MelatoninYogaSessionDayFormState = {
  clientKey: string;
  dateLocal: string;
  startTimeLocal: string;
  endTimeLocal: string;
};

export type MelatoninYogaSessionFormState = {
  eventType: MelatoninYogaEventType;
  days: MelatoninYogaSessionDayFormState[];
  scheduleNote: string;
  feeNote: string;
  format: MelatoninYogaSessionFormat;
  location: string;
  capacity: number;
  registrationClosed: boolean;
  published: boolean;
  archiveAvailable: boolean;
  adminNote: string;
};
