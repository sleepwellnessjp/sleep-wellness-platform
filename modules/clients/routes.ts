export const CLIENTS_ROUTES = {
  list: "/clients",
  new: "/clients/new",
  detail: (id: string) => `/clients/${id}` as const,
  compare: (id: string) => `/clients/${id}/compare` as const,
  clientPortal: "/client",
} as const;
