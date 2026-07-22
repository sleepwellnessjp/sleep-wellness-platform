export const HOMEWORK_ROUTES = {
  clientAnchor: "/client#homework",
  programs: "/programs",
  programDetail: (clientId: string) => `/programs/${clientId}` as const,
} as const;
