/**
 * Shared helpers used across Version 3.0 modules.
 * Keep cross-cutting utilities here — never domain logic.
 */

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function idleState<T = never>(): AsyncState<T> {
  return { data: null, loading: false, error: null };
}

export function loadingState<T = never>(): AsyncState<T> {
  return { data: null, loading: true, error: null };
}

export function successState<T>(data: T): AsyncState<T> {
  return { data, loading: false, error: null };
}

export function errorState<T = never>(error: string): AsyncState<T> {
  return { data: null, loading: false, error };
}

/** Placeholder for planned modules until real data lands. */
export type PlannedModuleOverview = {
  moduleId: string;
  title: string;
  summary: string;
  status: "planned";
  nextSteps: string[];
};

export function plannedOverview(
  moduleId: string,
  title: string,
  summary: string,
  nextSteps: string[],
): PlannedModuleOverview {
  return { moduleId, title, summary, status: "planned", nextSteps };
}
