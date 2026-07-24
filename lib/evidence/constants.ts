import type {
  EvidenceRating,
  NextAppointmentIntent,
} from "./types";

export const EVIDENCE_COLLECTION_VERSION = "1.0.0";
export const EVIDENCE_COLLECTION_PHASE_LABEL =
  "Version 1.0 Beta Evidence Collection · 実証データ収集";

export const EVIDENCE_RATINGS = [1, 2, 3, 4, 5] as const satisfies readonly EvidenceRating[];

export const EVIDENCE_RATING_LABELS: Record<EvidenceRating, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
};

export const NEXT_APPOINTMENT_OPTIONS = [
  "yes",
  "no",
  "undecided",
] as const satisfies readonly NextAppointmentIntent[];

export const NEXT_APPOINTMENT_LABELS: Record<NextAppointmentIntent, string> = {
  yes: "予約済み / 見込みあり",
  no: "なし",
  undecided: "未定",
};

/** セッションアンケート項目ラベル（認定講師） */
export const SESSION_SURVEY_LABELS = {
  satisfaction: "満足度",
  understanding: "理解度",
  homeworkLikelihood: "宿題実施見込み",
  nextAppointment: "次回予約",
  freeComment: "自由コメント",
} as const;

/** 翌朝アンケート項目ラベル（クライアント） */
export const MORNING_SURVEY_LABELS = {
  sleepSatisfaction: "睡眠満足度",
  morningMood: "起床時気分",
  daytimeCondition: "日中の調子",
  freeComment: "自由コメント",
} as const;

export function isEvidenceRating(value: unknown): value is EvidenceRating {
  const num = typeof value === "number" ? value : Number(value);
  return (
    Number.isInteger(num) &&
    (EVIDENCE_RATINGS as readonly number[]).includes(num)
  );
}

export function isNextAppointmentIntent(
  value: string,
): value is NextAppointmentIntent {
  return (NEXT_APPOINTMENT_OPTIONS as readonly string[]).includes(value);
}

/** 東京タイムゾーンの今日（YYYY-MM-DD） */
export function todayTokyoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** 評価平均を 0–100% に換算（1=0%, 5=100%） */
export function ratingToPercent(average: number): number {
  if (!Number.isFinite(average)) return 0;
  const clamped = Math.max(1, Math.min(5, average));
  return Math.round(((clamped - 1) / 4) * 100);
}

export function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
