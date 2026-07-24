export type InvitationStatus =
  | "pending"
  | "sent"
  | "accepted"
  | "expired"
  | "revoked";

export type InvitationRecord = {
  id: string;
  code: string;
  instructorId: string;
  instructorEmail: string | null;
  instructorName: string | null;
  clientName: string;
  clientEmail: string;
  clientId: string | null;
  status: InvitationStatus;
  emailSubject: string;
  emailBody: string;
  expiresAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInvitationInput = {
  clientName: string;
  clientEmail: string;
  clientId?: string | null;
  expiresInDays?: number;
};

export type InvitationListFilters = {
  status?: InvitationStatus | "all";
  q?: string;
};
