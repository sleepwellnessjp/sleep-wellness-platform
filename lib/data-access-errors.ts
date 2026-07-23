/**
 * Version 1.0 Beta データアクセスのユーザー向けエラー文言。
 */

import {
  formatSupabaseError,
  isMissingTableError,
  isRlsViolationError,
  readSupabaseError,
} from "@/lib/supabase/errors";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type DataAccessErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "save_failed"
  | "load_failed"
  | "not_configured";

export class DataAccessError extends Error {
  readonly code: DataAccessErrorCode;

  constructor(code: DataAccessErrorCode, message: string) {
    super(message);
    this.name = "DataAccessError";
    this.code = code;
  }
}

export function requireConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new DataAccessError(
      "not_configured",
      "Supabase が未設定です。環境変数を確認してください。",
    );
  }
}

export function unauthenticatedError(): DataAccessError {
  return new DataAccessError(
    "unauthenticated",
    "ログインが必要です。認定講師アカウントでサインインしてください。",
  );
}

export function notFoundError(label = "対象データ"): DataAccessError {
  return new DataAccessError(
    "not_found",
    `${label}が見つかりません。一覧から再度選択してください。`,
  );
}

export function mapLoadError(error: unknown, context: string): DataAccessError {
  console.error(`[data] load failed: ${context}`, error);

  if (error instanceof DataAccessError) return error;

  if (isMissingTableError(error)) {
    return new DataAccessError(
      "load_failed",
      "必要なテーブルがまだ作成されていません。マイグレーションを適用してください。",
    );
  }

  if (isRlsViolationError(error)) {
    return new DataAccessError(
      "forbidden",
      "このデータへのアクセス権限がありません。",
    );
  }

  const parsed = readSupabaseError(error);
  return new DataAccessError(
    "load_failed",
    parsed.message
      ? `データの取得に失敗しました: ${parsed.message}`
      : "データの取得に失敗しました。しばらくしてから再度お試しください。",
  );
}

export function mapSaveError(error: unknown, context: string): DataAccessError {
  console.error(`[data] save failed: ${context}`, error);

  if (error instanceof DataAccessError) return error;

  if (isMissingTableError(error)) {
    return new DataAccessError(
      "save_failed",
      "必要なテーブルがまだ作成されていません。マイグレーションを適用してください。",
    );
  }

  if (isRlsViolationError(error)) {
    return new DataAccessError(
      "forbidden",
      "保存する権限がありません。担当クライアントのみ操作できます。",
    );
  }

  try {
    const wrapped = formatSupabaseError(error, context);
    return new DataAccessError(
      "save_failed",
      wrapped.message || "保存に失敗しました。もう一度お試しください。",
    );
  } catch {
    return new DataAccessError(
      "save_failed",
      "保存に失敗しました。もう一度お試しください。",
    );
  }
}

export function userMessageFromUnknown(error: unknown): string {
  if (error instanceof DataAccessError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "処理に失敗しました。もう一度お試しください。";
}
