export const HOMEWORK_ROUTES = {
  clientAnchor: "/client#homework",
  instructor: "/homework",
  instructorForClient: (clientId: string) =>
    `/homework?clientId=${encodeURIComponent(clientId)}` as const,
  programs: "/programs",
  programDetail: (clientId: string) => `/programs/${clientId}` as const,
} as const;
