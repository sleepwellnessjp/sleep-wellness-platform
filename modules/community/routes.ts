export const COMMUNITY_ROUTES = {
  home: "/community",
  discussion: (id: string) => `/community/discussions/${id}` as const,
  admin: "/admin/community",
} as const;
