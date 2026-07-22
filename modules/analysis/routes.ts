export const ANALYSIS_ROUTES = {
  new: "/analysis/new",
  confirm: "/analysis/confirm",
  loading: "/analysis/loading",
  result: "/analysis/result",
  clientAnalysis: (id: string) => `/client/analyses/${id}` as const,
} as const;
