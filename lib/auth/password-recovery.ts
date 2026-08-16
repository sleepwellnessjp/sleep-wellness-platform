/**
 * Auth メールの redirectTo 用オリジン。
 * - ブラウザでは「いま開いている origin」を優先（localhost 検証・PKCE cookie 一致のため）
 * - 本番カスタムドメインでは NEXT_PUBLIC_APP_URL があればそちらを使い、誤ったホスト混入を防ぐ
 */
export function getPublicAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    try {
      const host = new URL(origin).hostname;
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".local");
      const isVercelPreview = host.endsWith(".vercel.app");
      // ローカル／プレビューは必ず現在の origin（PKCE の code_verifier と一致させる）
      if (isLocal || isVercelPreview) {
        return origin;
      }
    } catch {
      return origin;
    }
    if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
      return fromEnv;
    }
    return origin;
  }

  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv;
  }
  return "";
}

/** パスワード再設定完了画面（クエリはネストさせない） */
export const PASSWORD_UPDATE_PATH = "/login?mode=update-password";

export function isPasswordRecoveryRedirect(
  redirect: string | null | undefined,
  flow: string | null | undefined,
  type: string | null | undefined,
): boolean {
  if (flow === "recovery" || type === "recovery") return true;
  if (!redirect) return false;
  const normalized = redirect.trim().toLowerCase();
  return (
    normalized.includes("mode=update-password") ||
    normalized.includes("update-password")
  );
}
