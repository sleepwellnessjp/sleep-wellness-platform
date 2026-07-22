/**
 * Analysis Module service — session + persistence boundary.
 * Heavy domain logic remains in lib/analysis-session for now.
 */
export { normalizeAnalysisResult, normalizeMetrics } from "@/lib/analysis-session";
export type { AnalysisMetrics, AnalysisResult } from "@/lib/analysis-session";

export const analysisService = {
  // Domain helpers re-exported above; expand here as flows grow.
};
