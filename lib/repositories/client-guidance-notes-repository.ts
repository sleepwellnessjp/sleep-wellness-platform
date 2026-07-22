import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOCAL_STORAGE_KEY = "swij-guidance-notes-v1";

export type GuidanceNote = {
  id: string;
  clientId: string;
  content: string;
  noteDate: string;
  createdAt: string;
  updatedAt: string;
};

export type GuidanceNoteInput = {
  content: string;
  noteDate: string;
};

type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
};

type DbGuidanceNoteRow = {
  id: string;
  client_id: string;
  owner_id: string;
  content: string;
  note_date: string;
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

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayInTokyo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeDate(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return todayInTokyo();
}

function normalizeContent(value: string): string {
  return value.trim();
}

function mapDbRow(row: DbGuidanceNoteRow): GuidanceNote {
  return {
    id: row.id,
    clientId: row.client_id,
    content: row.content,
    noteDate: row.note_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 時系列（古い→新しい）。同日は作成順。 */
export function sortGuidanceNotesChronological(
  notes: GuidanceNote[],
): GuidanceNote[] {
  return [...notes].sort((a, b) => {
    const byDate = a.noteDate.localeCompare(b.noteDate);
    if (byDate !== 0) return byDate;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** 例: 2026-07-22 → 7/22 */
export function formatGuidanceNoteDate(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || "—";
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return value;
  return `${month}/${day}`;
}

function readLocalStore(): Record<string, GuidanceNote[]> {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, GuidanceNote[]> = {};
    for (const [clientId, entries] of Object.entries(parsed)) {
      if (!Array.isArray(entries)) continue;
      result[clientId] = entries
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const note = entry as Partial<GuidanceNote>;
          const content = normalizeContent(String(note.content ?? ""));
          if (!content) return null;
          return {
            id: typeof note.id === "string" ? note.id : createId(),
            clientId:
              typeof note.clientId === "string" ? note.clientId : clientId,
            content,
            noteDate: normalizeDate(note.noteDate),
            createdAt:
              typeof note.createdAt === "string"
                ? note.createdAt
                : new Date().toISOString(),
            updatedAt:
              typeof note.updatedAt === "string"
                ? note.updatedAt
                : new Date().toISOString(),
          } satisfies GuidanceNote;
        })
        .filter((note): note is GuidanceNote => note !== null);
    }
    return result;
  } catch {
    return {};
  }
}

function writeLocalStore(store: Record<string, GuidanceNote[]>) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

function listLocalNotes(clientId: string): GuidanceNote[] {
  const store = readLocalStore();
  return sortGuidanceNotesChronological(store[clientId] ?? []);
}

function createLocalNote(
  clientId: string,
  input: GuidanceNoteInput,
): GuidanceNote {
  const now = new Date().toISOString();
  const note: GuidanceNote = {
    id: createId(),
    clientId,
    content: normalizeContent(input.content),
    noteDate: normalizeDate(input.noteDate),
    createdAt: now,
    updatedAt: now,
  };
  const store = readLocalStore();
  store[clientId] = sortGuidanceNotesChronological([
    ...(store[clientId] ?? []),
    note,
  ]);
  writeLocalStore(store);
  return note;
}

function updateLocalNote(
  clientId: string,
  noteId: string,
  input: GuidanceNoteInput,
): GuidanceNote | null {
  const store = readLocalStore();
  const list = store[clientId] ?? [];
  const index = list.findIndex((note) => note.id === noteId);
  if (index < 0) return null;

  const updated: GuidanceNote = {
    ...list[index],
    content: normalizeContent(input.content),
    noteDate: normalizeDate(input.noteDate),
    updatedAt: new Date().toISOString(),
  };
  list[index] = updated;
  store[clientId] = sortGuidanceNotesChronological(list);
  writeLocalStore(store);
  return updated;
}

function deleteLocalNote(clientId: string, noteId: string): boolean {
  const store = readLocalStore();
  const list = store[clientId] ?? [];
  const next = list.filter((note) => note.id !== noteId);
  if (next.length === list.length) return false;
  store[clientId] = next;
  writeLocalStore(store);
  return true;
}

export async function listGuidanceNotes(
  clientId: string,
): Promise<GuidanceNote[]> {
  const auth = await getSupabaseAuth();
  if (!auth) return listLocalNotes(clientId);

  const { data, error } = await auth.supabase
    .from("client_guidance_notes")
    .select(
      "id, client_id, owner_id, content, note_date, created_at, updated_at",
    )
    .eq("client_id", clientId)
    .eq("owner_id", auth.userId)
    .order("note_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[guidance-notes] list failed:", error);
    throw new Error(error.message || "指導メモの取得に失敗しました。");
  }

  return sortGuidanceNotesChronological(
    (data as DbGuidanceNoteRow[] | null)?.map(mapDbRow) ?? [],
  );
}

export async function createGuidanceNote(
  clientId: string,
  input: GuidanceNoteInput,
): Promise<GuidanceNote> {
  const content = normalizeContent(input.content);
  if (!content) {
    throw new Error("メモ内容を入力してください。");
  }
  const noteDate = normalizeDate(input.noteDate);

  const auth = await getSupabaseAuth();
  if (!auth) return createLocalNote(clientId, { content, noteDate });

  const { data, error } = await auth.supabase
    .from("client_guidance_notes")
    .insert({
      client_id: clientId,
      owner_id: auth.userId,
      content,
      note_date: noteDate,
    })
    .select(
      "id, client_id, owner_id, content, note_date, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    console.error("[guidance-notes] create failed:", error);
    throw new Error(error?.message || "指導メモの追加に失敗しました。");
  }

  return mapDbRow(data as DbGuidanceNoteRow);
}

export async function updateGuidanceNote(
  clientId: string,
  noteId: string,
  input: GuidanceNoteInput,
): Promise<GuidanceNote> {
  const content = normalizeContent(input.content);
  if (!content) {
    throw new Error("メモ内容を入力してください。");
  }
  const noteDate = normalizeDate(input.noteDate);

  const auth = await getSupabaseAuth();
  if (!auth) {
    const updated = updateLocalNote(clientId, noteId, { content, noteDate });
    if (!updated) throw new Error("指導メモが見つかりません。");
    return updated;
  }

  const { data, error } = await auth.supabase
    .from("client_guidance_notes")
    .update({
      content,
      note_date: noteDate,
    })
    .eq("id", noteId)
    .eq("client_id", clientId)
    .eq("owner_id", auth.userId)
    .select(
      "id, client_id, owner_id, content, note_date, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    console.error("[guidance-notes] update failed:", error);
    throw new Error(error?.message || "指導メモの更新に失敗しました。");
  }

  return mapDbRow(data as DbGuidanceNoteRow);
}

export async function deleteGuidanceNote(
  clientId: string,
  noteId: string,
): Promise<void> {
  const auth = await getSupabaseAuth();
  if (!auth) {
    if (!deleteLocalNote(clientId, noteId)) {
      throw new Error("指導メモが見つかりません。");
    }
    return;
  }

  const { error } = await auth.supabase
    .from("client_guidance_notes")
    .delete()
    .eq("id", noteId)
    .eq("client_id", clientId)
    .eq("owner_id", auth.userId);

  if (error) {
    console.error("[guidance-notes] delete failed:", error);
    throw new Error(error.message || "指導メモの削除に失敗しました。");
  }
}

export function defaultGuidanceNoteDate(): string {
  return todayInTokyo();
}
