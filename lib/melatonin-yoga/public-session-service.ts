import { isSessionPast } from "@/lib/melatonin-yoga/format";
import type { PublicMelatoninYogaSession } from "@/lib/melatonin-yoga/registration-types";
import type {
  MelatoninYogaEventType,
  MelatoninYogaSessionFormat,
} from "@/lib/melatonin-yoga/types";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

type SessionRow = {
  id: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  format: string;
  location: string;
  schedule_note: string;
  fee_note: string;
  archive_available: boolean;
  capacity: number;
  melatonin_yoga_session_days?: Array<{
    starts_at: string;
    ends_at: string;
    sort_order: number;
  }> | null;
};

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export async function listPublicMelatoninYogaSessions(): Promise<
  PublicMelatoninYogaSession[]
> {
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    throw new Error("公開日程の取得先が設定されていません");
  }

  const { data, error } = await supabase
    .from("melatonin_yoga_event_sessions")
    .select(
      "id, event_type, starts_at, ends_at, format, location, schedule_note, fee_note, archive_available, capacity, melatonin_yoga_session_days (starts_at, ends_at, sort_order)",
    )
    .eq("published", true)
    .eq("registration_closed", false)
    .order("starts_at", { ascending: true })
    .order("sort_order", {
      referencedTable: "melatonin_yoga_session_days",
      ascending: true,
    });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SessionRow[];
  const results: PublicMelatoninYogaSession[] = [];

  for (const row of rows) {
    if (
      isSessionPast({
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      })
    ) {
      continue;
    }

    const { data: reserved, error: countError } = await supabase.rpc(
      "melatonin_yoga_session_reserved_count",
      { p_session_id: row.id },
    );

    if (countError) throw new Error(countError.message);

    const dayRows = [...(row.melatonin_yoga_session_days ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );

    results.push({
      id: row.id,
      eventType: row.event_type as MelatoninYogaEventType,
      days: dayRows.map((day) => ({
        startsAt: day.starts_at,
        endsAt: day.ends_at,
      })),
      scheduleNote: text(row.schedule_note) || null,
      format: row.format as MelatoninYogaSessionFormat,
      location: text(row.location),
      feeNote: text(row.fee_note) || null,
      archiveAvailable: row.archive_available,
      isFull: (reserved ?? 0) >= row.capacity,
    });
  }

  return results;
}
