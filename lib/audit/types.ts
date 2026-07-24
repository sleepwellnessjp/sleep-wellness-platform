export type AuditAction =
  | "login"
  | "analysis_run"
  | "report_create"
  | "client_add"
  | "license_update"
  | "invitation_create"
  | "invitation_send"
  | "role_change"
  | "subscription_view"
  | "other";

export type AuditLogRecord = {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: AuditAction;
  resourceType: string | null;
  resourceId: string | null;
  summary: string;
  payload: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type WriteAuditLogInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  summary: string;
  payload?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditListFilters = {
  action?: AuditAction | "all";
  q?: string;
  limit?: number;
};
