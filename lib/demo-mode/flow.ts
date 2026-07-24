/**
 * Demo Mode — 1クリック体験フロー定義。
 * 実データとは独立したサンプル体験用。
 */

export type DemoFlowStepId =
  | "collect"
  | "analysis"
  | "ai"
  | "homework"
  | "journey"
  | "followup"
  | "report";

export type DemoFlowStep = {
  id: DemoFlowStepId;
  index: number;
  label: string;
  title: string;
  description: string;
  href: string;
};

export const DEMO_FLOW_STEPS: readonly DemoFlowStep[] = [
  {
    id: "collect",
    index: 1,
    label: "データ収集",
    title: "睡眠データの収集",
    description:
      "ウェアラブルや測定シートから睡眠スコア・HRV・ストレス等を取り込みます。",
    href: "/demo/flow/collect",
  },
  {
    id: "analysis",
    index: 2,
    label: "睡眠分析",
    title: "睡眠分析レポート",
    description:
      "測定結果を可視化し、睡眠の質・効率・回復のポイントを整理します。",
    href: "/demo/flow/analysis",
  },
  {
    id: "ai",
    index: 3,
    label: "AI提案",
    title: "AIによる改善提案",
    description:
      "分析結果から、今日できること・次回までの推奨アクションを提案します。",
    href: "/demo/flow/ai",
  },
  {
    id: "homework",
    index: 4,
    label: "Homework",
    title: "Homework（宿題）",
    description:
      "クライアントが日常で取り組む宿題を設定し、達成率を追います。",
    href: "/demo/flow/homework",
  },
  {
    id: "journey",
    index: 5,
    label: "Journey",
    title: "Sleep Wellness Journey",
    description:
      "初回から8週までのマイルストーンで、改善の軌跡を共有します。",
    href: "/demo/flow/journey",
  },
  {
    id: "followup",
    index: 6,
    label: "Follow Up",
    title: "フォローアップ",
    description:
      "面談・オンライン等の記録を残し、次回アクションにつなげます。",
    href: "/demo/flow/followup",
  },
  {
    id: "report",
    index: 7,
    label: "改善レポート",
    title: "改善レポート",
    description:
      "スコア推移と取り組みをまとめたレポートで、成果を可視化します。",
    href: "/demo/flow/report",
  },
] as const;

export function getDemoFlowStep(id: string): DemoFlowStep | undefined {
  return DEMO_FLOW_STEPS.find((step) => step.id === id);
}

export function getDemoFlowNeighbors(id: DemoFlowStepId): {
  prev: DemoFlowStep | null;
  next: DemoFlowStep | null;
  current: DemoFlowStep;
} {
  const index = DEMO_FLOW_STEPS.findIndex((step) => step.id === id);
  const current = DEMO_FLOW_STEPS[index] ?? DEMO_FLOW_STEPS[0]!;
  return {
    prev: index > 0 ? (DEMO_FLOW_STEPS[index - 1] ?? null) : null,
    next:
      index >= 0 && index < DEMO_FLOW_STEPS.length - 1
        ? (DEMO_FLOW_STEPS[index + 1] ?? null)
        : null,
    current,
  };
}

export const DEMO_FLOW_START_HREF = DEMO_FLOW_STEPS[0]!.href;
