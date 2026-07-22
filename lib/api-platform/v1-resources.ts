/**
 * Version 4.0 REST resource payloads (demo + facade).
 * Thin adapters over existing modules where available.
 */

export type V1Client = {
  id: string;
  name: string;
  instructorId: string;
  sleepWellnessScore: number | null;
  lastAnalysisAt: string | null;
  status: string;
  createdAt: string;
};

export type V1Analysis = {
  id: string;
  clientId: string;
  sleepWellnessScore: number;
  analyzedAt: string;
  summary: string;
  metrics: Record<string, number | string | null>;
};

export type V1Journey = {
  clientId: string;
  stage: string;
  title: string;
  narrative: string;
  scoreTrend: Array<{ date: string; score: number }>;
  updatedAt: string;
};

export type V1Homework = {
  id: string;
  clientId: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  dueAt: string | null;
  completedAt: string | null;
};

export type V1SleepCoach = {
  clientId: string;
  focus: string;
  actions: string[];
  generatedAt: string;
};

export type V1AcademyItem = {
  id: string;
  title: string;
  type: "lesson" | "test" | "certificate";
  progress: number;
  status: string;
};

export type V1Event = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  registered: number;
};

export type V1Report = {
  id: string;
  clientId: string;
  title: string;
  format: "pdf" | "json";
  createdAt: string;
  downloadUrl: string;
};

const clients: V1Client[] = [
  {
    id: "cli_yamada",
    name: "山田 花子",
    instructorId: "ins_demo",
    sleepWellnessScore: 74,
    lastAnalysisAt: "2026-07-18T10:00:00.000Z",
    status: "active",
    createdAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "cli_sato",
    name: "佐藤 太郎",
    instructorId: "ins_demo",
    sleepWellnessScore: 61,
    lastAnalysisAt: "2026-05-01T00:00:00.000Z",
    status: "active",
    createdAt: "2026-02-01T00:00:00.000Z",
  },
];

const analyses: V1Analysis[] = [
  {
    id: "an_001",
    clientId: "cli_yamada",
    sleepWellnessScore: 74,
    analyzedAt: "2026-07-18T10:00:00.000Z",
    summary: "入眠潜時は改善傾向。夜間覚醒は週2回程度。",
    metrics: {
      sleepEfficiency: 86,
      deepSleepMinutes: 92,
      remMinutes: 108,
      awakenings: 2,
    },
  },
  {
    id: "an_002",
    clientId: "cli_sato",
    sleepWellnessScore: 61,
    analyzedAt: "2026-05-01T00:00:00.000Z",
    summary: "就寝時刻のばらつきが大きく、睡眠圧の蓄積が不安定。",
    metrics: {
      sleepEfficiency: 72,
      deepSleepMinutes: 64,
      remMinutes: 88,
      awakenings: 4,
    },
  },
];

export const v1Resources = {
  listClients(): V1Client[] {
    return clients;
  },
  getClient(id: string): V1Client | null {
    return clients.find((c) => c.id === id) ?? null;
  },
  listAnalyses(clientId?: string): V1Analysis[] {
    return clientId
      ? analyses.filter((a) => a.clientId === clientId)
      : analyses;
  },
  getAnalysis(id: string): V1Analysis | null {
    return analyses.find((a) => a.id === id) ?? null;
  },
  getJourney(clientId: string): V1Journey | null {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return null;
    return {
      clientId,
      stage: "Stabilizing",
      title: "Sleep Wellness Journey™",
      narrative:
        "入眠ルーティンの定着が進み、週次スコアが緩やかに上昇しています。",
      scoreTrend: [
        { date: "2026-05-01", score: 61 },
        { date: "2026-06-01", score: 68 },
        { date: "2026-07-01", score: client.sleepWellnessScore ?? 70 },
      ],
      updatedAt: "2026-07-18T10:00:00.000Z",
    };
  },
  listHomework(clientId?: string): V1Homework[] {
    const items: V1Homework[] = [
      {
        id: "hw_001",
        clientId: "cli_yamada",
        title: "就寝90分前のブルーライト制限",
        status: "completed",
        dueAt: "2026-07-20T00:00:00.000Z",
        completedAt: "2026-07-19T21:00:00.000Z",
      },
      {
        id: "hw_002",
        clientId: "cli_yamada",
        title: "メラトニンヨガ™ 夜の短編",
        status: "in_progress",
        dueAt: "2026-07-25T00:00:00.000Z",
        completedAt: null,
      },
      {
        id: "hw_003",
        clientId: "cli_sato",
        title: "起床時刻の固定（±30分）",
        status: "pending",
        dueAt: "2026-07-28T00:00:00.000Z",
        completedAt: null,
      },
    ];
    return clientId ? items.filter((h) => h.clientId === clientId) : items;
  },
  getSleepCoach(clientId: string): V1SleepCoach | null {
    if (!clients.some((c) => c.id === clientId)) return null;
    return {
      clientId,
      focus: "入眠前の自律神経を整える",
      actions: [
        "21:30 以降は画面輝度を下げる",
        "就寝前に 5 分の腹式呼吸",
        "室温 18–22℃ を維持する",
      ],
      generatedAt: new Date().toISOString(),
    };
  },
  listAcademy(): V1AcademyItem[] {
    return [
      {
        id: "ac_lesson_01",
        title: "睡眠生理学 Fundamentals",
        type: "lesson",
        progress: 100,
        status: "completed",
      },
      {
        id: "ac_test_01",
        title: "認定試験 Level 1",
        type: "test",
        progress: 0,
        status: "available",
      },
      {
        id: "ac_cert_01",
        title: "Sleep Wellness Instructor",
        type: "certificate",
        progress: 100,
        status: "issued",
      },
    ];
  },
  listEvents(): V1Event[] {
    return [
      {
        id: "ev_001",
        title: "Sleep Wellness Summit 2026",
        startsAt: "2026-09-12T01:00:00.000Z",
        endsAt: "2026-09-12T09:00:00.000Z",
        location: "Tokyo",
        capacity: 200,
        registered: 148,
      },
      {
        id: "ev_002",
        title: "Instructor Meetup — Summer",
        startsAt: "2026-08-08T10:00:00.000Z",
        endsAt: "2026-08-08T12:00:00.000Z",
        location: "Online",
        capacity: 80,
        registered: 52,
      },
    ];
  },
  listReports(clientId?: string): V1Report[] {
    const items: V1Report[] = [
      {
        id: "rp_001",
        clientId: "cli_yamada",
        title: "睡眠ウェルネス分析レポート",
        format: "pdf",
        createdAt: "2026-07-18T11:00:00.000Z",
        downloadUrl: "/api/v1/reports/rp_001",
      },
      {
        id: "rp_002",
        clientId: "cli_sato",
        title: "月次進捗サマリー",
        format: "json",
        createdAt: "2026-05-02T09:00:00.000Z",
        downloadUrl: "/api/v1/reports/rp_002",
      },
    ];
    return clientId ? items.filter((r) => r.clientId === clientId) : items;
  },
  getReport(id: string): V1Report | null {
    return this.listReports().find((r) => r.id === id) ?? null;
  },
};
