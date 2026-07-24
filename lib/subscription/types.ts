/** 将来課金対応の商用プラン（モック） */
export type CommercialPlanId = "basic" | "professional" | "enterprise";

export type CommercialPlanStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "none";

export type CommercialPlanDefinition = {
  id: CommercialPlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  highlighted?: boolean;
};

export type CommercialSubscriptionRecord = {
  id: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  planId: CommercialPlanId;
  status: CommercialPlanStatus;
  billingCycle: "monthly" | "yearly";
  currentPeriodEnd: string | null;
  mockNote: string;
  createdAt: string;
  updatedAt: string;
};
