/** Version 2.7 — 認定講師向け Closed Beta 招待 */

export type BetaInvitationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "expired"
  | "revoked";

export type BetaInstructorInvitation = {
  id: string;
  code: string;
  instructorName: string;
  instructorEmail: string;
  /** 利用開始日（YYYY-MM-DD） */
  startDate: string;
  status: BetaInvitationStatus;
  emailSubject: string;
  emailBody: string;
  /** 送信時に利用規約同意を必須にしたか */
  termsRequired: boolean;
  /** 受諾時の利用規約同意 */
  termsAcceptedAt: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBetaInvitationInput = {
  instructorName: string;
  instructorEmail: string;
  startDate: string;
  termsRequired?: boolean;
};

export type AcceptBetaInvitationInput = {
  code: string;
  termsAccepted: boolean;
};
