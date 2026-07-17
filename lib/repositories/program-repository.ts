import {
  buildProgramDetailView,
  createDefaultMenuItems,
  createEmptyProgramDetailView,
  loadProgramListItems,
  saveStoredProgramDetail,
  syncStoredProgram,
  type ProgramDetailView,
  type ProgramGoal,
  type ProgramMenuItem,
  type ProgramListItem,
  type SaveProgramDetailInput,
  type StoredProgram,
} from "@/lib/program-store";
import { loadClients as loadRemoteClients } from "@/lib/repositories/client-repository";
import {
  getClientById as getLocalClientById,
  loadClients as loadLocalClients,
  type StoredClient,
} from "@/lib/client-store";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type {
  ProgramDetailView,
  ProgramGoal,
  ProgramListItem,
  ProgramMenuItem,
  ProgramStatus,
  SaveProgramDetailInput,
} from "@/lib/program-store";
export {
  createCustomMenuItem,
  createDefaultMenuItems,
  createProgramGoal,
  DEFAULT_PROGRAM_MENU_LABELS,
  formatProgramDate,
  PROGRAM_FILTER_OPTIONS,
  PROGRAM_STATUS_LABELS,
  statusBadgeStyle,
} from "@/lib/program-store";

type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
};

type DbProgramRow = {
  id: string;
  client_id: string;
  owner_id: string;
  start_date: string | null;
  current_phase: string;
  next_follow_up_date: string | null;
  progress_label: string;
  status: string;
  goals: ProgramGoal[] | null;
  menu_items: ProgramMenuItem[] | null;
  instructor_memo: string | null;
  created_at: string;
  updated_at: string;
};

async function getSupabaseAuth(): Promise<SupabaseAuth | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return { supabase, userId: user.id };
}

function notifyProgramsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("swij-programs-updated"));
  }
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeGoals(raw: unknown): ProgramGoal[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const goal = item as Partial<ProgramGoal> & { name?: string };
      const goalName =
        typeof goal.goalName === "string"
          ? goal.goalName.trim()
          : typeof goal.name === "string"
            ? goal.name.trim()
            : "";
      if (!goalName) return null;
      return {
        id: typeof goal.id === "string" ? goal.id : createId("goal"),
        goalName,
        currentValue:
          typeof goal.currentValue === "string" ? goal.currentValue : "",
        targetValue:
          typeof goal.targetValue === "string" ? goal.targetValue : "",
        deadline: typeof goal.deadline === "string" ? goal.deadline : "",
      };
    })
    .filter((goal): goal is ProgramGoal => goal !== null);
}

function normalizeMenuItems(raw: unknown): ProgramMenuItem[] {
  if (!Array.isArray(raw)) return createDefaultMenuItems();

  const items: ProgramMenuItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const menu = entry as Partial<ProgramMenuItem>;
    const label = typeof menu.label === "string" ? menu.label.trim() : "";
    if (!label) continue;
    items.push({
      id: typeof menu.id === "string" ? menu.id : createId("menu"),
      label,
      checked: Boolean(menu.checked),
      isCustom: menu.isCustom ? true : undefined,
    });
  }

  return items.length > 0 ? items : createDefaultMenuItems();
}

function mapDbProgram(row: DbProgramRow): StoredProgram {
  return {
    clientId: row.client_id,
    startDate: row.start_date,
    currentPhase: row.current_phase,
    nextFollowUpDate: row.next_follow_up_date,
    progressLabel: row.progress_label,
    status:
      row.status === "follow_up" || row.status === "completed"
        ? row.status
        : "active",
    goals: normalizeGoals(row.goals),
    menuItems: normalizeMenuItems(row.menu_items),
    instructorMemo: row.instructor_memo ?? "",
    updatedAt: row.updated_at,
  };
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

function toProgramDetailView(
  client: StoredClient,
  program: StoredProgram | null,
): ProgramDetailView {
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

async function fetchProgramFromSupabase(
  auth: SupabaseAuth,
  clientId: string,
): Promise<StoredProgram | null> {
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("owner_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapDbProgram(data as DbProgramRow);
}

async function upsertProgramInSupabase(
  auth: SupabaseAuth,
  clientId: string,
  input: SaveProgramDetailInput,
  existing: StoredProgram | null,
): Promise<StoredProgram> {
  const { supabase, userId } = auth;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  if (existing) {
    const { data, error } = await supabase
      .from("programs")
      .update({
        goals: input.goals,
        menu_items: input.menuItems,
        instructor_memo: input.instructorMemo,
        updated_at: now,
      })
      .eq("owner_id", userId)
      .eq("client_id", clientId)
      .select("*")
      .single();

    if (error) throw error;
    return mapDbProgram(data as DbProgramRow);
  }

  const { data, error } = await supabase
    .from("programs")
    .insert({
      client_id: clientId,
      owner_id: userId,
      start_date: today,
      current_phase: "プログラム開始",
      next_follow_up_date: new Date(Date.now() + 14 * 86400000)
        .toISOString()
        .slice(0, 10),
      progress_label: "フェーズ1 · 開始",
      status: "active",
      goals: input.goals,
      menu_items: input.menuItems,
      instructor_memo: input.instructorMemo,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapDbProgram(data as DbProgramRow);
}

/** localStorage ベース。クライアント一覧と同期してプログラム行を返す */
export async function getProgramListItems(): Promise<ProgramListItem[]> {
  try {
    await loadRemoteClients();
  } catch {
    loadLocalClients();
  }
  return loadProgramListItems();
}

export async function getProgramDetail(
  clientId: string,
): Promise<ProgramDetailView | null> {
  const auth = await getSupabaseAuth();

  if (!auth) {
    return buildProgramDetailView(clientId);
  }

  const client = await loadRemoteClients().then(
    (clients) => clients.find((item) => item.id === clientId) ?? null,
  );
  if (!client) return null;

  try {
    const program = await fetchProgramFromSupabase(auth, clientId);
    return toProgramDetailView(client, program);
  } catch {
    return buildProgramDetailView(clientId);
  }
}

export async function saveProgramDetail(
  input: SaveProgramDetailInput,
): Promise<ProgramDetailView> {
  const auth = await getSupabaseAuth();

  if (!auth) {
    saveStoredProgramDetail(input);
    const detail = buildProgramDetailView(input.clientId);
    if (!detail) {
      throw new Error("クライアントが見つかりません。");
    }
    return detail;
  }

  const client = await loadRemoteClients().then(
    (clients) => clients.find((item) => item.id === input.clientId) ?? null,
  );
  if (!client) {
    const localClient = getLocalClientById(input.clientId);
    if (!localClient) {
      throw new Error("クライアントが見つかりません。");
    }
    saveStoredProgramDetail(input);
    const detail = buildProgramDetailView(input.clientId);
    if (!detail) {
      throw new Error("クライアントが見つかりません。");
    }
    return detail;
  }

  try {
    const existing = await fetchProgramFromSupabase(auth, input.clientId);
    const saved = await upsertProgramInSupabase(
      auth,
      input.clientId,
      input,
      existing,
    );
    syncStoredProgram(saved);
    notifyProgramsUpdated();
    return toProgramDetailView(client, saved);
  } catch {
    saveStoredProgramDetail(input);
    const detail = buildProgramDetailView(input.clientId);
    if (!detail) {
      throw new Error("クライアントが見つかりません。");
    }
    return detail;
  }
}
