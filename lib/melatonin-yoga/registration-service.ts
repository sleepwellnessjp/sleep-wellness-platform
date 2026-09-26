import { sendMelatoninYogaRegistrationEmails } from "@/lib/melatonin-yoga/registration-emails";
import {
  isMelatoninYogaRegistrationStatus,
  type MelatoninYogaRegistrationInput,
  type MelatoninYogaRegistrationRecord,
  type MelatoninYogaRegistrationSelectionRecord,
  type MelatoninYogaRegistrationStatus,
} from "@/lib/melatonin-yoga/registration-types";
import type { MelatoninYogaEventType, MelatoninYogaTrainingFormat } from "@/lib/melatonin-yoga/types";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AppSupabase = SupabaseClient<Database>;

const REGISTRATION_COLUMNS =
  "id, name_kanji, name_kana, email, phone, training_format, has_yoga_experience, message, referral_source, status, admin_memo, submitted_at";

const REGISTRATION_WITH_SELECTIONS_SELECT = `${REGISTRATION_COLUMNS}, melatonin_yoga_registration_selections (event_type, is_flexible, session_id, melatonin_yoga_event_sessions (format, location, schedule_note, fee_note, melatonin_yoga_session_days (starts_at, ends_at, sort_order)))`;

type SelectionRow = {
  event_type: string;
  is_flexible: boolean;
  session_id: string | null;
  melatonin_yoga_event_sessions: {
    format: string;
    location: string;
    schedule_note: string;
    fee_note: string;
    melatonin_yoga_session_days: Array<{
      starts_at: string;
      ends_at: string;
      sort_order: number;
    }> | null;
  } | null;
};

type RegistrationRow = Record<string, unknown> & {
  melatonin_yoga_registration_selections?: SelectionRow[] | null;
};

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function mapSelection(row: SelectionRow): MelatoninYogaRegistrationSelectionRecord {
  const session = row.melatonin_yoga_event_sessions;
  const dayRows = [...(session?.melatonin_yoga_session_days ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return {
    eventType: row.event_type as MelatoninYogaEventType,
    isFlexible: row.is_flexible,
    sessionId: row.session_id,
    sessionFormat: session ? (session.format as MelatoninYogaRegistrationSelectionRecord["sessionFormat"]) : null,
    sessionLocation: session ? text(session.location) : null,
    sessionScheduleNote: session ? text(session.schedule_note) || null : null,
    sessionFeeNote: session ? text(session.fee_note) || null : null,
    sessionDays: dayRows.map((day) => ({
      startsAt: day.starts_at,
      endsAt: day.ends_at,
    })),
  };
}

function mapRegistration(row: RegistrationRow): MelatoninYogaRegistrationRecord | null {
  const status = String(row.status ?? "");
  if (!isMelatoninYogaRegistrationStatus(status)) return null;

  const trainingFormatRaw =
    typeof row.training_format === "string" ? row.training_format : null;

  return {
    id: String(row.id),
    nameKanji: String(row.name_kanji ?? ""),
    nameKana: String(row.name_kana ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    trainingFormat: trainingFormatRaw as MelatoninYogaTrainingFormat | null,
    hasYogaExperience: row.has_yoga_experience === true,
    message: String(row.message ?? ""),
    referralSource:
      typeof row.referral_source === "string" && row.referral_source.trim()
        ? row.referral_source.trim()
        : null,
    status,
    adminMemo: String(row.admin_memo ?? ""),
    submittedAt: String(row.submitted_at ?? ""),
    selections: (row.melatonin_yoga_registration_selections ?? []).map(mapSelection),
  };
}

export function mapMelatoninYogaRegistrationWriteError(error: {
  message?: string;
}): { error: string; status: number } {
  const message = error.message ?? "";

  if (message.includes("my_registration_rate_limited")) {
    return {
      error:
        "短時間に連続して送信されています。しばらくしてから再度お試しください。",
      status: 429,
    };
  }
  if (message.includes("my_registration_session_full")) {
    return {
      error: "選択した日程は満席です。別の日程をお選びください。",
      status: 409,
    };
  }
  if (message.includes("my_registration_session_closed")) {
    return {
      error: "選択した日程は受付終了しています。",
      status: 409,
    };
  }
  if (message.includes("my_registration_session_not_found")) {
    return {
      error: "選択した日程が見つかりません。ページを再読み込みしてください。",
      status: 409,
    };
  }
  if (message.includes("my_registration_training_format_required")) {
    return {
      error: "養成コースの受講形式を選択してください。",
      status: 400,
    };
  }
  if (message.includes("my_registration_training_format_invalid")) {
    return {
      error: "選択した日程では、その受講形式はお選びいただけません。",
      status: 400,
    };
  }
  if (message.includes("my_registration_invalid")) {
    return {
      error: "入力内容を確認してください。",
      status: 400,
    };
  }

  return {
    error: "申込を受け付けられませんでした。入力内容をご確認ください。",
    status: 400,
  };
}

export function melatoninYogaRegistrationErrorStatus(error: unknown): {
  error: string;
  status: number;
} {
  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return { error: "ログインが必要です", status: 401 };
    }
    if (error.message === "Forbidden") {
      return { error: "権限がありません", status: 403 };
    }
    return mapMelatoninYogaRegistrationWriteError(error);
  }
  return {
    error: "申込を受け付けられませんでした。",
    status: 400,
  };
}

export async function createMelatoninYogaRegistration(
  input: MelatoninYogaRegistrationInput,
  submitterIp: string,
): Promise<string> {
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    throw new Error("申込の保存先が設定されていません");
  }

  const { data, error } = await supabase.rpc("create_melatonin_yoga_registration", {
    p_name_kanji: input.nameKanji,
    p_name_kana: input.nameKana,
    p_email: input.email,
    p_phone: input.phone,
    p_training_format: input.trainingFormat,
    p_has_yoga_experience: input.hasYogaExperience,
    p_message: input.message,
    p_referral_source: input.referralSource || null,
    p_submitter_ip: submitterIp,
    p_selections: input.selections.map((selection) => ({
      event_type: selection.eventType,
      session_id: selection.sessionId,
      is_flexible: selection.isFlexible,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("申込の保存に失敗しました");
  }

  try {
    const registration = await getMelatoninYogaRegistrationById(data);
    if (registration) {
      await sendMelatoninYogaRegistrationEmails(registration);
    }
  } catch (error) {
    console.error("[email] melatonin-yoga post-save failed", {
      id: data,
      error: error instanceof Error ? error.message : "failed",
    });
  }

  return data;
}

export async function getMelatoninYogaRegistrationById(
  id: string,
): Promise<MelatoninYogaRegistrationRecord | null> {
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("melatonin_yoga_registrations")
    .select(REGISTRATION_WITH_SELECTIONS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapRegistration(data as RegistrationRow);
}

async function requireAdminClient(): Promise<AppSupabase> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

export async function listMelatoninYogaRegistrationsForAdmin(): Promise<
  MelatoninYogaRegistrationRecord[]
> {
  await requireAdminProfile();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from("melatonin_yoga_registrations")
    .select(REGISTRATION_WITH_SELECTIONS_SELECT)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => mapRegistration(row as RegistrationRow))
    .filter((row): row is MelatoninYogaRegistrationRecord => row !== null);
}

export async function updateMelatoninYogaRegistrationAsAdmin(input: {
  id: string;
  status: MelatoninYogaRegistrationStatus;
  adminMemo: string;
}): Promise<MelatoninYogaRegistrationRecord> {
  await requireAdminProfile();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from("melatonin_yoga_registrations")
    .update({
      status: input.status,
      admin_memo: input.adminMemo,
    } as never)
    .eq("id", input.id)
    .select(REGISTRATION_WITH_SELECTIONS_SELECT)
    .single();

  if (error) throw new Error(error.message);
  const mapped = mapRegistration(data as RegistrationRow);
  if (!mapped) throw new Error("申込の更新に失敗しました");
  return mapped;
}
