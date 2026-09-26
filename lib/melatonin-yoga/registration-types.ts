import type {
  MelatoninYogaEventType,
  MelatoninYogaSessionFormat,
  MelatoninYogaTrainingFormat,
} from "@/lib/melatonin-yoga/types";

export const MELATONIN_YOGA_REGISTRATION_STATUSES = [
  { value: "new", label: "新規" },
  { value: "contacted", label: "連絡済み" },
  { value: "confirmed", label: "参加確定" },
  { value: "cancelled", label: "キャンセル" },
] as const;

export type MelatoninYogaRegistrationStatus =
  (typeof MELATONIN_YOGA_REGISTRATION_STATUSES)[number]["value"];

export function isMelatoninYogaRegistrationStatus(
  value: string,
): value is MelatoninYogaRegistrationStatus {
  return MELATONIN_YOGA_REGISTRATION_STATUSES.some(
    (item) => item.value === value,
  );
}

export function registrationStatusLabel(status: string): string {
  return (
    MELATONIN_YOGA_REGISTRATION_STATUSES.find((item) => item.value === status)
      ?.label ?? status
  );
}

export type MelatoninYogaRegistrationSelectionInput = {
  eventType: MelatoninYogaEventType;
  sessionId: string | null;
  isFlexible: boolean;
};

export type MelatoninYogaRegistrationInput = {
  nameKanji: string;
  nameKana: string;
  email: string;
  phone: string;
  hasYogaExperience: boolean;
  message: string;
  referralSource: string;
  trainingFormat: string | null;
  selections: MelatoninYogaRegistrationSelectionInput[];
};

export type PublicMelatoninYogaSessionDay = {
  startsAt: string;
  endsAt: string;
};

export type PublicMelatoninYogaSession = {
  id: string;
  eventType: MelatoninYogaEventType;
  days: PublicMelatoninYogaSessionDay[];
  scheduleNote: string | null;
  format: MelatoninYogaSessionFormat;
  location: string;
  feeNote: string | null;
  archiveAvailable: boolean;
  isFull: boolean;
};

export type MelatoninYogaRegistrationSelectionRecord = {
  eventType: MelatoninYogaEventType;
  isFlexible: boolean;
  sessionId: string | null;
  sessionFormat: MelatoninYogaSessionFormat | null;
  sessionLocation: string | null;
  sessionScheduleNote: string | null;
  sessionFeeNote: string | null;
  sessionDays: PublicMelatoninYogaSessionDay[];
};

export type MelatoninYogaRegistrationRecord = {
  id: string;
  nameKanji: string;
  nameKana: string;
  email: string;
  phone: string;
  trainingFormat: MelatoninYogaTrainingFormat | null;
  hasYogaExperience: boolean;
  message: string;
  referralSource: string | null;
  status: MelatoninYogaRegistrationStatus;
  adminMemo: string;
  submittedAt: string;
  selections: MelatoninYogaRegistrationSelectionRecord[];
};
