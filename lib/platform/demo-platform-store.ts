import {
  ANALYSIS_CREDIT_COST,
  currentYearMonth,
  MONTHLY_CREDIT_ALLOWANCE,
} from "./constants";
import type {
  AdminLogRecord,
  AnalysisHistoryRecord,
  CreditTransaction,
  InstructorSummary,
  MembershipRecord,
  MonthlyCreditRecord,
  PlatformAccessStatus,
  PlatformMeResponse,
  PlatformProfile,
  UserRole,
} from "./types";

const STORAGE_KEY = "swij-platform-v1";

type DemoStore = {
  profiles: PlatformProfile[];
  memberships: MembershipRecord[];
  monthlyCredits: MonthlyCreditRecord[];
  creditTransactions: CreditTransaction[];
  analysisHistory: AnalysisHistoryRecord[];
  adminLogs: AdminLogRecord[];
};

const DEMO_USER_ID = "demo-instructor";
const DEMO_SUPER_ADMIN_ID = "demo-super-admin";

function emptyStore(): DemoStore {
  return {
    profiles: [],
    memberships: [],
    monthlyCredits: [],
    creditTransactions: [],
    analysisHistory: [],
    adminLogs: [],
  };
}

function loadStore(): DemoStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDemoStore();
    return JSON.parse(raw) as DemoStore;
  } catch {
    return seedDemoStore();
  }
}

function saveStore(store: DemoStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function seedDemoStore(): DemoStore {
  const now = new Date().toISOString();
  const ym = currentYearMonth();
  const store: DemoStore = {
    profiles: [
      {
        id: DEMO_SUPER_ADMIN_ID,
        email: "admin@swij.demo",
        displayName: "若林 貴久",
        role: "super_admin",
        createdAt: now,
      },
      {
        id: DEMO_USER_ID,
        email: "instructor@swij.demo",
        displayName: "デモ インストラクター",
        role: "instructor",
        createdAt: now,
      },
    ],
    memberships: [
      {
        id: "demo-membership-1",
        userId: DEMO_USER_ID,
        certificationType: "melatonin_yoga_instructor",
        certifiedAt: "2025-04-01",
        expiresAt: "2027-03-31",
        status: "active",
        continuingEducation: {},
        adminMemo: "",
        createdAt: now,
        updatedAt: now,
      },
    ],
    monthlyCredits: [
      {
        id: "demo-monthly-1",
        userId: DEMO_USER_ID,
        yearMonth: ym,
        grantedAmount: MONTHLY_CREDIT_ALLOWANCE,
        usedAmount: 0,
        createdAt: now,
      },
    ],
    creditTransactions: [],
    analysisHistory: [],
    adminLogs: [],
  };
  saveStore(store);
  return store;
}

function ensureMonthlyCredit(
  store: DemoStore,
  userId: string,
  yearMonth = currentYearMonth(),
): MonthlyCreditRecord {
  let record = store.monthlyCredits.find(
    (item) => item.userId === userId && item.yearMonth === yearMonth,
  );
  if (record) return record;

  const now = new Date().toISOString();
  record = {
    id: `monthly-${userId}-${yearMonth}`,
    userId,
    yearMonth,
    grantedAmount: MONTHLY_CREDIT_ALLOWANCE,
    usedAmount: 0,
    createdAt: now,
  };
  store.monthlyCredits.push(record);
  store.creditTransactions.push({
    id: `tx-grant-${Date.now()}`,
    userId,
    type: "monthly_grant",
    amount: MONTHLY_CREDIT_ALLOWANCE,
    balanceAfter: MONTHLY_CREDIT_ALLOWANCE,
    referenceId: record.id,
    description: `${yearMonth} 月次付与`,
    createdBy: null,
    createdAt: now,
  });
  return record;
}

function remainingCredits(record: MonthlyCreditRecord | null): number {
  if (!record) return 0;
  return Math.max(0, record.grantedAmount - record.usedAmount);
}

function buildAccess(
  profile: PlatformProfile,
  membership: MembershipRecord | null,
  monthlyCredit: MonthlyCreditRecord | null,
): PlatformAccessStatus {
  if (profile.role === "super_admin" || profile.role === "admin") {
    return {
      allowed: true,
      reason: "demo",
      message: "デモモード",
      remainingCredits: 999,
      membershipStatus: membership?.status ?? null,
      role: profile.role,
    };
  }

  if (!membership || membership.status !== "active") {
    return {
      allowed: false,
      reason: "membership",
      message:
        "認定資格の更新が必要です。Sleep Wellness Institute Japan までお問い合わせください。",
      remainingCredits: remainingCredits(monthlyCredit),
      membershipStatus: membership?.status ?? null,
      role: profile.role,
    };
  }

  const remaining = remainingCredits(monthlyCredit);
  if (remaining < ANALYSIS_CREDIT_COST) {
    return {
      allowed: false,
      reason: "credits",
      message: "クレジットが不足しています。管理者にお問い合わせください。",
      remainingCredits: remaining,
      membershipStatus: membership.status,
      role: profile.role,
    };
  }

  return {
    allowed: true,
    reason: "demo",
    message: "分析可能",
    remainingCredits: remaining,
    membershipStatus: membership.status,
    role: profile.role,
  };
}

export function getDemoProfile(role: UserRole = "instructor"): PlatformProfile {
  const store = loadStore();
  if (role === "super_admin") {
    return (
      store.profiles.find((item) => item.role === "super_admin") ??
      store.profiles[0]
    );
  }
  return (
    store.profiles.find((item) => item.role === "instructor") ?? store.profiles[0]
  );
}

export function getDemoPlatformMe(
  role: UserRole = "instructor",
): PlatformMeResponse {
  const store = loadStore();
  const profile = getDemoProfile(role);
  const membership =
    store.memberships.find((item) => item.userId === profile.id) ?? null;
  const monthlyCredit = ensureMonthlyCredit(store, profile.id);
  saveStore(store);

  const ym = currentYearMonth();
  const analysesThisMonth = store.analysisHistory.filter(
    (item) =>
      item.userId === profile.id && item.createdAt.startsWith(ym.slice(0, 7)),
  ).length;

  return {
    profile,
    membership,
    monthlyCredit,
    remainingCredits: remainingCredits(monthlyCredit),
    analysesThisMonth,
    recentAnalyses: store.analysisHistory
      .filter((item) => item.userId === profile.id)
      .slice(0, 10),
    notifications: [],
    access: buildAccess(profile, membership, monthlyCredit),
  };
}

export function checkDemoAnalysisAccess(
  role: UserRole = "instructor",
): PlatformAccessStatus {
  return getDemoPlatformMe(role).access;
}

export function consumeDemoAnalysisCredit(input: {
  clientName: string;
  measurementDate?: string;
  sleepScore?: number | null;
  clientId?: string;
  role?: UserRole;
}): { ok: boolean; message: string } {
  const store = loadStore();
  const profile = getDemoProfile(input.role ?? "instructor");
  if (profile.role === "super_admin" || profile.role === "admin") {
    return { ok: true, message: "管理者は消費対象外" };
  }

  const membership =
    store.memberships.find((item) => item.userId === profile.id) ?? null;
  const monthlyCredit = ensureMonthlyCredit(store, profile.id);
  const access = buildAccess(profile, membership, monthlyCredit);
  if (!access.allowed) {
    return { ok: false, message: access.message };
  }

  monthlyCredit.usedAmount += ANALYSIS_CREDIT_COST;
  const remaining = remainingCredits(monthlyCredit);
  const now = new Date().toISOString();
  const historyId = `history-${Date.now()}`;

  store.analysisHistory.unshift({
    id: historyId,
    userId: profile.id,
    clientId: input.clientId ?? null,
    analysisId: null,
    clientName: input.clientName,
    measurementDate: input.measurementDate ?? null,
    sleepScore: input.sleepScore ?? null,
    creditsConsumed: ANALYSIS_CREDIT_COST,
    status: "completed",
    createdAt: now,
  });

  store.creditTransactions.unshift({
    id: `tx-use-${Date.now()}`,
    userId: profile.id,
    type: "analysis_use",
    amount: -ANALYSIS_CREDIT_COST,
    balanceAfter: remaining,
    referenceId: historyId,
    description: `睡眠分析: ${input.clientName}`,
    createdBy: profile.id,
    createdAt: now,
  });

  saveStore(store);
  return { ok: true, message: "クレジットを消費しました" };
}

export function listDemoInstructors(): InstructorSummary[] {
  const store = loadStore();
  return store.profiles
    .filter((profile) => profile.role === "instructor")
    .map((profile) => {
      const membership =
        store.memberships.find((item) => item.userId === profile.id) ?? null;
      const monthlyCredit = ensureMonthlyCredit(store, profile.id);
      const ym = currentYearMonth();
      const analysesThisMonth = store.analysisHistory.filter(
        (item) =>
          item.userId === profile.id &&
          item.createdAt.startsWith(ym.slice(0, 7)),
      ).length;
      return {
        profile,
        membership,
        monthlyCredit,
        remainingCredits: remainingCredits(monthlyCredit),
        analysesThisMonth,
      };
    });
}

export function grantDemoCredits(input: {
  userId: string;
  amount: number;
  actorId: string;
  description?: string;
}) {
  const store = loadStore();
  const monthlyCredit = ensureMonthlyCredit(store, input.userId);
  monthlyCredit.grantedAmount += input.amount;
  const remaining = remainingCredits(monthlyCredit);
  const now = new Date().toISOString();

  store.creditTransactions.unshift({
    id: `tx-admin-${Date.now()}`,
    userId: input.userId,
    type: "admin_grant",
    amount: input.amount,
    balanceAfter: remaining,
    referenceId: null,
    description: input.description ?? `管理者付与 +${input.amount}`,
    createdBy: input.actorId,
    createdAt: now,
  });

  store.adminLogs.unshift({
    id: `log-${Date.now()}`,
    actorId: input.actorId,
    targetUserId: input.userId,
    action: "credit_grant",
    payload: { amount: input.amount },
    createdAt: now,
  });

  saveStore(store);
}

export function updateDemoMembership(input: {
  userId: string;
  status?: MembershipRecord["status"];
  expiresAt?: string | null;
  adminMemo?: string;
  actorId: string;
}) {
  const store = loadStore();
  let membership = store.memberships.find((item) => item.userId === input.userId);
  const now = new Date().toISOString();

  if (!membership) {
    membership = {
      id: `membership-${input.userId}`,
      userId: input.userId,
      certificationType: "navigator",
      certifiedAt: now.slice(0, 10),
      expiresAt: input.expiresAt ?? null,
      status: input.status ?? "active",
      continuingEducation: {},
      adminMemo: input.adminMemo ?? "",
      createdAt: now,
      updatedAt: now,
    };
    store.memberships.push(membership);
  } else {
    if (input.status) membership.status = input.status;
    if (input.expiresAt !== undefined) membership.expiresAt = input.expiresAt;
    if (input.adminMemo !== undefined) membership.adminMemo = input.adminMemo;
    membership.updatedAt = now;
  }

  store.adminLogs.unshift({
    id: `log-${Date.now()}`,
    actorId: input.actorId,
    targetUserId: input.userId,
    action: "membership_update",
    payload: {
      status: membership.status,
      expiresAt: membership.expiresAt,
    },
    createdAt: now,
  });

  saveStore(store);
}

export function listDemoAdminLogs(): AdminLogRecord[] {
  return loadStore().adminLogs;
}
