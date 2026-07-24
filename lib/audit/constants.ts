import type { AuditAction } from "./types";

export const AUDIT_ACTIONS = [
  "login",
  "analysis_run",
  "report_create",
  "client_add",
  "license_update",
  "invitation_create",
  "invitation_send",
  "role_change",
  "subscription_view",
  "other",
] as const satisfies readonly AuditAction[];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  login: "ログイン",
  analysis_run: "分析実行",
  report_create: "レポート作成",
  client_add: "クライアント追加",
  license_update: "ライセンス更新",
  invitation_create: "招待作成",
  invitation_send: "招待メール送信",
  role_change: "権限変更",
  subscription_view: "プラン閲覧",
  other: "その他",
};

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}
