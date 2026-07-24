export const CLIENTS_ROUTES = {
  list: "/clients",
  new: "/clients/new",
  detail: (id: string) => `/clients/${id}` as const,
  compare: (id: string) => `/clients/${id}/compare` as const,
  clientPortal: "/client",
  clientSleep: "/client/sleep",
  clientAdvice: "/client/advice",
  clientHomework: "/client/homework",
  clientJourney: "/client/journey",
  clientReports: "/client/reports",
  clientChat: "/client/chat",
  clientGoals: "/client/goals",
} as const;
