export const CREDIT_PACK_CREDITS_PER_SET = 10;
export const CREDIT_PACK_YEN_PER_SET = 1000;
export const CREDIT_PACK_MIN_SETS = 1;
export const CREDIT_PACK_MAX_SETS = 5;

export const CREDIT_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type CreditRequestStatus = (typeof CREDIT_REQUEST_STATUSES)[number];

export const CREDIT_REQUEST_STATUS_LABELS: Record<CreditRequestStatus, string> =
  {
    pending: "申請中",
    approved: "承認済み",
    rejected: "却下",
  };

export function creditsForSets(sets: number): number {
  return sets * CREDIT_PACK_CREDITS_PER_SET;
}

export function yenForSets(sets: number): number {
  return sets * CREDIT_PACK_YEN_PER_SET;
}

export function isCreditRequestStatus(
  value: string,
): value is CreditRequestStatus {
  return (CREDIT_REQUEST_STATUSES as readonly string[]).includes(value);
}
