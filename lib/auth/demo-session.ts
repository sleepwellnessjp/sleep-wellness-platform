const DEMO_SESSION_KEY = "swij-demo-session";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/** デモモード（Supabase 未設定）でダッシュボードへ進んだことを記録 */
export function enableDemoSession(): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(DEMO_SESSION_KEY, "1");
}

export function clearDemoSession(): void {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(DEMO_SESSION_KEY);
}

export function isDemoSessionActive(): boolean {
  if (!canUseStorage()) return false;
  return sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
}
