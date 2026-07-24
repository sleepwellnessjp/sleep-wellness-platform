import type {
  CommercialPlanDefinition,
  CommercialPlanId,
  CommercialPlanStatus,
} from "./types";

export const COMMERCIAL_PLANS: CommercialPlanDefinition[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "個人認定講師向けの標準プラン",
    monthlyPrice: 4_980,
    yearlyPrice: 49_800,
    features: [
      "クライアント管理（上限 30）",
      "月次分析クレジット 40",
      "My License / デジタル認定証",
      "クライアント招待",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "複数クライアント運営・AI支援向け",
    monthlyPrice: 12_800,
    yearlyPrice: 128_000,
    highlighted: true,
    features: [
      "クライアント管理（上限 150）",
      "月次分析クレジット 120",
      "AI Counseling / Sleep Coach",
      "Journey・レポート一括",
      "優先サポート",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "認定校・組織向けカスタム契約",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "無制限クライアント",
      "認定校ダッシュボード",
      "本部監査・権限管理連携",
      "専任オンボーディング",
      "請求書払い対応（予定）",
    ],
  },
];

export const COMMERCIAL_PLAN_LABELS: Record<CommercialPlanId, string> = {
  basic: "Basic",
  professional: "Professional",
  enterprise: "Enterprise",
};

export const COMMERCIAL_STATUS_LABELS: Record<CommercialPlanStatus, string> = {
  active: "有効",
  trialing: "トライアル",
  past_due: "支払い遅延",
  canceled: "解約",
  none: "未契約",
};

export function formatPlanYen(amount: number): string {
  if (amount <= 0) return "要お問い合わせ";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}
