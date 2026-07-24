/**
 * Version 2.1 運営システム — デモストア
 * Supabase 未設定時の UI / 管理画面検証用。
 */

import {
  daysUntil,
  INSTRUCTOR_OPS_STATUS_LABELS,
} from "@/lib/ops/constants";
import type {
  CertificationLevelRecord,
  CertifiedInstructorRecord,
  CertifiedSchoolRecord,
  HqOpsDashboard,
  InstructorOpsAction,
  InstructorOpsDashboard,
  InstructorOpsStatus,
  OpsEventRecord,
  OpsNotificationRecord,
  PublishOpsNotificationInput,
  SchoolCourseRecord,
  SchoolDetailBundle,
  SchoolStudentRecord,
  UpdateInstructorOpsInput,
  UpdateLevelInput,
  UpsertSchoolInput,
} from "@/lib/ops/types";

const now = () => new Date();
const isoDaysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const isoHoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 3_600_000).toISOString();

let levels: CertificationLevelRecord[] = [
  {
    id: "foundation",
    label: "Foundation",
    labelEn: "Foundation",
    sortOrder: 10,
    description: "睡眠ウェルネス基礎認定",
    renewalMonths: 12,
    ceHoursRequired: 4,
    isActive: true,
    instructorCount: 2,
  },
  {
    id: "practitioner",
    label: "Practitioner",
    labelEn: "Practitioner",
    sortOrder: 20,
    description: "実践者認定",
    renewalMonths: 12,
    ceHoursRequired: 8,
    isActive: true,
    instructorCount: 3,
  },
  {
    id: "instructor",
    label: "Instructor",
    labelEn: "Instructor",
    sortOrder: 30,
    description: "認定講師",
    renewalMonths: 12,
    ceHoursRequired: 12,
    isActive: true,
    instructorCount: 8,
  },
  {
    id: "navigator",
    label: "Navigator",
    labelEn: "Navigator",
    sortOrder: 40,
    description: "スリープウェルネス・ナビゲーター",
    renewalMonths: 12,
    ceHoursRequired: 16,
    isActive: true,
    instructorCount: 4,
  },
  {
    id: "producer",
    label: "Producer",
    labelEn: "Producer",
    sortOrder: 50,
    description: "スリープウェルネス・プロデューサー",
    renewalMonths: 24,
    ceHoursRequired: 20,
    isActive: true,
    instructorCount: 1,
  },
];

let schools: CertifiedSchoolRecord[] = [
  {
    id: "school-tokyo",
    code: "SWIJ-TKY-001",
    name: "SWIJ 東京認定校",
    nameKana: "すいーじぇいとうきょうにんていこう",
    region: "関東",
    prefecture: "東京都",
    address: "東京都港区赤坂1-1-1",
    representativeName: "高橋 美咲",
    contactEmail: "tokyo@swij.example",
    contactPhone: "03-0000-0001",
    status: "active",
    certifiedAt: "2022-04-01",
    adminMemo: "首都圏ハブ校",
    instructorCount: 6,
    studentCount: 48,
    courseCount: 5,
    completionRate: 0.82,
    activityLabel: "活発",
    createdAt: "2022-04-01T00:00:00.000Z",
    updatedAt: isoHoursAgo(12),
  },
  {
    id: "school-osaka",
    code: "SWIJ-OSK-001",
    name: "SWIJ 大阪認定校",
    nameKana: "すいーじぇいおおさかにんていこう",
    region: "関西",
    prefecture: "大阪府",
    address: "大阪府大阪市北区梅田2-2-2",
    representativeName: "中村 健",
    contactEmail: "osaka@swij.example",
    contactPhone: "06-0000-0002",
    status: "active",
    certifiedAt: "2023-02-15",
    adminMemo: "",
    instructorCount: 4,
    studentCount: 31,
    courseCount: 3,
    completionRate: 0.76,
    activityLabel: "安定",
    createdAt: "2023-02-15T00:00:00.000Z",
    updatedAt: isoHoursAgo(30),
  },
  {
    id: "school-fukuoka",
    code: "SWIJ-FUK-001",
    name: "SWIJ 福岡認定校",
    nameKana: "すいーじぇいふくおかにんていこう",
    region: "九州",
    prefecture: "福岡県",
    address: "福岡市中央区天神3-3-3",
    representativeName: "松本 彩",
    contactEmail: "fukuoka@swij.example",
    contactPhone: "092-000-0003",
    status: "active",
    certifiedAt: "2024-06-01",
    adminMemo: "九州エリア拡大中",
    instructorCount: 3,
    studentCount: 22,
    courseCount: 2,
    completionRate: 0.71,
    activityLabel: "成長中",
    createdAt: "2024-06-01T00:00:00.000Z",
    updatedAt: isoHoursAgo(48),
  },
  {
    id: "school-nagoya",
    code: "SWIJ-NGY-001",
    name: "SWIJ 名古屋認定校",
    nameKana: "すいーじぇいなごやにんていこう",
    region: "中部",
    prefecture: "愛知県",
    address: "名古屋市中区栄4-4-4",
    representativeName: "伊藤 翔",
    contactEmail: "nagoya@swij.example",
    contactPhone: "052-000-0004",
    status: "suspended",
    certifiedAt: "2023-09-01",
    adminMemo: "運営体制見直し中",
    instructorCount: 1,
    studentCount: 8,
    courseCount: 1,
    completionRate: 0.55,
    activityLabel: "低迷",
    createdAt: "2023-09-01T00:00:00.000Z",
    updatedAt: isoHoursAgo(72),
  },
];

let instructors: CertifiedInstructorRecord[] = [
  {
    id: "ci-1",
    userId: "user-yamada",
    schoolId: "school-tokyo",
    schoolName: "SWIJ 東京認定校",
    levelId: "instructor",
    levelLabel: "Instructor",
    instructorNumber: "SWIJ-INS-2024-0012",
    displayName: "山田 花子",
    email: "yamada@example.com",
    status: "active",
    certifiedAt: "2024-03-01",
    renewsAt: isoDaysFromNow(45),
    usageStartDate: isoDaysFromNow(-30),
    suspendedAt: null,
    withdrawnAt: null,
    lastRenewedAt: "2025-03-01",
    daysUntilRenewal: 45,
    statusHistory: [
      {
        at: "2024-03-01T00:00:00.000Z",
        action: "registered",
        fromStatus: null,
        toStatus: "active",
        note: "初回認定",
        actorEmail: "admin@swij.example",
      },
    ],
    adminMemo: "",
    clientCountThisMonth: 18,
    analysisCountThisMonth: 24,
    createdAt: "2024-03-01T00:00:00.000Z",
    updatedAt: isoHoursAgo(6),
  },
  {
    id: "ci-2",
    userId: "user-sato",
    schoolId: "school-tokyo",
    schoolName: "SWIJ 東京認定校",
    levelId: "navigator",
    levelLabel: "Navigator",
    instructorNumber: "SWIJ-NAV-2023-0004",
    displayName: "佐藤 一郎",
    email: "sato@example.com",
    status: "renewal_pending",
    certifiedAt: "2023-01-15",
    renewsAt: isoDaysFromNow(12),
    usageStartDate: isoDaysFromNow(-30),
    suspendedAt: null,
    withdrawnAt: null,
    lastRenewedAt: "2025-01-15",
    daysUntilRenewal: 12,
    statusHistory: [],
    adminMemo: "CE 単位確認中",
    clientCountThisMonth: 11,
    analysisCountThisMonth: 9,
    createdAt: "2023-01-15T00:00:00.000Z",
    updatedAt: isoHoursAgo(20),
  },
  {
    id: "ci-3",
    userId: "user-suzuki",
    schoolId: "school-osaka",
    schoolName: "SWIJ 大阪認定校",
    levelId: "instructor",
    levelLabel: "Instructor",
    instructorNumber: "SWIJ-INS-2022-0008",
    displayName: "鈴木 美咲",
    email: "suzuki@example.com",
    status: "suspended",
    certifiedAt: "2022-08-01",
    renewsAt: isoDaysFromNow(-20),
    usageStartDate: isoDaysFromNow(-30),
    suspendedAt: isoHoursAgo(240),
    withdrawnAt: null,
    lastRenewedAt: "2024-08-01",
    daysUntilRenewal: -20,
    statusHistory: [
      {
        at: isoHoursAgo(240),
        action: "suspend",
        fromStatus: "active",
        toStatus: "suspended",
        note: "更新手続き未完了",
        actorEmail: "admin@swij.example",
      },
    ],
    adminMemo: "再開条件: CE 完了",
    clientCountThisMonth: 0,
    analysisCountThisMonth: 0,
    createdAt: "2022-08-01T00:00:00.000Z",
    updatedAt: isoHoursAgo(240),
  },
  {
    id: "ci-4",
    userId: "user-tanaka",
    schoolId: "school-fukuoka",
    schoolName: "SWIJ 福岡認定校",
    levelId: "practitioner",
    levelLabel: "Practitioner",
    instructorNumber: "SWIJ-PRA-2025-0003",
    displayName: "田中 あかり",
    email: "tanaka@example.com",
    status: "active",
    certifiedAt: "2025-01-10",
    renewsAt: isoDaysFromNow(170),
    usageStartDate: isoDaysFromNow(-30),
    suspendedAt: null,
    withdrawnAt: null,
    lastRenewedAt: null,
    daysUntilRenewal: 170,
    statusHistory: [],
    adminMemo: "",
    clientCountThisMonth: 7,
    analysisCountThisMonth: 12,
    createdAt: "2025-01-10T00:00:00.000Z",
    updatedAt: isoHoursAgo(8),
  },
  {
    id: "ci-5",
    userId: "user-ito",
    schoolId: null,
    schoolName: null,
    levelId: "producer",
    levelLabel: "Producer",
    instructorNumber: "SWIJ-PRD-2021-0001",
    displayName: "伊藤 翔",
    email: "ito@example.com",
    status: "withdrawn",
    certifiedAt: "2021-05-01",
    renewsAt: "2025-05-01",
    usageStartDate: isoDaysFromNow(-30),
    suspendedAt: null,
    withdrawnAt: isoHoursAgo(900),
    lastRenewedAt: "2024-05-01",
    daysUntilRenewal: null,
    statusHistory: [
      {
        at: isoHoursAgo(900),
        action: "withdraw",
        fromStatus: "active",
        toStatus: "withdrawn",
        note: "本人申し出",
        actorEmail: "admin@swij.example",
      },
    ],
    adminMemo: "名誉講師候補",
    clientCountThisMonth: 0,
    analysisCountThisMonth: 0,
    createdAt: "2021-05-01T00:00:00.000Z",
    updatedAt: isoHoursAgo(900),
  },
];

const courses: SchoolCourseRecord[] = [
  {
    id: "course-1",
    schoolId: "school-tokyo",
    title: "Instructor 認定講座 2026 夏",
    courseType: "certification",
    levelId: "instructor",
    startsOn: "2026-07-01",
    endsOn: "2026-09-30",
    capacity: 20,
    enrolledCount: 16,
    completedCount: 0,
    status: "in_progress",
    instructorId: "ci-1",
    instructorName: "山田 花子",
  },
  {
    id: "course-2",
    schoolId: "school-tokyo",
    title: "メラトニンヨガ™ CE ワークショップ",
    courseType: "ce",
    levelId: null,
    startsOn: "2026-06-15",
    endsOn: "2026-06-15",
    capacity: 30,
    enrolledCount: 28,
    completedCount: 28,
    status: "completed",
    instructorId: "ci-2",
    instructorName: "佐藤 一郎",
  },
  {
    id: "course-3",
    schoolId: "school-osaka",
    title: "Foundation 認定講座",
    courseType: "certification",
    levelId: "foundation",
    startsOn: "2026-08-01",
    endsOn: "2026-10-31",
    capacity: 24,
    enrolledCount: 12,
    completedCount: 0,
    status: "scheduled",
    instructorId: "ci-3",
    instructorName: "鈴木 美咲",
  },
  {
    id: "course-4",
    schoolId: "school-fukuoka",
    title: "公開睡眠ウェルネス入門",
    courseType: "open",
    levelId: null,
    startsOn: "2026-07-20",
    endsOn: "2026-07-20",
    capacity: 40,
    enrolledCount: 22,
    completedCount: 0,
    status: "scheduled",
    instructorId: "ci-4",
    instructorName: "田中 あかり",
  },
];

const students: SchoolStudentRecord[] = [
  {
    id: "stu-1",
    schoolId: "school-tokyo",
    courseId: "course-1",
    courseTitle: "Instructor 認定講座 2026 夏",
    displayName: "渡辺 理恵",
    email: "watanabe@example.com",
    status: "enrolled",
    enrolledAt: "2026-06-20",
    completedAt: null,
  },
  {
    id: "stu-2",
    schoolId: "school-tokyo",
    courseId: "course-2",
    courseTitle: "メラトニンヨガ™ CE ワークショップ",
    displayName: "小林 大輔",
    email: "kobayashi@example.com",
    status: "completed",
    enrolledAt: "2026-06-01",
    completedAt: "2026-06-15",
  },
  {
    id: "stu-3",
    schoolId: "school-osaka",
    courseId: "course-3",
    courseTitle: "Foundation 認定講座",
    displayName: "加藤 優子",
    email: "kato@example.com",
    status: "enrolled",
    enrolledAt: "2026-07-10",
    completedAt: null,
  },
  {
    id: "stu-4",
    schoolId: "school-fukuoka",
    courseId: "course-4",
    courseTitle: "公開睡眠ウェルネス入門",
    displayName: "吉田 誠",
    email: "yoshida@example.com",
    status: "enrolled",
    enrolledAt: "2026-07-12",
    completedAt: null,
  },
];

let notifications: OpsNotificationRecord[] = [
  {
    id: "ops-n-1",
    kind: "hq_announcement",
    audience: "all_instructors",
    title: "Version 2.1 運営システムを公開しました",
    body: "認定校・認定講師・更新管理・通知センターが利用可能です。",
    href: "/admin/certification",
    publishedAt: isoHoursAgo(4),
    expiresAt: null,
    isPinned: true,
    createdBy: null,
    readAt: null,
  },
  {
    id: "ops-n-2",
    kind: "certification_renewal",
    audience: "all_instructors",
    title: "認定更新期限が近づいています",
    body: "更新期限が30日以内の認定講師は、CE単位と更新手続きを確認してください。",
    href: "/license",
    publishedAt: isoHoursAgo(18),
    expiresAt: null,
    isPinned: false,
    createdBy: null,
    readAt: null,
  },
  {
    id: "ops-n-3",
    kind: "event",
    audience: "all",
    title: "全国認定講師ミーティング（オンライン）",
    body: "8月開催の全国ミーティングの参加登録を開始しました。",
    href: "/community",
    publishedAt: isoHoursAgo(36),
    expiresAt: null,
    isPinned: false,
    createdBy: null,
    readAt: isoHoursAgo(20),
  },
  {
    id: "ops-n-4",
    kind: "material_update",
    audience: "all_instructors",
    title: "教材ライブラリを更新しました",
    body: "Knowledge Base に新しい認定テキストとケーススタディを追加しました。",
    href: "/knowledge",
    publishedAt: isoHoursAgo(50),
    expiresAt: null,
    isPinned: false,
    createdBy: null,
    readAt: null,
  },
  {
    id: "ops-n-5",
    kind: "ai_notice",
    audience: "all_instructors",
    title: "AI Intelligence からの推奨",
    body: "今週はストレス指標の改善が全国平均を下回っています。フォローアップを強化しましょう。",
    href: "/admin/ai",
    publishedAt: isoHoursAgo(8),
    expiresAt: null,
    isPinned: false,
    createdBy: null,
    readAt: null,
  },
];

const events: OpsEventRecord[] = [
  {
    id: "ev-1",
    title: "全国認定講師ミーティング",
    eventType: "webinar",
    region: "全国",
    startsAt: "2026-08-15T13:00:00.000Z",
    endsAt: "2026-08-15T15:00:00.000Z",
    capacity: 200,
    registeredCount: 86,
    status: "open",
    schoolId: null,
  },
  {
    id: "ev-2",
    title: "東京認定校オープンデー",
    eventType: "open" as never,
    region: "関東",
    startsAt: "2026-07-28T10:00:00.000Z",
    endsAt: "2026-07-28T16:00:00.000Z",
    capacity: 40,
    registeredCount: 28,
    status: "scheduled",
    schoolId: "school-tokyo",
  },
  {
    id: "ev-3",
    title: "Producer 認定式",
    eventType: "ceremony",
    region: "関東",
    startsAt: "2026-09-01T14:00:00.000Z",
    endsAt: "2026-09-01T17:00:00.000Z",
    capacity: 60,
    registeredCount: 12,
    status: "scheduled",
    schoolId: "school-tokyo",
  },
];

// Fix event type - "open" is not valid OpsEventType. Use seminar.
events[1] = {
  ...events[1],
  eventType: "seminar",
};

function refreshSchoolAggregates() {
  schools = schools.map((school) => {
    const schoolInstructors = instructors.filter((i) => i.schoolId === school.id);
    const schoolStudents = students.filter((s) => s.schoolId === school.id);
    const schoolCourses = courses.filter((c) => c.schoolId === school.id);
    const completed = schoolStudents.filter((s) => s.status === "completed").length;
    const completionRate =
      schoolStudents.length === 0 ? null : completed / schoolStudents.length;
    const activeInstructors = schoolInstructors.filter((i) => i.status === "active").length;
    let activityLabel = "安定";
    if (school.status === "suspended") activityLabel = "停止中";
    else if (activeInstructors >= 4 && (completionRate ?? 0) >= 0.75) activityLabel = "活発";
    else if (activeInstructors <= 1 || (completionRate ?? 1) < 0.6) activityLabel = "低迷";
    else if (schoolInstructors.length <= 3) activityLabel = "成長中";

    return {
      ...school,
      instructorCount: schoolInstructors.length,
      studentCount: schoolStudents.length,
      courseCount: schoolCourses.length,
      completionRate,
      activityLabel,
      updatedAt: school.updatedAt,
    };
  });
}

function refreshLevelCounts() {
  levels = levels.map((level) => ({
    ...level,
    instructorCount: instructors.filter(
      (i) => i.levelId === level.id && i.status !== "withdrawn",
    ).length,
  }));
}

function syncInstructorDerived(row: CertifiedInstructorRecord): CertifiedInstructorRecord {
  return {
    ...row,
    daysUntilRenewal:
      row.status === "withdrawn" ? null : daysUntil(row.renewsAt, now()),
    schoolName: schools.find((s) => s.id === row.schoolId)?.name ?? null,
    levelLabel: levels.find((l) => l.id === row.levelId)?.label ?? row.levelId,
  };
}

refreshSchoolAggregates();
refreshLevelCounts();
instructors = instructors.map(syncInstructorDerived);

export function listDemoCertificationLevels(): CertificationLevelRecord[] {
  refreshLevelCounts();
  return [...levels].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function updateDemoCertificationLevel(
  input: UpdateLevelInput,
): CertificationLevelRecord {
  const idx = levels.findIndex((l) => l.id === input.id);
  if (idx < 0) throw new Error("認定レベルが見つかりません");
  const next = {
    ...levels[idx],
    label: input.label ?? levels[idx].label,
    description: input.description ?? levels[idx].description,
    renewalMonths: input.renewalMonths ?? levels[idx].renewalMonths,
    ceHoursRequired: input.ceHoursRequired ?? levels[idx].ceHoursRequired,
    isActive: input.isActive ?? levels[idx].isActive,
  };
  levels[idx] = next;
  refreshLevelCounts();
  return listDemoCertificationLevels().find((l) => l.id === input.id)!;
}

export function listDemoSchools(q = ""): CertifiedSchoolRecord[] {
  refreshSchoolAggregates();
  const needle = q.trim().toLowerCase();
  return schools
    .filter((s) => {
      if (!needle) return true;
      return [s.name, s.code, s.region, s.prefecture, s.representativeName]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export function getDemoSchoolDetail(id: string): SchoolDetailBundle | null {
  refreshSchoolAggregates();
  const school = schools.find((s) => s.id === id);
  if (!school) return null;
  const schoolInstructors = instructors
    .filter((i) => i.schoolId === id)
    .map(syncInstructorDerived);
  const schoolStudents = students.filter((s) => s.schoolId === id);
  const schoolCourses = courses.filter((c) => c.schoolId === id);
  const completed = schoolStudents.filter((s) => s.status === "completed").length;
  const completionRate =
    schoolStudents.length === 0 ? null : completed / schoolStudents.length;
  const activeInstructors = schoolInstructors.filter((i) => i.status === "active").length;
  const openCourses = schoolCourses.filter(
    (c) => c.status === "scheduled" || c.status === "in_progress",
  ).length;

  return {
    school,
    instructors: schoolInstructors,
    students: schoolStudents,
    courses: schoolCourses,
    completionRate,
    activity: {
      label: school.activityLabel,
      activeInstructors,
      openCourses,
      recentCompletions: completed,
    },
  };
}

export function upsertDemoSchool(input: UpsertSchoolInput): CertifiedSchoolRecord {
  if (input.id) {
    const idx = schools.findIndex((s) => s.id === input.id);
    if (idx < 0) throw new Error("認定校が見つかりません");
    schools[idx] = {
      ...schools[idx],
      code: input.code,
      name: input.name,
      nameKana: input.nameKana ?? schools[idx].nameKana,
      region: input.region ?? schools[idx].region,
      prefecture: input.prefecture ?? schools[idx].prefecture,
      address: input.address ?? schools[idx].address,
      representativeName:
        input.representativeName ?? schools[idx].representativeName,
      contactEmail: input.contactEmail ?? schools[idx].contactEmail,
      contactPhone: input.contactPhone ?? schools[idx].contactPhone,
      status: input.status ?? schools[idx].status,
      certifiedAt: input.certifiedAt ?? schools[idx].certifiedAt,
      adminMemo: input.adminMemo ?? schools[idx].adminMemo,
      updatedAt: now().toISOString(),
    };
    refreshSchoolAggregates();
    return listDemoSchools().find((s) => s.id === input.id)!;
  }

  const id = `school-${Date.now()}`;
  const created: CertifiedSchoolRecord = {
    id,
    code: input.code,
    name: input.name,
    nameKana: input.nameKana ?? "",
    region: input.region ?? "",
    prefecture: input.prefecture ?? "",
    address: input.address ?? "",
    representativeName: input.representativeName ?? "",
    contactEmail: input.contactEmail ?? "",
    contactPhone: input.contactPhone ?? "",
    status: input.status ?? "active",
    certifiedAt: input.certifiedAt ?? isoDaysFromNow(0),
    adminMemo: input.adminMemo ?? "",
    instructorCount: 0,
    studentCount: 0,
    courseCount: 0,
    completionRate: null,
    activityLabel: "成長中",
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
  };
  schools.push(created);
  refreshSchoolAggregates();
  return created;
}

export function listDemoCertifiedInstructors(filters?: {
  q?: string;
  status?: string;
  levelId?: string;
  schoolId?: string;
}): CertifiedInstructorRecord[] {
  const q = (filters?.q ?? "").trim().toLowerCase();
  const status = filters?.status ?? "all";
  const levelId = filters?.levelId ?? "all";
  const schoolId = filters?.schoolId ?? "all";

  return instructors
    .map(syncInstructorDerived)
    .filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (levelId !== "all" && row.levelId !== levelId) return false;
      if (schoolId !== "all" && row.schoolId !== schoolId) return false;
      if (!q) return true;
      return [row.displayName, row.email, row.instructorNumber, row.schoolName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ja"));
}

function nextStatusForAction(
  action: InstructorOpsAction,
  current: InstructorOpsStatus,
): InstructorOpsStatus {
  switch (action) {
    case "renew":
      return "active";
    case "suspend":
      return "suspended";
    case "withdraw":
      return "withdrawn";
    case "reactivate":
      return "active";
    case "change_level":
    case "assign_school":
      return current === "withdrawn" ? current : current;
    default:
      return current;
  }
}

export function updateDemoInstructorOps(
  input: UpdateInstructorOpsInput,
  actorEmail = "admin@swij.example",
): CertifiedInstructorRecord {
  const idx = instructors.findIndex((i) => i.id === input.id);
  if (idx < 0) throw new Error("認定講師が見つかりません");
  const current = instructors[idx];
  const toStatus = nextStatusForAction(input.action, current.status);
  const stamp = now().toISOString();

  let renewsAt = current.renewsAt;
  let lastRenewedAt = current.lastRenewedAt;
  let suspendedAt = current.suspendedAt;
  let withdrawnAt = current.withdrawnAt;

  if (input.action === "renew") {
    const months =
      levels.find((l) => l.id === (input.levelId ?? current.levelId))
        ?.renewalMonths ?? 12;
    const base = new Date();
    base.setMonth(base.getMonth() + months);
    renewsAt = base.toISOString().slice(0, 10);
    lastRenewedAt = isoDaysFromNow(0);
  }
  if (input.renewsAt) renewsAt = input.renewsAt.slice(0, 10);
  if (input.action === "suspend") suspendedAt = stamp;
  if (input.action === "withdraw") withdrawnAt = stamp;
  if (input.action === "reactivate") {
    suspendedAt = null;
    withdrawnAt = null;
  }

  let usageStartDate = current.usageStartDate;
  if (input.usageStartDate !== undefined) {
    usageStartDate =
      input.usageStartDate === null || input.usageStartDate === ""
        ? null
        : input.usageStartDate.slice(0, 10);
  }

  const historyEntry = {
    at: stamp,
    action: input.action,
    fromStatus: current.status,
    toStatus,
    note: input.note ?? "",
    actorEmail,
  };

  instructors[idx] = syncInstructorDerived({
    ...current,
    status: toStatus,
    levelId: input.levelId ?? current.levelId,
    schoolId:
      input.action === "assign_school"
        ? (input.schoolId ?? null)
        : (input.schoolId !== undefined ? input.schoolId : current.schoolId),
    renewsAt,
    usageStartDate,
    lastRenewedAt,
    suspendedAt,
    withdrawnAt,
    adminMemo: input.adminMemo ?? current.adminMemo,
    statusHistory: [...current.statusHistory, historyEntry],
    updatedAt: stamp,
  });

  refreshSchoolAggregates();
  refreshLevelCounts();
  return instructors[idx];
}

export function getDemoHqOpsDashboard(): HqOpsDashboard {
  refreshSchoolAggregates();
  const activeInstructors = instructors.filter((i) => i.status === "active");
  const eligible = instructors.filter((i) => i.status !== "withdrawn");
  const renewingSoon = eligible.filter((i) => {
    const d = daysUntil(i.renewsAt);
    return d != null && d <= 30 && d >= 0;
  }).length;

  return {
    instructorCount: eligible.length,
    schoolCount: schools.filter((s) => s.status !== "closed").length,
    analysisCount: 1284,
    averageImprovementRate: 0.184,
    activeRate: eligible.length === 0 ? null : activeInstructors.length / eligible.length,
    eventCount: events.filter((e) => e.status === "open" || e.status === "scheduled").length,
    renewingSoonCount: renewingSoon,
    suspendedCount: instructors.filter((i) => i.status === "suspended").length,
    generatedAt: now().toISOString(),
  };
}

export function getDemoInstructorOpsDashboard(): InstructorOpsDashboard {
  const me = instructors.find((i) => i.status === "active") ?? instructors[0];
  return {
    clientsThisMonth: me?.clientCountThisMonth ?? 12,
    analysesThisMonth: me?.analysisCountThisMonth ?? 16,
    improvementRate: 0.21,
    retentionRate: 0.86,
    licenseStatus: me?.status ?? "unknown",
    licenseStatusLabel: me
      ? INSTRUCTOR_OPS_STATUS_LABELS[me.status]
      : "未登録",
    renewsAt: me?.renewsAt ?? null,
    daysUntilRenewal: me ? daysUntil(me.renewsAt) : null,
    levelLabel: me?.levelLabel ?? null,
    schoolName: me?.schoolName ?? null,
    instructorNumber: me?.instructorNumber ?? null,
    generatedAt: now().toISOString(),
  };
}

export function listDemoOpsNotifications(kind?: string): OpsNotificationRecord[] {
  const filter = kind && kind !== "all" ? kind : null;
  return [...notifications]
    .filter((n) => (filter ? n.kind === filter : true))
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
}

export function publishDemoOpsNotification(
  input: PublishOpsNotificationInput,
): OpsNotificationRecord {
  const row: OpsNotificationRecord = {
    id: `ops-n-${Date.now()}`,
    kind: input.kind,
    audience: input.audience ?? "all_instructors",
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    publishedAt: now().toISOString(),
    expiresAt: input.expiresAt ?? null,
    isPinned: input.isPinned ?? false,
    createdBy: null,
    readAt: null,
  };
  notifications = [row, ...notifications];
  return row;
}

export function markDemoOpsNotificationRead(id: string): OpsNotificationRecord | null {
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  notifications[idx] = {
    ...notifications[idx],
    readAt: notifications[idx].readAt ?? now().toISOString(),
  };
  return notifications[idx];
}

export function listDemoOpsEvents(): OpsEventRecord[] {
  return [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
