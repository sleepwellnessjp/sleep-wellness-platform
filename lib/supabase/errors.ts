/** Supabase / PostgREST エラーを整形し、必ず console.error する */

export type FormattedSupabaseError = {
  code: string;
  message: string;
  details: string;
  hint: string;
  status?: number;
};

export function readSupabaseError(error: unknown): FormattedSupabaseError {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    return {
      code: typeof e.code === "string" ? e.code : "",
      message: typeof e.message === "string" ? e.message : "",
      details: typeof e.details === "string" ? e.details : "",
      hint: typeof e.hint === "string" ? e.hint : "",
      status: typeof e.status === "number" ? e.status : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      code: "",
      message: error.message,
      details: "",
      hint: "",
    };
  }

  return {
    code: "",
    message: typeof error === "string" ? error : "不明なエラー",
    details: "",
    hint: "",
  };
}

export function isMissingColumnError(error: unknown): boolean {
  const e = readSupabaseError(error);
  return (
    e.code === "PGRST204" ||
    /column .* does not exist/i.test(e.message) ||
    /Could not find the .* column/i.test(e.message)
  );
}

export function isMissingTableError(error: unknown): boolean {
  const e = readSupabaseError(error);
  return (
    e.code === "PGRST205" ||
    /Could not find the table/i.test(e.message) ||
    /relation .* does not exist/i.test(e.message)
  );
}

export function isRlsViolationError(error: unknown): boolean {
  const e = readSupabaseError(error);
  return (
    e.code === "42501" ||
    /row-level security/i.test(e.message) ||
    /new row violates row-level security/i.test(e.message)
  );
}

export function formatSupabaseError(
  error: unknown,
  context: string,
): Error {
  console.error(`[supabase] ${context}`, error);

  const parsed = readSupabaseError(error);
  console.error(`[supabase] ${context} detail:`, parsed);

  if (isMissingTableError(error)) {
    return new Error(
      "Supabase に clients テーブルがありません。SQL Editor で supabase/schema.sql を実行してください。",
    );
  }

  if (isRlsViolationError(error)) {
    return new Error(
      `登録が拒否されました（RLS）: ${parsed.message || "権限がありません。"}`,
    );
  }

  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  const parts = [parsed.message, parsed.details, parsed.hint].filter(Boolean);
  if (parts.length > 0) {
    return new Error(
      parsed.code ? `[${parsed.code}] ${parts.join(" / ")}` : parts.join(" / "),
    );
  }

  return new Error("登録に失敗しました。");
}
