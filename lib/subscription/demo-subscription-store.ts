import type {
  CommercialPlanId,
  CommercialSubscriptionRecord,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

let subscriptions: CommercialSubscriptionRecord[] = [
  {
    id: "csub-demo-1",
    userId: "demo-instructor",
    userEmail: "demo@swij.local",
    userDisplayName: "デモ インストラクター",
    planId: "professional",
    status: "trialing",
    billingCycle: "yearly",
    currentPeriodEnd: daysFromNow(60),
    mockNote: "モック: 課金ゲートウェイ未接続（Version 2.2）",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "csub-demo-2",
    userId: "demo-instructor-2",
    userEmail: "sato@swij.local",
    userDisplayName: "佐藤 美咲",
    planId: "basic",
    status: "active",
    billingCycle: "monthly",
    currentPeriodEnd: daysFromNow(18),
    mockNote: "モック: 請求シミュレーションのみ",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export function listDemoCommercialSubscriptions(): CommercialSubscriptionRecord[] {
  return [...subscriptions].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function getDemoCommercialSubscription(
  userId: string,
): CommercialSubscriptionRecord | null {
  return subscriptions.find((row) => row.userId === userId) ?? null;
}

export function setDemoCommercialPlan(params: {
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  planId: CommercialPlanId;
}): CommercialSubscriptionRecord {
  const existing = subscriptions.find((row) => row.userId === params.userId);
  const now = nowIso();
  if (existing) {
    const updated: CommercialSubscriptionRecord = {
      ...existing,
      planId: params.planId,
      status: "trialing",
      updatedAt: now,
      mockNote: "モック: プラン変更（課金未接続）",
    };
    subscriptions = subscriptions.map((row) =>
      row.id === existing.id ? updated : row,
    );
    return updated;
  }
  const created: CommercialSubscriptionRecord = {
    id: `csub-${Math.random().toString(36).slice(2, 10)}`,
    userId: params.userId,
    userEmail: params.userEmail,
    userDisplayName: params.userDisplayName,
    planId: params.planId,
    status: "trialing",
    billingCycle: "monthly",
    currentPeriodEnd: daysFromNow(30),
    mockNote: "モック: 新規トライアル（課金未接続）",
    createdAt: now,
    updatedAt: now,
  };
  subscriptions = [created, ...subscriptions];
  return created;
}
