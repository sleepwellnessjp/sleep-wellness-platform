import type { InvitationStatus } from "./types";

export const INVITATION_STATUSES = [
  "pending",
  "sent",
  "accepted",
  "expired",
  "revoked",
] as const satisfies readonly InvitationStatus[];

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "下書き",
  sent: "送信済",
  accepted: "受諾済",
  expired: "期限切れ",
  revoked: "取消",
};

export const DEFAULT_INVITE_EXPIRY_DAYS = 14;

export function generateInviteCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SWIJ-${part()}-${part()}`;
}

export function buildInviteEmail(params: {
  clientName: string;
  instructorName: string;
  code: string;
  inviteUrl: string;
}): { subject: string; body: string } {
  const subject = `【Sleep Wellness】${params.instructorName} からのクライアント招待`;
  const body = [
    `${params.clientName} 様`,
    "",
    `認定講師 ${params.instructorName} より、Sleep Wellness Platform へのご招待です。`,
    "",
    `招待コード: ${params.code}`,
    `招待URL: ${params.inviteUrl}`,
    "",
    "上記URLまたはログイン後に招待コードを入力して、クライアントポータルをご利用ください。",
    "",
    "一般社団法人 Sleep Wellness Japan",
  ].join("\n");
  return { subject, body };
}

export function isInvitationStatus(value: string): value is InvitationStatus {
  return (INVITATION_STATUSES as readonly string[]).includes(value);
}

export function addDaysIso(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
