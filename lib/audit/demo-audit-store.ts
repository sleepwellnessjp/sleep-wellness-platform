import { AUDIT_ACTIONS } from "./constants";
import type {
  AuditAction,
  AuditListFilters,
  AuditLogRecord,
  WriteAuditLogInput,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

let logs: AuditLogRecord[] = [
  {
    id: "audit-1",
    actorId: "demo-instructor",
    actorEmail: "demo@swij.local",
    actorRole: "instructor",
    action: "login",
    resourceType: "session",
    resourceId: null,
    summary: "デモモードでログインしました",
    payload: {},
    ipAddress: null,
    userAgent: null,
    createdAt: daysAgo(0),
  },
  {
    id: "audit-2",
    actorId: "demo-instructor",
    actorEmail: "demo@swij.local",
    actorRole: "instructor",
    action: "analysis_run",
    resourceType: "analysis",
    resourceId: "an-demo-1",
    summary: "睡眠分析を実行しました",
    payload: { clientName: "山田 花子" },
    ipAddress: null,
    userAgent: null,
    createdAt: daysAgo(1),
  },
  {
    id: "audit-3",
    actorId: "demo-instructor",
    actorEmail: "demo@swij.local",
    actorRole: "instructor",
    action: "report_create",
    resourceType: "report",
    resourceId: "rp-demo-1",
    summary: "クライアントレポートを作成しました",
    payload: {},
    ipAddress: null,
    userAgent: null,
    createdAt: daysAgo(1),
  },
  {
    id: "audit-4",
    actorId: "demo-instructor",
    actorEmail: "demo@swij.local",
    actorRole: "instructor",
    action: "client_add",
    resourceType: "client",
    resourceId: "cl-demo-new",
    summary: "クライアントを追加しました",
    payload: { name: "新規 太郎" },
    ipAddress: null,
    userAgent: null,
    createdAt: daysAgo(2),
  },
  {
    id: "audit-5",
    actorId: "demo-admin",
    actorEmail: "admin@swij.local",
    actorRole: "admin",
    action: "license_update",
    resourceType: "license",
    resourceId: "lic-demo-1",
    summary: "ライセンスを更新しました",
    payload: { action: "renew" },
    ipAddress: null,
    userAgent: null,
    createdAt: daysAgo(3),
  },
];

export function writeDemoAuditLog(input: WriteAuditLogInput): AuditLogRecord {
  const record: AuditLogRecord = {
    id: `audit-${Math.random().toString(36).slice(2, 10)}`,
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    summary: input.summary,
    payload: input.payload ?? {},
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: nowIso(),
  };
  logs = [record, ...logs].slice(0, 500);
  return record;
}

export function listDemoAuditLogs(
  filters?: AuditListFilters,
): AuditLogRecord[] {
  const limit = filters?.limit ?? 100;
  return logs
    .filter((row) => {
      if (
        filters?.action &&
        filters.action !== "all" &&
        row.action !== filters.action
      ) {
        return false;
      }
      if (filters?.q) {
        const q = filters.q.trim().toLowerCase();
        if (!q) return true;
        const hay =
          `${row.summary} ${row.actorEmail ?? ""} ${row.action}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .slice(0, limit);
}

export function demoAuditActionOptions(): AuditAction[] {
  return [...AUDIT_ACTIONS];
}
