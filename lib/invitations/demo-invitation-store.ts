import {
  addDaysIso,
  buildInviteEmail,
  DEFAULT_INVITE_EXPIRY_DAYS,
  generateInviteCode,
} from "./constants";
import type {
  CreateInvitationInput,
  InvitationListFilters,
  InvitationRecord,
  InvitationStatus,
} from "./types";

const DEMO_INSTRUCTOR_ID = "demo-instructor";

function nowIso(): string {
  return new Date().toISOString();
}

let invitations: InvitationRecord[] = [
  {
    id: "inv-demo-1",
    code: "SWIJ-DEMO-CL01",
    instructorId: DEMO_INSTRUCTOR_ID,
    instructorEmail: "demo@swij.local",
    instructorName: "デモ インストラクター",
    clientName: "山田 花子",
    clientEmail: "hanako@example.com",
    clientId: null,
    status: "sent",
    emailSubject: "【Sleep Wellness】デモ インストラクター からのクライアント招待",
    emailBody: "デモ招待メール本文",
    expiresAt: addDaysIso(10),
    sentAt: addDaysIso(-2),
    acceptedAt: null,
    createdAt: addDaysIso(-2),
    updatedAt: addDaysIso(-2),
  },
  {
    id: "inv-demo-2",
    code: "SWIJ-DEMO-CL02",
    instructorId: DEMO_INSTRUCTOR_ID,
    instructorEmail: "demo@swij.local",
    instructorName: "デモ インストラクター",
    clientName: "鈴木 一郎",
    clientEmail: "ichiro@example.com",
    clientId: "demo-client-1",
    status: "accepted",
    emailSubject: "【Sleep Wellness】デモ インストラクター からのクライアント招待",
    emailBody: "デモ招待メール本文",
    expiresAt: addDaysIso(5),
    sentAt: addDaysIso(-8),
    acceptedAt: addDaysIso(-6),
    createdAt: addDaysIso(-8),
    updatedAt: addDaysIso(-6),
  },
];

function matchesFilters(
  row: InvitationRecord,
  filters?: InvitationListFilters,
): boolean {
  if (!filters) return true;
  if (filters.status && filters.status !== "all" && row.status !== filters.status) {
    return false;
  }
  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    if (!q) return true;
    const hay = `${row.clientName} ${row.clientEmail} ${row.code}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function listDemoInvitations(
  instructorId?: string,
  filters?: InvitationListFilters,
): InvitationRecord[] {
  return invitations
    .filter((row) => !instructorId || row.instructorId === instructorId)
    .filter((row) => matchesFilters(row, filters))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAllDemoInvitations(
  filters?: InvitationListFilters,
): InvitationRecord[] {
  return invitations
    .filter((row) => matchesFilters(row, filters))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDemoInvitationByCode(
  code: string,
): InvitationRecord | null {
  const normalized = code.trim().toUpperCase();
  return (
    invitations.find((row) => row.code.toUpperCase() === normalized) ?? null
  );
}

export function createDemoInvitation(params: {
  instructorId: string;
  instructorEmail: string | null;
  instructorName: string | null;
  input: CreateInvitationInput;
  origin?: string;
}): InvitationRecord {
  const code = generateInviteCode();
  const origin = params.origin ?? "https://app.swij.local";
  const inviteUrl = `${origin}/invite/${encodeURIComponent(code)}`;
  const email = buildInviteEmail({
    clientName: params.input.clientName.trim(),
    instructorName: params.instructorName ?? "認定講師",
    code,
    inviteUrl,
  });
  const now = nowIso();
  const record: InvitationRecord = {
    id: `inv-${Math.random().toString(36).slice(2, 10)}`,
    code,
    instructorId: params.instructorId,
    instructorEmail: params.instructorEmail,
    instructorName: params.instructorName,
    clientName: params.input.clientName.trim(),
    clientEmail: params.input.clientEmail.trim().toLowerCase(),
    clientId: params.input.clientId ?? null,
    status: "pending",
    emailSubject: email.subject,
    emailBody: email.body,
    expiresAt: addDaysIso(params.input.expiresInDays ?? DEFAULT_INVITE_EXPIRY_DAYS),
    sentAt: null,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  invitations = [record, ...invitations];
  return record;
}

export function sendDemoInvitation(id: string): InvitationRecord | null {
  const idx = invitations.findIndex((row) => row.id === id);
  if (idx < 0) return null;
  const row = invitations[idx];
  if (!row) return null;
  if (row.status === "accepted" || row.status === "revoked") return row;
  const now = nowIso();
  const updated: InvitationRecord = {
    ...row,
    status: "sent",
    sentAt: now,
    updatedAt: now,
  };
  invitations = [
    ...invitations.slice(0, idx),
    updated,
    ...invitations.slice(idx + 1),
  ];
  return updated;
}

export function revokeDemoInvitation(id: string): InvitationRecord | null {
  const idx = invitations.findIndex((row) => row.id === id);
  if (idx < 0) return null;
  const row = invitations[idx];
  if (!row) return null;
  const now = nowIso();
  const updated: InvitationRecord = {
    ...row,
    status: "revoked",
    updatedAt: now,
  };
  invitations = [
    ...invitations.slice(0, idx),
    updated,
    ...invitations.slice(idx + 1),
  ];
  return updated;
}

export function acceptDemoInvitation(code: string): {
  ok: boolean;
  invitation: InvitationRecord | null;
  error?: string;
} {
  const invitation = getDemoInvitationByCode(code);
  if (!invitation) {
    return { ok: false, invitation: null, error: "招待コードが見つかりません" };
  }
  if (invitation.status === "revoked") {
    return { ok: false, invitation, error: "この招待は取り消されています" };
  }
  if (invitation.status === "accepted") {
    return { ok: true, invitation };
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    const idx = invitations.findIndex((row) => row.id === invitation.id);
    if (idx >= 0) {
      const expired: InvitationRecord = {
        ...invitation,
        status: "expired",
        updatedAt: nowIso(),
      };
      invitations = [
        ...invitations.slice(0, idx),
        expired,
        ...invitations.slice(idx + 1),
      ];
      return { ok: false, invitation: expired, error: "招待の有効期限が切れています" };
    }
  }
  const now = nowIso();
  const updated: InvitationRecord = {
    ...invitation,
    status: "accepted" as InvitationStatus,
    acceptedAt: now,
    updatedAt: now,
  };
  const idx = invitations.findIndex((row) => row.id === invitation.id);
  if (idx >= 0) {
    invitations = [
      ...invitations.slice(0, idx),
      updated,
      ...invitations.slice(idx + 1),
    ];
  }
  return { ok: true, invitation: updated };
}
