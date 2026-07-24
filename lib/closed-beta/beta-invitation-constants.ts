import type { BetaInvitationStatus } from "./beta-invitation-types";

export const BETA_INVITATION_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "expired",
  "revoked",
] as const satisfies readonly BetaInvitationStatus[];

export const BETA_INVITATION_STATUS_LABELS: Record<
  BetaInvitationStatus,
  string
> = {
  draft: "下書き",
  sent: "送信済",
  accepted: "受諾済",
  expired: "期限切れ",
  revoked: "取消",
};

export function generateBetaInviteCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BETA-${part()}-${part()}`;
}

export function buildBetaInviteEmail(params: {
  instructorName: string;
  code: string;
  startDate: string;
  inviteUrl: string;
}): { subject: string; body: string } {
  const subject = `【SWIJ Closed Beta】認定講師招待 — ${params.instructorName} 様`;
  const body = [
    `${params.instructorName} 様`,
    "",
    "一般社団法人 Sleep Wellness Japan より、",
    "Sleep Wellness Platform Closed Beta へのご招待です。",
    "",
    `招待コード: ${params.code}`,
    `利用開始日: ${params.startDate}`,
    `招待URL: ${params.inviteUrl}`,
    "",
    "上記URLを開き、利用規約に同意のうえ受諾してください。",
    "本招待は第1期・第2期認定講師限定です。",
    "",
    "一般社団法人 Sleep Wellness Japan",
  ].join("\n");
  return { subject, body };
}

export function isBetaInvitationStatus(
  value: string,
): value is BetaInvitationStatus {
  return (BETA_INVITATION_STATUSES as readonly string[]).includes(value);
}

export function todayTokyoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
