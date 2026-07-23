export const JOURNEY_ROUTES = {
  page: "/journey",
  forClient: (clientId: string) =>
    `/journey?clientId=${encodeURIComponent(clientId)}`,
  clientAnchor: "/client#journey",
} as const;
