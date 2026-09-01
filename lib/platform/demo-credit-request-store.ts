import {
  CREDIT_PACK_MAX_SETS,
  CREDIT_PACK_MIN_SETS,
  creditsForSets,
  yenForSets,
} from "./credit-pack-constants";
import type {
  CreateCreditRequestInput,
  CreditRequestRecord,
  ReviewCreditRequestInput,
} from "./credit-request-types";

const DEMO_USER_ID = "demo-instructor";

let memoryStore: CreditRequestRecord[] = [];

function hasPending(userId: string): boolean {
  return memoryStore.some(
    (item) => item.userId === userId && item.status === "pending",
  );
}

export function listDemoCreditRequests(input?: {
  userId?: string;
}): CreditRequestRecord[] {
  const list = input?.userId
    ? memoryStore.filter((item) => item.userId === input.userId)
    : [...memoryStore];
  return list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function createDemoCreditRequest(
  input: CreateCreditRequestInput,
  actor: { userId: string; displayName: string | null; email: string | null },
): CreditRequestRecord {
  const sets = Math.floor(Number(input.sets));
  if (
    !Number.isFinite(sets) ||
    sets < CREDIT_PACK_MIN_SETS ||
    sets > CREDIT_PACK_MAX_SETS
  ) {
    throw new Error("セット数は1〜5の範囲で選択してください");
  }
  if (hasPending(actor.userId)) {
    throw new Error("申請中のリクエストがあります。振込確認後にお待ちください。");
  }

  const record: CreditRequestRecord = {
    id: `cr-demo-${Date.now()}`,
    userId: actor.userId,
    sets,
    credits: creditsForSets(sets),
    amountYen: yenForSets(sets),
    status: "pending",
    note: (input.note ?? "").trim(),
    adminMemo: "",
    requestedAt: new Date().toISOString(),
    approvedAt: null,
    approvedBy: null,
    applicantDisplayName: actor.displayName,
    applicantEmail: actor.email,
  };
  memoryStore = [record, ...memoryStore];
  return record;
}

export function reviewDemoCreditRequest(
  input: ReviewCreditRequestInput,
  actorId: string,
): CreditRequestRecord {
  const target = memoryStore.find((item) => item.id === input.id);
  if (!target) {
    throw new Error("申請が見つかりません");
  }
  if (target.status === "approved") {
    return target;
  }
  if (target.status !== "pending") {
    throw new Error("この申請はすでに処理済みです");
  }

  const next: CreditRequestRecord = {
    ...target,
    status: input.action === "approve" ? "approved" : "rejected",
    adminMemo:
      input.adminMemo !== undefined ? input.adminMemo.trim() : target.adminMemo,
    approvedAt: new Date().toISOString(),
    approvedBy: actorId,
  };
  memoryStore = memoryStore.map((item) => (item.id === target.id ? next : item));
  return next;
}
