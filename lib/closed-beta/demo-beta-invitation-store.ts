import {
  buildBetaInviteEmail,
  generateBetaInviteCode,
  todayTokyoDate,
} from "./beta-invitation-constants";
import type {
  AcceptBetaInvitationInput,
  BetaInstructorInvitation,
  CreateBetaInvitationInput,
} from "./beta-invitation-types";

const nowIso = () => new Date().toISOString();

let store: BetaInstructorInvitation[] = [
  {
    id: "beta-inv-1",
    code: "BETA-DEMO-0001",
    instructorName: "山田 太郎",
    instructorEmail: "yamada@example.com",
    startDate: todayTokyoDate(),
    status: "sent",
    emailSubject: "【SWIJ Closed Beta】認定講師招待 — 山田 太郎 様",
    emailBody: "デモ招待メール本文",
    termsRequired: true,
    termsAcceptedAt: null,
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    acceptedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

function touch(
  row: BetaInstructorInvitation,
  patch: Partial<BetaInstructorInvitation>,
): BetaInstructorInvitation {
  const next = { ...row, ...patch, updatedAt: nowIso() };
  store = store.map((item) => (item.id === row.id ? next : item));
  return next;
}

export function listDemoBetaInvitations(): BetaInstructorInvitation[] {
  return [...store].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createDemoBetaInvitation(
  input: CreateBetaInvitationInput,
): BetaInstructorInvitation {
  const code = generateBetaInviteCode();
  const inviteUrl = `http://localhost:3000/invite/${code}`;
  const email = buildBetaInviteEmail({
    instructorName: input.instructorName.trim(),
    code,
    startDate: input.startDate,
    inviteUrl,
  });
  const created: BetaInstructorInvitation = {
    id: `beta-inv-${Date.now()}`,
    code,
    instructorName: input.instructorName.trim(),
    instructorEmail: input.instructorEmail.trim().toLowerCase(),
    startDate: input.startDate,
    status: "draft",
    emailSubject: email.subject,
    emailBody: email.body,
    termsRequired: input.termsRequired !== false,
    termsAcceptedAt: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store = [created, ...store];
  return created;
}

/** メール送信（モック）— SMTP は呼ばず status を sent にする */
export function sendDemoBetaInvitation(
  id: string,
): BetaInstructorInvitation | null {
  const row = store.find((item) => item.id === id);
  if (!row) return null;
  if (row.status === "revoked" || row.status === "expired") {
    throw new Error("取消・期限切れの招待は送信できません");
  }
  return touch(row, { status: "sent", sentAt: nowIso() });
}

export function revokeDemoBetaInvitation(
  id: string,
): BetaInstructorInvitation | null {
  const row = store.find((item) => item.id === id);
  if (!row) return null;
  if (row.status === "accepted") {
    throw new Error("受諾済の招待は取消できません");
  }
  return touch(row, { status: "revoked" });
}

export function getDemoBetaInvitationByCode(
  code: string,
): BetaInstructorInvitation | null {
  const normalized = code.trim().toUpperCase();
  return store.find((item) => item.code.toUpperCase() === normalized) ?? null;
}

export function acceptDemoBetaInvitation(
  input: AcceptBetaInvitationInput,
): BetaInstructorInvitation {
  const row = getDemoBetaInvitationByCode(input.code);
  if (!row) throw new Error("招待コードが見つかりません");
  if (row.status === "revoked") throw new Error("この招待は取り消されています");
  if (row.status === "expired") throw new Error("この招待は期限切れです");
  if (row.status === "accepted") return row;
  if (row.termsRequired && !input.termsAccepted) {
    throw new Error("利用規約への同意が必要です");
  }
  const acceptedAt = nowIso();
  return touch(row, {
    status: "accepted",
    acceptedAt,
    termsAcceptedAt: input.termsAccepted ? acceptedAt : null,
  });
}
