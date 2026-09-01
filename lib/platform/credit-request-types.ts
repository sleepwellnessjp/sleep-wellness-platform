import type { CreditRequestStatus } from "./credit-pack-constants";

export type CreditRequestRecord = {
  id: string;
  userId: string;
  sets: number;
  credits: number;
  amountYen: number;
  status: CreditRequestStatus;
  note: string;
  adminMemo: string;
  requestedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  applicantDisplayName: string | null;
  applicantEmail: string | null;
};

export type CreateCreditRequestInput = {
  sets: number;
  note?: string;
};

export type ReviewCreditRequestInput = {
  id: string;
  action: "approve" | "reject";
  adminMemo?: string;
};
