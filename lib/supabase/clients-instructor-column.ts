/**
 * clients テーブルの担当講師カラム解決。
 *
 * 正規名は instructor_id（migration 20260722190000）。
 * 未適用環境では owner_id が残るため、起動時に一度だけプローブして切り替える。
 */

import { readSupabaseError } from "@/lib/supabase/errors";

export type ClientsInstructorColumn = "instructor_id" | "owner_id";

type ClientsProbeClient = {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (count: number) => PromiseLike<{ error: unknown }>;
    };
  };
};

let cachedColumn: ClientsInstructorColumn | null = null;
let inflight: Promise<ClientsInstructorColumn> | null = null;

export function peekClientsInstructorColumn(): ClientsInstructorColumn | null {
  return cachedColumn;
}

export function resetClientsInstructorColumnCache(): void {
  cachedColumn = null;
  inflight = null;
}

function isMissingInstructorIdColumn(error: unknown): boolean {
  const parsed = readSupabaseError(error);
  if (parsed.code === "42703") {
    return /instructor_id/i.test(parsed.message);
  }
  return /column\s+.*instructor_id.*does not exist/i.test(parsed.message);
}

/**
 * 現在の DB が使う担当講師カラム名を返す。
 * instructor_id が存在すればそれを優先。なければ owner_id。
 */
export async function resolveClientsInstructorColumn(
  supabase: ClientsProbeClient,
): Promise<ClientsInstructorColumn> {
  if (cachedColumn) return cachedColumn;
  if (inflight) return inflight;

  inflight = (async () => {
    const { error } = await supabase
      .from("clients")
      .select("instructor_id")
      .limit(1);

    if (!error) {
      cachedColumn = "instructor_id";
      return cachedColumn;
    }

    if (isMissingInstructorIdColumn(error)) {
      console.warn(
        "[supabase] clients.instructor_id 未適用のため owner_id にフォールバックします。supabase/clients-instructor-id.sql を実行してください。",
      );
      cachedColumn = "owner_id";
      return cachedColumn;
    }

    // RLS 等の別エラー時は正規名を仮定（後続クエリで本来のエラーを返す）
    cachedColumn = "instructor_id";
    return cachedColumn;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * generated Database types は instructor_id 前提。
 * 実行時値が owner_id でも、.eq / .in の型を通すためのキャスト。
 */
export function clientsInstructorFilterColumn(
  column: ClientsInstructorColumn,
): "instructor_id" {
  return column as "instructor_id";
}

/** Row から担当講師 ID を取り出す（両カラム互換） */
export function readClientsInstructorId(
  row: Record<string, unknown> | null | undefined,
): string | null {
  if (!row) return null;
  const instructorId = row.instructor_id;
  if (typeof instructorId === "string" && instructorId) return instructorId;
  const ownerId = row.owner_id;
  if (typeof ownerId === "string" && ownerId) return ownerId;
  return null;
}

/** insert / update 用に担当講師フィールドを組み立てる */
export function clientsInstructorPayload(
  column: ClientsInstructorColumn,
  userId: string,
): { instructor_id: string } {
  // 実行時は owner_id キーになり得る。呼び出し側で insert(... as never) する。
  return { [column]: userId } as { instructor_id: string };
}
