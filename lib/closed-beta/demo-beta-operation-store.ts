/**
 * Version 2.8 Closed Beta Operation — デモストア
 * Supabase 未設定時の本部 PDCA コンソール検証用。
 */

import { APP_VERSION } from "@/lib/app-version";
import {
  CLOSED_BETA_OPERATION_PHASE_LABEL,
  CLOSED_BETA_OPERATION_VERSION,
  computeBetaOperationReadiness,
} from "./operation-constants";
import type {
  BetaKpiMetrics,
  BugReportRecord,
  BugStatus,
  ClientOutcomesSnapshot,
  ClosedBetaOperationBundle,
  FeatureRequestRecord,
  FeatureRequestStatus,
  ProductBacklogItem,
  BacklogStatus,
  UpdateBacklogItemInput,
  UpdateBugReportInput,
  UpdateFeatureRequestInput,
  WeeklyReportRecord,
} from "./operation-types";

const nowIso = () => new Date().toISOString();

let featureRequestsSeed: FeatureRequestRecord[] | null = null;
let bugReportsSeed: BugReportRecord[] | null = null;
let backlogSeed: ProductBacklogItem[] | null = null;

export function getDemoBetaKpi(): BetaKpiMetrics {
  return {
    activeCertifiedInstructors: 14,
    activeClients: 52,
    weeklyAnalysisCount: 118,
    averageContinuationRate: 84,
    averageImprovementRate: 67,
    feedbackResponseRate: 91,
    weeklyNewRegistrations: 9,
    weeklySeries: [
      {
        weekLabel: "6/29週",
        analyses: 72,
        newClients: 5,
        activeInstructors: 10,
      },
      {
        weekLabel: "7/6週",
        analyses: 88,
        newClients: 7,
        activeInstructors: 11,
      },
      {
        weekLabel: "7/13週",
        analyses: 101,
        newClients: 8,
        activeInstructors: 13,
      },
      {
        weekLabel: "7/20週",
        analyses: 118,
        newClients: 9,
        activeInstructors: 14,
      },
    ],
    periodLabel: "今週（週次集計）",
    updatedAt: nowIso(),
  };
}

function seedFeatureRequests(): FeatureRequestRecord[] {
  const updatedAt = nowIso();
  return [
    {
      id: "fr-001",
      title: "分析結果の比較ビューを強化",
      description:
        "前回分析との差分を一目で確認できる比較グラフを追加してほしい。",
      category: "analysis",
      priority: "high",
      voteCount: 12,
      status: "planned",
      plannedFor: "Version 2.9",
      submittedBy: "山田 太郎",
      createdAt: "2026-07-18T09:00:00.000Z",
      updatedAt,
    },
    {
      id: "fr-002",
      title: "Homework リマインドの時刻設定",
      description: "クライアントごとにリマインド時刻を指定できるようにしたい。",
      category: "homework",
      priority: "medium",
      voteCount: 8,
      status: "in_progress",
      plannedFor: "Version 2.8 hotfix",
      submittedBy: "佐藤 花子",
      createdAt: "2026-07-16T11:20:00.000Z",
      updatedAt,
    },
    {
      id: "fr-003",
      title: "AI コーチの口調を選択可能に",
      description: "穏やか / 励まし / 簡潔 の3トーンから選べると良い。",
      category: "ai",
      priority: "low",
      voteCount: 5,
      status: "open",
      plannedFor: null,
      submittedBy: "鈴木 一郎",
      createdAt: "2026-07-20T14:10:00.000Z",
      updatedAt,
    },
    {
      id: "fr-004",
      title: "Journey 進捗の共有リンク",
      description: "クライアント向けに進捗サマリーを共有できる短い URL が欲しい。",
      category: "journey",
      priority: "medium",
      voteCount: 9,
      status: "completed",
      plannedFor: "Version 2.7",
      submittedBy: "田中 美咲",
      createdAt: "2026-07-10T08:30:00.000Z",
      updatedAt,
    },
    {
      id: "fr-005",
      title: "レポート PDF のブランドヘッダー調整",
      description: "認定校ロゴを差し替えられると説明会で使いやすい。",
      category: "report",
      priority: "high",
      voteCount: 11,
      status: "planned",
      plannedFor: "Version 2.9",
      submittedBy: "伊藤 健",
      createdAt: "2026-07-19T16:45:00.000Z",
      updatedAt,
    },
  ];
}

function seedBugReports(): BugReportRecord[] {
  const updatedAt = nowIso();
  return [
    {
      id: "bug-001",
      title: "分析確認画面で戻ると入力が消える",
      description: "confirm → new に戻ると一部フィールドが初期化される。",
      severity: "high",
      status: "fixing",
      reporterName: "山田 太郎",
      affectedScreen: "/analysis/confirm",
      createdAt: "2026-07-21T10:00:00.000Z",
      updatedAt,
      resolvedAt: null,
    },
    {
      id: "bug-002",
      title: "iPad 横向きでナビが折り返しすぎる",
      description: "タブレット横向きで AdminSubNav が2行になり押しづらい。",
      severity: "medium",
      status: "investigating",
      reporterName: "佐藤 花子",
      affectedScreen: "/admin",
      createdAt: "2026-07-20T07:15:00.000Z",
      updatedAt,
      resolvedAt: null,
    },
    {
      id: "bug-003",
      title: "フィードバック送信後にトーストが出ない",
      description: "成功時の確認表示がなく、二重送信しやすい。",
      severity: "low",
      status: "resolved",
      reporterName: "鈴木 一郎",
      affectedScreen: "/feedback",
      createdAt: "2026-07-15T12:00:00.000Z",
      updatedAt,
      resolvedAt: "2026-07-17T09:30:00.000Z",
    },
    {
      id: "bug-004",
      title: "重大: 招待コード受諾で 500",
      description: "特定コードで accept 時にサーバーエラー（再現率低）。",
      severity: "critical",
      status: "open",
      reporterName: "本部 QA",
      affectedScreen: "/invite/[code]",
      createdAt: "2026-07-23T03:20:00.000Z",
      updatedAt,
      resolvedAt: null,
    },
  ];
}

export function getDemoClientOutcomes(): ClientOutcomesSnapshot {
  return {
    sleepImprovementRate: 63,
    continuationRate: 84,
    homeworkAchievementRate: 72,
    journeyProgressRate: 58,
    sampleSize: 52,
    byStage: [
      { stage: "導入", progressPercent: 92, clientCount: 14 },
      { stage: "習慣化", progressPercent: 71, clientCount: 18 },
      { stage: "深化", progressPercent: 48, clientCount: 12 },
      { stage: "自立", progressPercent: 31, clientCount: 8 },
    ],
    periodLabel: "直近 4 週（集計）",
    updatedAt: nowIso(),
  };
}

export function getDemoWeeklyReports(): WeeklyReportRecord[] {
  return [
    {
      id: "wr-2026-w30",
      weekLabel: "2026年第30週",
      weekStart: "2026-07-20",
      weekEnd: "2026-07-26",
      achievements: [
        "アクティブ認定講師が 14 名に到達（前週比 +1）",
        "週間分析件数 118 件 · フィードバック対応率 91%",
        "Journey 共有リンク要望を完了としてクローズ",
      ],
      challenges: [
        "招待コード受諾の Critical 不具合が未解決",
        "分析確認画面の入力消失（High）が修正中",
        "新規登録は増えているが Journey 深化ステージの進捗が停滞気味",
      ],
      improvementProposals: [
        "招待フローの回帰テストを週次ゲートに追加",
        "分析セッション復元の優先度を Product Backlog で上げる",
        "深化ステージ向け Homework テンプレを講師向けに配布",
      ],
      isMock: true,
      generatedAt: nowIso(),
    },
    {
      id: "wr-2026-w29",
      weekLabel: "2026年第29週",
      weekStart: "2026-07-13",
      weekEnd: "2026-07-19",
      achievements: [
        "Closed Beta Launch（2.7）のオンボーディング完了率が向上",
        "週間分析 101 件 · 新規クライアント 8 名",
      ],
      challenges: [
        "フィードバック優先度の運用ルールが講師側に浸透不足",
        "タブレット横向きのナビ操作性",
      ],
      improvementProposals: [
        "Onboarding 内でフィードバック優先度の説明を1ステップ追加",
        "AdminSubNav の折り返しルールを再設計",
      ],
      isMock: true,
      generatedAt: "2026-07-19T18:00:00.000Z",
    },
  ];
}

function seedProductBacklog(): ProductBacklogItem[] {
  const updatedAt = nowIso();
  return [
    {
      id: "pb-001",
      title: "招待受諾 500 の根治",
      summary: "Critical バグの再現手順固定と修正・回帰テスト。",
      status: "in_progress",
      priority: "critical",
      module: "Bug Tracker",
      sortOrder: 10,
      createdAt: "2026-07-23T04:00:00.000Z",
      updatedAt,
    },
    {
      id: "pb-002",
      title: "分析セッション復元",
      summary: "confirm → new 遷移時の入力保持。",
      status: "in_progress",
      priority: "high",
      module: "Bug Tracker",
      sortOrder: 20,
      createdAt: "2026-07-21T11:00:00.000Z",
      updatedAt,
    },
    {
      id: "pb-003",
      title: "比較ビュー強化",
      summary: "前回分析との差分グラフ（Feature Request 上位）。",
      status: "todo",
      priority: "high",
      module: "Feature Requests",
      sortOrder: 30,
      createdAt: "2026-07-18T10:00:00.000Z",
      updatedAt,
    },
    {
      id: "pb-004",
      title: "週次レポート自動配信",
      summary: "本部向け Closed Beta Report のメール配信（現状モック表示のみ）。",
      status: "todo",
      priority: "medium",
      module: "Weekly Report",
      sortOrder: 40,
      createdAt: "2026-07-20T09:00:00.000Z",
      updatedAt,
    },
    {
      id: "pb-005",
      title: "Journey 共有リンク",
      summary: "クライアント向け進捗サマリー URL。",
      status: "done",
      priority: "medium",
      module: "Feature Requests",
      sortOrder: 50,
      createdAt: "2026-07-10T09:00:00.000Z",
      updatedAt,
    },
    {
      id: "pb-006",
      title: "多言語 UI 調査",
      summary: "英語 UI のスコープ定義。Closed Beta 期間は保留。",
      status: "on_hold",
      priority: "low",
      module: "Product Backlog",
      sortOrder: 60,
      createdAt: "2026-07-12T09:00:00.000Z",
      updatedAt,
    },
  ];
}

function ensureSeeds() {
  if (!featureRequestsSeed) featureRequestsSeed = seedFeatureRequests();
  if (!bugReportsSeed) bugReportsSeed = seedBugReports();
  if (!backlogSeed) backlogSeed = seedProductBacklog();
}

export function listDemoFeatureRequests(): FeatureRequestRecord[] {
  ensureSeeds();
  return [...(featureRequestsSeed ?? [])].sort(
    (a, b) => b.voteCount - a.voteCount,
  );
}

export function listDemoBugReports(): BugReportRecord[] {
  ensureSeeds();
  const order: Record<BugReportRecord["severity"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...(bugReportsSeed ?? [])].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );
}

export function listDemoProductBacklog(): ProductBacklogItem[] {
  ensureSeeds();
  return [...(backlogSeed ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function updateDemoFeatureRequest(
  input: UpdateFeatureRequestInput,
): FeatureRequestRecord {
  ensureSeeds();
  const list = featureRequestsSeed ?? [];
  const index = list.findIndex((item) => item.id === input.id);
  if (index < 0) throw new Error("要望が見つかりません");
  const current = list[index];
  const next: FeatureRequestRecord = {
    ...current,
    status: (input.status ?? current.status) as FeatureRequestStatus,
    priority: input.priority ?? current.priority,
    plannedFor:
      input.plannedFor !== undefined ? input.plannedFor : current.plannedFor,
    voteCount:
      input.voteCount !== undefined ? input.voteCount : current.voteCount,
    updatedAt: nowIso(),
  };
  list[index] = next;
  featureRequestsSeed = list;
  return next;
}

export function updateDemoBugReport(
  input: UpdateBugReportInput,
): BugReportRecord {
  ensureSeeds();
  const list = bugReportsSeed ?? [];
  const index = list.findIndex((item) => item.id === input.id);
  if (index < 0) throw new Error("不具合が見つかりません");
  const current = list[index];
  const status = (input.status ?? current.status) as BugStatus;
  const next: BugReportRecord = {
    ...current,
    status,
    severity: input.severity ?? current.severity,
    resolvedAt:
      status === "resolved" ? current.resolvedAt ?? nowIso() : null,
    updatedAt: nowIso(),
  };
  list[index] = next;
  bugReportsSeed = list;
  return next;
}

export function updateDemoBacklogItem(
  input: UpdateBacklogItemInput,
): ProductBacklogItem {
  ensureSeeds();
  const list = backlogSeed ?? [];
  const index = list.findIndex((item) => item.id === input.id);
  if (index < 0) throw new Error("バックログ項目が見つかりません");
  const current = list[index];
  const next: ProductBacklogItem = {
    ...current,
    status: (input.status ?? current.status) as BacklogStatus,
    priority: input.priority ?? current.priority,
    updatedAt: nowIso(),
  };
  list[index] = next;
  backlogSeed = list;
  return next;
}

export function getDemoClosedBetaOperationBundle(): ClosedBetaOperationBundle {
  const kpi = getDemoBetaKpi();
  const featureRequests = listDemoFeatureRequests();
  const bugReports = listDemoBugReports();
  const outcomes = getDemoClientOutcomes();
  const weeklyReports = getDemoWeeklyReports();
  const productBacklog = listDemoProductBacklog();

  return {
    kpi,
    featureRequests,
    bugReports,
    outcomes,
    weeklyReports,
    productBacklog,
    readinessPercent: computeBetaOperationReadiness({
      hasKpi: kpi.activeCertifiedInstructors > 0,
      hasFeatureRequests: featureRequests.length > 0,
      hasBugTracker: bugReports.length > 0,
      hasOutcomes: outcomes.sampleSize > 0,
      hasWeeklyReport: weeklyReports.length > 0,
      hasBacklog: productBacklog.length > 0,
    }),
    betaPhaseLabel: CLOSED_BETA_OPERATION_PHASE_LABEL,
    appVersion: APP_VERSION || CLOSED_BETA_OPERATION_VERSION,
  };
}
