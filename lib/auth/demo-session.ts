const DEMO_SESSION_KEY = "swij-demo-session";
const DEMO_FLOW_STEP_KEY = "swij-demo-flow-step";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/** デモモードで体験を開始したことを記録（実データとは非連携） */
export function enableDemoSession(): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(DEMO_SESSION_KEY, "1");
}

export function clearDemoSession(): void {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(DEMO_SESSION_KEY);
  sessionStorage.removeItem(DEMO_FLOW_STEP_KEY);
}

export function isDemoSessionActive(): boolean {
  if (!canUseStorage()) return false;
  return sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
}

export function setDemoFlowStep(stepId: string): void {
  if (!canUseStorage()) return;
  sessionStorage.setItem(DEMO_FLOW_STEP_KEY, stepId);
}

export function getDemoFlowStep(): string | null {
  if (!canUseStorage()) return null;
  return sessionStorage.getItem(DEMO_FLOW_STEP_KEY);
}
