import { isYogaFest2026SoxaiClassId } from "@/lib/yoga-fest-2026-soxai/classes";
import { sendYogaFestSoxaiRegistrationReceiptEmail } from "@/lib/yoga-fest-2026-soxai/registration-emails";
import type {
  YogaFest2026SoxaiRegistrationInput,
  YogaFest2026SoxaiRegistrationRecord,
  YogaFestSoxaiAgeBand,
} from "@/lib/yoga-fest-2026-soxai/types";
import { requireAdminProfile } from "@/lib/platform/platform-service";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AppSupabase = SupabaseClient<Database>;

const REGISTRATION_COLUMNS =
  "id, class_id, name, age_band, email, guardian_name, guardian_consent, info_consent, submitted_at";

type RegistrationRow = {
  id: string;
  class_id: string;
  name: string;
  age_band: string;
  email: string;
  guardian_name: string;
  guardian_consent: boolean;
  info_consent: boolean;
  submitted_at: string;
};

function mapRegistration(row: RegistrationRow): YogaFest2026SoxaiRegistrationRecord | null {
  if (!isYogaFest2026SoxaiClassId(row.class_id)) return null;
  return {
    id: row.id,
    classId: row.class_id,
    name: row.name,
    ageBand: row.age_band as YogaFestSoxaiAgeBand,
    email: row.email,
    guardianName: row.guardian_name.trim() ? row.guardian_name : null,
    guardianConsent: row.guardian_consent,
    infoConsent: row.info_consent,
    submitterIp: "",
    submittedAt: row.submitted_at,
  };
}

async function requireAdminClient(): Promise<AppSupabase> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase が設定されていません");
  return supabase;
}

export function mapYogaFestSoxaiRegistrationWriteError(error: {
  message?: string;
  code?: string;
}): { error: string; status: number } {
  const message = error.message ?? "";
  const code = error.code ?? "";

  if (message.includes("yf_soxai_rate_limited")) {
    return {
      error:
        "混雑のため送信できませんでした。しばらくしてから再度お試しください。",
      status: 429,
    };
  }
  if (
    message.includes("yf_soxai_duplicate") ||
    code === "23505" ||
    message.includes("yoga_fest_soxai_registrations_class_email_unique")
  ) {
    return {
      error: "このクラスには、このメールアドレスで登録済みです。",
      status: 409,
    };
  }
  if (message.includes("yf_soxai_class_invalid")) {
    return {
      error: "クラスを選択してください",
      status: 400,
    };
  }
  if (message.includes("yf_soxai_invalid")) {
    return {
      error: "入力内容を確認してください",
      status: 400,
    };
  }

  return {
    error: "登録を受け付けられませんでした。入力内容をご確認ください。",
    status: 400,
  };
}

export function yogaFestSoxaiRegistrationErrorStatus(error: unknown): {
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
    return mapYogaFestSoxaiRegistrationWriteError(error);
  }
  if (error && typeof error === "object" && "message" in error) {
    return mapYogaFestSoxaiRegistrationWriteError(
      error as { message?: string; code?: string },
    );
  }
  return {
    error: "登録を受け付けられませんでした。",
    status: 400,
  };
}

export async function createYogaFest2026SoxaiRegistration(
  input: YogaFest2026SoxaiRegistrationInput,
  submitterIp: string,
): Promise<string> {
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    throw new Error("登録の保存先が設定されていません");
  }

  const { data, error } = await supabase.rpc("create_yoga_fest_soxai_registration", {
    p_class_id: input.classId,
    p_name: input.name,
    p_age_band: input.ageBand,
    p_email: input.email,
    p_guardian_name: input.guardianName || null,
    p_guardian_consent: input.guardianConsent,
    p_info_consent: input.infoConsent,
    p_submitter_ip: submitterIp,
  });

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("登録の保存に失敗しました");
  }

  const id = String(data);

  try {
    const registration = await getYogaFest2026SoxaiRegistrationById(id);
    if (registration) {
      await sendYogaFestSoxaiRegistrationReceiptEmail(registration);
    }
  } catch (error) {
    console.error("[email] yoga-fest-soxai post-save failed", {
      id,
      error: error instanceof Error ? error.message : "failed",
    });
  }

  return id;
}

export async function getYogaFest2026SoxaiRegistrationById(
  id: string,
): Promise<YogaFest2026SoxaiRegistrationRecord | null> {
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("yoga_fest_soxai_registrations")
    .select(REGISTRATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapRegistration(data as RegistrationRow);
}

export async function listYogaFest2026SoxaiRegistrationsForAdmin(): Promise<
  YogaFest2026SoxaiRegistrationRecord[]
> {
  await requireAdminProfile();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from("yoga_fest_soxai_registrations")
    .select(REGISTRATION_COLUMNS)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => mapRegistration(row as RegistrationRow))
    .filter((row): row is YogaFest2026SoxaiRegistrationRecord => row !== null);
}

export async function deleteYogaFest2026SoxaiRegistrationAsAdmin(
  id: string,
): Promise<void> {
  await requireAdminProfile();
  const supabase = await requireAdminClient();

  const { error } = await supabase
    .from("yoga_fest_soxai_registrations")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
