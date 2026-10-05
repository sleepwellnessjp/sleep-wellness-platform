import type { YogaFest2026SoxaiClassId } from "@/lib/yoga-fest-2026-soxai/classes";

export const YOGA_FEST_SOXAI_AGE_BANDS = [
  "18歳未満",
  "18〜19歳",
  "20代",
  "30代",
  "40代",
  "50代",
  "60代",
  "70代以上",
] as const;

export type YogaFestSoxaiAgeBand = (typeof YOGA_FEST_SOXAI_AGE_BANDS)[number];

export const YOGA_FEST_SOXAI_MINOR_AGE_BAND: YogaFestSoxaiAgeBand = "18歳未満";

export function isYogaFestSoxaiAgeBand(value: string): value is YogaFestSoxaiAgeBand {
  return (YOGA_FEST_SOXAI_AGE_BANDS as readonly string[]).includes(value);
}

export type YogaFest2026SoxaiRegistrationInput = {
  classId: YogaFest2026SoxaiClassId;
  name: string;
  ageBand: YogaFestSoxaiAgeBand;
  email: string;
  guardianName: string;
  guardianConsent: boolean;
  infoConsent: boolean;
};

export type YogaFest2026SoxaiRegistrationRecord = {
  id: string;
  classId: YogaFest2026SoxaiClassId;
  name: string;
  ageBand: YogaFestSoxaiAgeBand;
  email: string;
  guardianName: string | null;
  guardianConsent: boolean;
  infoConsent: boolean;
  submitterIp: string;
  submittedAt: string;
};
