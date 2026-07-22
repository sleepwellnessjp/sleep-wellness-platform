import {
  CERTIFICATION_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  currentYearMonth,
} from "@/lib/platform/constants";
import {
  listDemoAdminLogs,
  listDemoInstructors,
} from "@/lib/platform/demo-platform-store";
import type {
  AdminAcademyOverview,
  AdminAnalyticsOverview,
  AdminClientRow,
  AdminDashboardStats,
  AdminInstructorRow,
  AdminLogBundle,
  PlatformSettingsRecord,
  SystemActivityLogRecord,
} from "./types";

const SETTINGS_KEY = "swij-admin-settings-v1";
const ACTIVITY_KEY = "swij-admin-activity-v1";

let memorySettings: PlatformSettingsRecord | null = null;
let memoryActivity: SystemActivityLogRecord[] | null = null;

function defaultSettings(): PlatformSettingsRecord {
  return {
    id: "default",
    brandPrimary: "#071426",
    brandAccent: "#8a6a2d",
    logoUrl: "/swij-logo-horizontal.png",
    termsOfService:
      "本サービスの利用にあたっては、Sleep Wellness Institute Japan の定める規約に同意したものとみなします。",
    privacyPolicy:
      "取得した個人情報は、睡眠ウェルネス支援の目的に限り適切に取り扱います。",
    contactEmail: "contact@sleepwellness.jp",
    contactPhone: "03-0000-0000",
    contactNote: "平日 10:00–17:00（土日祝を除く）",
    updatedAt: new Date().toISOString(),
  };
}

export function getDemoAdminDashboard(): AdminDashboardStats {
  const instructors = listDemoInstructors();
  return {
    instructorCount: instructors.length,
    clientCount: 24,
    totalAnalyses: 186,
    analysesThisMonth: 18,
    averageSleepScore: 72.4,
    newRegistrationsThisMonth: 5,
    retentionRate: 78,
  };
}

export function listDemoAdminInstructors(): AdminInstructorRow[] {
  return listDemoInstructors().map((item) => {
    const cert = item.membership?.certificationType ?? null;
    const status = item.membership?.status ?? null;
    return {
      id: item.profile.id,
      displayName: item.profile.displayName,
      email: item.profile.email,
      certificationType: cert,
      certificationLabel: cert ? CERTIFICATION_LABELS[cert] : "未登録",
      clientCount: 8,
      analysisCount: 32,
      lastLoginAt: new Date().toISOString(),
      status,
      statusLabel: status ? MEMBERSHIP_STATUS_LABELS[status] : "未登録",
      remainingCredits: item.remainingCredits,
      analysesThisMonth: item.analysesThisMonth,
      adminMemo: item.membership?.adminMemo ?? "",
      expiresAt: item.membership?.expiresAt ?? null,
      createdAt: item.profile.createdAt,
    };
  });
}

export function listDemoAdminClients(): AdminClientRow[] {
  return [
    {
      id: "demo-client-1",
      name: "山田 花子",
      instructorId: "demo-instructor",
      instructorName: "デモ インストラクター",
      sleepWellnessScore: 74,
      lastAnalysisAt: new Date().toISOString(),
      continuityDays: 120,
      status: "active",
      statusLabel: "継続中",
      registeredAt: "2026-01-10",
      analysisCount: 6,
    },
    {
      id: "demo-client-2",
      name: "佐藤 太郎",
      instructorId: "demo-instructor",
      instructorName: "デモ インストラクター",
      sleepWellnessScore: 61,
      lastAnalysisAt: "2026-05-01T00:00:00.000Z",
      continuityDays: 90,
      status: "inactive",
      statusLabel: "休眠",
      registeredAt: "2026-02-01",
      analysisCount: 3,
    },
    {
      id: "demo-client-3",
      name: "鈴木 美咲",
      instructorId: "demo-instructor",
      instructorName: "デモ インストラクター",
      sleepWellnessScore: null,
      lastAnalysisAt: null,
      continuityDays: 3,
      status: "new",
      statusLabel: "新規",
      registeredAt: new Date().toISOString().slice(0, 10),
      analysisCount: 0,
    },
  ];
}

export function getDemoAdminAcademy(): AdminAcademyOverview {
  const renewingSoon = [
    {
      id: "cred-1",
      userId: "demo-instructor",
      userName: "デモ インストラクター",
      userEmail: "instructor@swij.demo",
      qualificationId: "melatonin_yoga_instructor" as const,
      qualificationLabel: CERTIFICATION_LABELS.melatonin_yoga_instructor,
      certificateNumber: "SWIJ-2025-0001",
      acquiredAt: "2025-04-01",
      expiresAt: "2027-03-31",
      renewedAt: null,
      daysUntilExpiry: 250,
    },
  ];

  return {
    byQualification: [
      {
        qualificationId: "navigator",
        label: CERTIFICATION_LABELS.navigator,
        issuedCount: 12,
        renewingSoonCount: 2,
        expiredCount: 1,
      },
      {
        qualificationId: "melatonin_yoga_instructor",
        label: CERTIFICATION_LABELS.melatonin_yoga_instructor,
        issuedCount: 28,
        renewingSoonCount: 4,
        expiredCount: 0,
      },
      {
        qualificationId: "sleep_wellness_producer",
        label: CERTIFICATION_LABELS.sleep_wellness_producer,
        issuedCount: 5,
        renewingSoonCount: 1,
        expiredCount: 0,
      },
    ],
    totalIssued: 45,
    renewingSoon,
    expiryCalendar: renewingSoon,
  };
}

export function getDemoAdminAnalytics(): AdminAnalyticsOverview {
  const ym = currentYearMonth();
  const [y, m] = ym.split("-").map(Number);
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const d = new Date(Date.UTC(y, m - 12 + index, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const count = 8 + ((index * 3) % 11);
    return {
      yearMonth: key,
      label: `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}`,
      count,
      averageScore: 68 + (index % 5),
    };
  });

  return {
    monthly,
    averageScore: 71.2,
    improvementRate: 62,
    averageAnalysisMinutes: 4.8,
    totalAnalyses: monthly.reduce((sum, item) => sum + item.count, 0),
  };
}

function loadSettings(): PlatformSettingsRecord {
  if (memorySettings) return memorySettings;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        memorySettings = {
          ...defaultSettings(),
          ...(JSON.parse(raw) as PlatformSettingsRecord),
        };
        return memorySettings;
      }
    } catch {
      // fall through
    }
  }
  memorySettings = defaultSettings();
  return memorySettings;
}

export function getDemoPlatformSettings(): PlatformSettingsRecord {
  return loadSettings();
}

export function updateDemoPlatformSettings(
  patch: Partial<Omit<PlatformSettingsRecord, "id" | "updatedAt">>,
): PlatformSettingsRecord {
  const next = {
    ...loadSettings(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  memorySettings = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }
  return next;
}

function seedActivity(): SystemActivityLogRecord[] {
  const now = Date.now();
  return [
    {
      id: "act-1",
      actorId: "demo-instructor",
      actorName: "デモ インストラクター",
      category: "login",
      action: "sign_in",
      targetType: null,
      targetId: null,
      summary: "インストラクターがログインしました",
      payload: {},
      createdAt: new Date(now - 3_600_000).toISOString(),
    },
    {
      id: "act-2",
      actorId: "demo-instructor",
      actorName: "デモ インストラクター",
      category: "analysis",
      action: "analyze",
      targetType: "analysis",
      targetId: "analysis-1",
      summary: "睡眠分析を実行しました",
      payload: { clientName: "山田 花子" },
      createdAt: new Date(now - 7_200_000).toISOString(),
    },
    {
      id: "act-3",
      actorId: "demo-instructor",
      actorName: "デモ インストラクター",
      category: "pdf",
      action: "generate",
      targetType: "report",
      targetId: "report-1",
      summary: "PDFレポートを生成しました",
      payload: {},
      createdAt: new Date(now - 10_800_000).toISOString(),
    },
    {
      id: "act-4",
      actorId: "demo-instructor",
      actorName: "デモ インストラクター",
      category: "ai",
      action: "insight",
      targetType: "analysis",
      targetId: "analysis-1",
      summary: "AIインサイトを生成しました",
      payload: {},
      createdAt: new Date(now - 14_400_000).toISOString(),
    },
  ];
}

function loadActivity(): SystemActivityLogRecord[] {
  if (memoryActivity) return memoryActivity;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      if (raw) {
        memoryActivity = JSON.parse(raw) as SystemActivityLogRecord[];
        return memoryActivity;
      }
    } catch {
      // fall through
    }
  }
  memoryActivity = seedActivity();
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(memoryActivity));
  }
  return memoryActivity;
}

export function getDemoAdminLogs(category?: string): AdminLogBundle {
  const activityLogs = loadActivity().filter(
    (item) => !category || category === "all" || item.category === category,
  );
  return {
    activityLogs,
    adminLogs: listDemoAdminLogs(),
  };
}
