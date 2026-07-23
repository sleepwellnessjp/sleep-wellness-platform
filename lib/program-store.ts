import {
  loadClients,
  type StoredClient,
} from "@/lib/client-store";
import { formatDisplayDate } from "@/lib/client-store";

const STORAGE_KEY = "swij-programs-v1";
const SEED_FLAG_KEY = "swij-programs-seeded-v1";

export type ProgramStatus =
  | "active"
  | "follow_up"
  | "completed"
  | "not_created";

export type ProgramGoal = {
  id: string;
  goalName: string;
  currentValue: string;
  targetValue: string;
  deadline: string;
};

export type ProgramMenuItem = {
  id: string;
  label: string;
  checked: boolean;
  isCustom?: boolean;
};

export type StoredProgram = {
  clientId: string;
  startDate: string | null;
  currentPhase: string;
  nextFollowUpDate: string | null;
  progressLabel: string;
  status: Exclude<ProgramStatus, "not_created">;
  goals: ProgramGoal[];
  menuItems: ProgramMenuItem[];
  instructorMemo: string;
  updatedAt: string;
};

export type ProgramDetailView = {
  clientId: string;
  clientName: string;
  latestSleepScore: number | null;
  latestAnalysisDate: string | null;
  startDate: string | null;
  currentPhase: string;
  nextFollowUpDate: string | null;
  progressLabel: string;
  status: ProgramStatus;
  goals: ProgramGoal[];
  menuItems: ProgramMenuItem[];
  instructorMemo: string;
  updatedAt: string | null;
};

export type SaveProgramDetailInput = {
  clientId: string;
  goals: ProgramGoal[];
  menuItems: ProgramMenuItem[];
  instructorMemo: string;
};

export const DEFAULT_PROGRAM_MENU_LABELS = [
  "メラトニンヨガ™",
  "朝日を浴びる",
  "入浴",
  "呼吸法",
  "瞑想",
  "ストレッチ",
  "カフェイン制限",
  "アルコール制限",
  "スマホ制限",
] as const;

export type ProgramListItem = {
  clientId: string;
  name: string;
  latestSleepScore: number | null;
  startDate: string | null;
  currentPhase: string;
  nextFollowUpDate: string | null;
  progressLabel: string;
  status: ProgramStatus;
};

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  active: "実施中",
  follow_up: "要フォロー",
  completed: "完了",
  not_created: "未作成",
};

export const PROGRAM_FILTER_OPTIONS: Array<{
  value: "all" | ProgramStatus;
  label: string;
}> = [
  { value: "all", label: "すべて" },
  { value: "active", label: "実施中" },
  { value: "follow_up", label: "要フォロー" },
  { value: "completed", label: "完了" },
  { value: "not_created", label: "未作成" },
];

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultMenuItems(): ProgramMenuItem[] {
  return DEFAULT_PROGRAM_MENU_LABELS.map((label) => ({
    id: createId("menu"),
    label,
    checked: false,
  }));
}

function normalizeGoal(raw: unknown): ProgramGoal | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<ProgramGoal> & { name?: string };
  const goalName =
    typeof item.goalName === "string"
      ? item.goalName.trim()
      : typeof item.name === "string"
        ? item.name.trim()
        : "";
  if (!goalName) return null;
  return {
    id: typeof item.id === "string" ? item.id : createId("goal"),
    goalName,
    currentValue: typeof item.currentValue === "string" ? item.currentValue : "",
    targetValue: typeof item.targetValue === "string" ? item.targetValue : "",
    deadline: typeof item.deadline === "string" ? item.deadline : "",
  };
}

function normalizeMenuItem(raw: unknown): ProgramMenuItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<ProgramMenuItem>;
  const label = typeof item.label === "string" ? item.label.trim() : "";
  if (!label) return null;
  return {
    id: typeof item.id === "string" ? item.id : createId("menu"),
    label,
    checked: Boolean(item.checked),
    isCustom: Boolean(item.isCustom),
  };
}

function normalizeStoredProgram(raw: unknown): StoredProgram | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<StoredProgram>;
  if (typeof item.clientId !== "string") return null;
  if (typeof item.currentPhase !== "string") return null;
  if (typeof item.progressLabel !== "string") return null;
  if (!["active", "follow_up", "completed"].includes(String(item.status))) {
    return null;
  }

  const goals = Array.isArray(item.goals)
    ? item.goals
        .map(normalizeGoal)
        .filter((goal): goal is ProgramGoal => goal !== null)
    : [];

  const menuItems = Array.isArray(item.menuItems)
    ? item.menuItems
        .map(normalizeMenuItem)
        .filter((menu): menu is ProgramMenuItem => menu !== null)
    : createDefaultMenuItems();

  return {
    clientId: item.clientId,
    startDate: typeof item.startDate === "string" ? item.startDate : null,
    currentPhase: item.currentPhase,
    nextFollowUpDate:
      typeof item.nextFollowUpDate === "string" ? item.nextFollowUpDate : null,
    progressLabel: item.progressLabel,
    status: item.status as Exclude<ProgramStatus, "not_created">,
    goals,
    menuItems: menuItems.length > 0 ? menuItems : createDefaultMenuItems(),
    instructorMemo:
      typeof item.instructorMemo === "string" ? item.instructorMemo : "",
    updatedAt:
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : new Date().toISOString(),
  };
}

function readStoredPrograms(): StoredProgram[] {
  if (!canUseStorage()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeStoredProgram)
      .filter((item): item is StoredProgram => item !== null);
  } catch {
    return [];
  }
}

function writeStoredPrograms(programs: StoredProgram[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
  window.dispatchEvent(new Event("swij-programs-updated"));
}

function buildSeedGoals(
  items: Array<[string, string, string, string]>,
): ProgramGoal[] {
  return items.map(([goalName, currentValue, targetValue, deadline]) => ({
    id: createId("goal"),
    goalName,
    currentValue,
    targetValue,
    deadline,
  }));
}

function buildSeedMenu(checkedLabels: string[]): ProgramMenuItem[] {
  const checked = new Set(checkedLabels);
  return createDefaultMenuItems().map((item) => ({
    ...item,
    checked: checked.has(item.label),
  }));
}

function buildSeedPrograms(clients: StoredClient[]): StoredProgram[] {
  const byId = new Map(clients.map((client) => [client.id, client]));
  const now = new Date().toISOString();

  const seeds: StoredProgram[] = [
    {
      clientId: "client-demo-4",
      startDate: isoDaysAgo(28),
      currentPhase: "生活習慣調整",
      nextFollowUpDate: isoDaysFromNow(5),
      progressLabel: "フェーズ2 · 55%",
      status: "active",
      goals: buildSeedGoals([
        ["睡眠スコア", "82", "88", isoDaysFromNow(21)],
        ["入眠潜時", "14分", "10分以内", isoDaysFromNow(14)],
      ]),
      menuItems: buildSeedMenu(["メラトニンヨガ™", "入浴", "呼吸法", "カフェイン制限"]),
      instructorMemo: "就寝前のスマホ使用が多いため、スマホ制限も重点的にフォロー。",
      updatedAt: now,
    },
    {
      clientId: "client-demo-1",
      startDate: isoDaysAgo(56),
      currentPhase: "プログラム完了",
      nextFollowUpDate: null,
      progressLabel: "完了 · 100%",
      status: "completed",
      goals: buildSeedGoals([
        ["深い睡眠率", "21%", "20%以上", isoDaysAgo(7)],
      ]),
      menuItems: buildSeedMenu(["朝日を浴びる", "ストレッチ", "瞑想"]),
      instructorMemo: "プログラム完了。メンテナンス期間として月1回フォロー。",
      updatedAt: now,
    },
    {
      clientId: "client-demo-2",
      startDate: isoDaysAgo(21),
      currentPhase: "睡眠リズム定着",
      nextFollowUpDate: isoDaysFromNow(3),
      progressLabel: "フェーズ3 · 72%",
      status: "active",
      goals: buildSeedGoals([
        ["睡眠負債", "-42分", "±0分", isoDaysFromNow(10)],
        ["HRV", "48 ms", "50 ms以上", isoDaysFromNow(21)],
      ]),
      menuItems: buildSeedMenu(["メラトニンヨガ™", "朝日を浴びる", "入浴", "ストレッチ"]),
      instructorMemo: "運動後の入浴タイミングが良い。週末の就寝時刻ブレに注意。",
      updatedAt: now,
    },
    {
      clientId: "client-demo-3",
      startDate: isoDaysAgo(42),
      currentPhase: "初回面談フォロー",
      nextFollowUpDate: isoDaysAgo(2),
      progressLabel: "フェーズ1 · 30%",
      status: "follow_up",
      goals: buildSeedGoals([
        ["睡眠スコア", "55", "70", isoDaysFromNow(28)],
        ["SpO₂", "93%", "95%以上", isoDaysFromNow(21)],
      ]),
      menuItems: buildSeedMenu(["呼吸法", "アルコール制限", "スマホ制限"]),
      instructorMemo: "要フォロー。フォロー面談の日程調整が必要。",
      updatedAt: now,
    },
  ];

  return seeds.filter((seed) => byId.has(seed.clientId));
}

function ensureProgramSeedData(clients: StoredClient[]): StoredProgram[] {
  const existing = readStoredPrograms();
  if (existing.length > 0) return existing;

  if (!canUseStorage()) return buildSeedPrograms(clients);

  const alreadySeeded = localStorage.getItem(SEED_FLAG_KEY) === "1";
  if (alreadySeeded) return existing;

  const seeded = buildSeedPrograms(clients);
  if (seeded.length > 0) {
    writeStoredPrograms(seeded);
    localStorage.setItem(SEED_FLAG_KEY, "1");
  }
  return seeded;
}

function latestSleepScore(client: StoredClient): number | null {
  const latest = client.analyses[0];
  if (!latest) return null;
  if (typeof latest.sleepScore === "number" && Number.isFinite(latest.sleepScore)) {
    return latest.sleepScore;
  }
  if (
    typeof latest.wellnessScore === "number" &&
    Number.isFinite(latest.wellnessScore)
  ) {
    return latest.wellnessScore;
  }
  return null;
}

function toListItem(
  client: StoredClient,
  program: StoredProgram | null,
): ProgramListItem {
  if (!program) {
    return {
      clientId: client.id,
      name: client.name,
      latestSleepScore: latestSleepScore(client),
      startDate: null,
      currentPhase: "—",
      nextFollowUpDate: null,
      progressLabel: "未作成",
      status: "not_created",
    };
  }

  return {
    clientId: client.id,
    name: client.name,
    latestSleepScore: latestSleepScore(client),
    startDate: program.startDate,
    currentPhase: program.currentPhase,
    nextFollowUpDate: program.nextFollowUpDate,
    progressLabel: program.progressLabel,
    status: program.status,
  };
}

export function loadProgramListItems(): ProgramListItem[] {
  const clients = loadClients();
  const programs = ensureProgramSeedData(clients);
  const programByClient = new Map(
    programs.map((program) => [program.clientId, program]),
  );

  return clients
    .map((client) => toListItem(client, programByClient.get(client.id) ?? null))
    .sort((a, b) => {
      const statusOrder: Record<ProgramStatus, number> = {
        follow_up: 0,
        active: 1,
        not_created: 2,
        completed: 3,
      };
      const byStatus = statusOrder[a.status] - statusOrder[b.status];
      if (byStatus !== 0) return byStatus;
      return a.name.localeCompare(b.name, "ja");
    });
}

export function formatProgramDate(value?: string | null): string {
  return formatDisplayDate(value);
}

export function getStoredProgramByClientId(
  clientId: string,
): StoredProgram | null {
  const clients = loadClients();
  ensureProgramSeedData(clients);
  return readStoredPrograms().find((program) => program.clientId === clientId) ?? null;
}

export function createEmptyProgramDetailView(
  client: StoredClient,
): ProgramDetailView {
  return {
    clientId: client.id,
    clientName: client.name,
    latestSleepScore: latestSleepScore(client),
    latestAnalysisDate: client.analyses[0]?.analysisDate ?? null,
    startDate: null,
    currentPhase: "—",
    nextFollowUpDate: null,
    progressLabel: "未作成",
    status: "not_created",
    goals: [],
    menuItems: createDefaultMenuItems(),
    instructorMemo: "",
    updatedAt: null,
  };
}

export function buildProgramDetailView(clientId: string): ProgramDetailView | null {
  const client = loadClients().find((item) => item.id === clientId);
  if (!client) return null;

  const programs = ensureProgramSeedData(loadClients());
  const program = programs.find((item) => item.clientId === clientId) ?? null;

  if (!program) {
    return createEmptyProgramDetailView(client);
  }

  return {
    clientId: client.id,
    clientName: client.name,
    latestSleepScore: latestSleepScore(client),
    latestAnalysisDate: client.analyses[0]?.analysisDate ?? null,
    startDate: program.startDate,
    currentPhase: program.currentPhase,
    nextFollowUpDate: program.nextFollowUpDate,
    progressLabel: program.progressLabel,
    status: program.status,
    goals: program.goals,
    menuItems: program.menuItems,
    instructorMemo: program.instructorMemo,
    updatedAt: program.updatedAt,
  };
}

function createNewStoredProgram(
  clientId: string,
  input: SaveProgramDetailInput,
): StoredProgram {
  return {
    clientId,
    startDate: new Date().toISOString().slice(0, 10),
    currentPhase: "プログラム開始",
    nextFollowUpDate: isoDaysFromNow(14),
    progressLabel: "フェーズ1 · 開始",
    status: "active",
    goals: input.goals,
    menuItems: input.menuItems,
    instructorMemo: input.instructorMemo,
    updatedAt: new Date().toISOString(),
  };
}

export function saveStoredProgramDetail(input: SaveProgramDetailInput): StoredProgram {
  const clients = loadClients();
  if (!clients.some((client) => client.id === input.clientId)) {
    throw new Error("クライアントが見つかりません。");
  }

  const programs = ensureProgramSeedData(clients);
  const index = programs.findIndex((program) => program.clientId === input.clientId);
  const existing = index >= 0 ? programs[index] : null;

  const next: StoredProgram = existing
    ? {
        ...existing,
        goals: input.goals,
        menuItems: input.menuItems,
        instructorMemo: input.instructorMemo,
        updatedAt: new Date().toISOString(),
      }
    : createNewStoredProgram(input.clientId, input);

  if (index >= 0) {
    programs[index] = next;
  } else {
    programs.push(next);
  }

  writeStoredPrograms(programs);
  return next;
}

export function syncStoredProgram(program: StoredProgram): StoredProgram {
  const clients = loadClients();
  if (!clients.some((client) => client.id === program.clientId)) {
    throw new Error("クライアントが見つかりません。");
  }

  const programs = ensureProgramSeedData(clients);
  const index = programs.findIndex((item) => item.clientId === program.clientId);
  const next = normalizeStoredProgram(program);
  if (!next) {
    throw new Error("プログラムデータが不正です。");
  }

  if (index >= 0) {
    programs[index] = next;
  } else {
    programs.push(next);
  }

  writeStoredPrograms(programs);
  return next;
}

export function createProgramGoal(): ProgramGoal {
  return {
    id: createId("goal"),
    goalName: "",
    currentValue: "",
    targetValue: "",
    deadline: "",
  };
}

export function createCustomMenuItem(label: string): ProgramMenuItem {
  return {
    id: createId("menu"),
    label: label.trim(),
    checked: false,
    isCustom: true,
  };
}

export function statusBadgeStyle(
  status: ProgramStatus,
): { color: string; bg: string; border: string } {
  switch (status) {
    case "active":
      return {
        color: "#0f6b5c",
        bg: "rgba(15, 107, 92, 0.08)",
        border: "rgba(15, 107, 92, 0.22)",
      };
    case "follow_up":
      return {
        color: "#a33a3a",
        bg: "rgba(163, 58, 58, 0.07)",
        border: "rgba(163, 58, 58, 0.22)",
      };
    case "completed":
      return {
        color: "#8a6a2d",
        bg: "rgba(138, 106, 45, 0.08)",
        border: "rgba(138, 106, 45, 0.24)",
      };
    default:
      return {
        color: "#64748b",
        bg: "rgba(100, 116, 139, 0.08)",
        border: "rgba(100, 116, 139, 0.2)",
      };
  }
}
