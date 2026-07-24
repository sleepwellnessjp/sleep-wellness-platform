/**
 * Version 2.4 Closed Beta — デモストア
 * Supabase 未設定時の本部ダッシュボード検証用。
 */

import { APP_VERSION } from "@/lib/app-version";
import {
  CLOSED_BETA_PHASE_LABEL,
  CLOSED_BETA_VERSION,
} from "./constants";
import type {
  BetaDashboardMetrics,
  ClosedBetaOpsBundle,
  ReleaseNoteRecord,
  RoadmapItemRecord,
  SystemHealthSnapshot,
  UsageAnalyticsSnapshot,
} from "./types";

const nowIso = () => new Date().toISOString();

export function getDemoBetaMetrics(): BetaDashboardMetrics {
  return {
    certifiedInstructorCount: 12,
    registeredClientCount: 48,
    analysisCount: 96,
    aiAnalysisCount: 64,
    reportCount: 41,
    journeyContinuationRate: 82,
    improvementRate: 64,
    homeworkCompletionRate: 71,
    feedbackCount: 9,
    bugCount: 3,
    periodLabel: "今週（週次集計）",
    updatedAt: nowIso(),
  };
}

export function getDemoSystemHealth(): SystemHealthSnapshot {
  const checkedAt = nowIso();
  return {
    overall: "operational",
    overallLabel: "システムは正常に稼働しています",
    utilizationPercent: 42,
    checkedAt,
    components: [
      {
        id: "server",
        label: "サーバー状態",
        status: "operational",
        detail: "Edge / App Router 応答正常（モック）",
        latencyMs: 48,
        updatedAt: checkedAt,
      },
      {
        id: "database",
        label: "DB接続",
        status: "operational",
        detail: "Supabase Postgres 接続プール健全",
        latencyMs: 22,
        updatedAt: checkedAt,
      },
      {
        id: "ai",
        label: "AI稼働",
        status: "operational",
        detail: "Sleep Coach / Instructor Assistant 待機中",
        latencyMs: 310,
        updatedAt: checkedAt,
      },
      {
        id: "api",
        label: "API状態",
        status: "operational",
        detail: "公開 API · 管理 API ともに 2xx 中心",
        latencyMs: 36,
        updatedAt: checkedAt,
      },
      {
        id: "utilization",
        label: "利用率",
        status: "operational",
        detail: "Closed Beta 想定キャパシティの 42%",
        latencyMs: null,
        updatedAt: checkedAt,
      },
    ],
  };
}

export function getDemoReleaseNotes(): ReleaseNoteRecord[] {
  return [
    {
      id: "rn-2-8-0",
      version: "2.8.0",
      releasedAt: "2026-07-24",
      title: "Closed Beta Operation",
      changes: [
        "Beta KPI Dashboard（講師・クライアント・分析・継続率・改善率・FB対応率・新規）",
        "Feature Requests / Bug Tracker / Client Outcomes",
        "Weekly Report（モック）· Product Backlog",
      ],
      improvements: [
        "SWIJ本部が PDCA 改善サイクルを回せる Closed Beta 運営基盤",
      ],
      isCurrent: true,
      sortOrder: 280,
    },
    {
      id: "rn-2-7-0",
      version: "2.7.0",
      releasedAt: "2026-07-24",
      title: "Closed Beta Launch",
      changes: [
        "認定講師招待（メールモック・コード・利用開始日・規約同意）",
        "初回オンボーディング 5 ステップ · Beta Agreement ゲート",
        "フィードバック優先度 Critical〜Low / 本部ステータス 受付〜完了",
        "週次 Beta Metrics（講師・分析・クライアント・継続率・改善率・バグ）",
      ],
      improvements: [
        "認定講師が安心して Closed Beta を開始できる状態へ整備",
      ],
      isCurrent: false,
      sortOrder: 270,
    },
    {
      id: "rn-2-6-0",
      version: "2.6.0",
      releasedAt: "2026-07-24",
      title: "Beta Freeze（運用開始）",
      changes: [
        "全画面に BETA バッジ · Version · フィードバック導線を固定表示",
        "重大エラー向けの分かりやすいセーフティ画面を整備",
      ],
      improvements: [
        "第1期・第2期認定講師の実カウンセリング利用に向けた最終調整",
        "リンク切れ確認 · エラー画面 · レスポンシブ確認を実施",
      ],
      isCurrent: false,
      sortOrder: 260,
    },
    {
      id: "rn-2-4-0",
      version: "2.4.0",
      releasedAt: "2026-07-24",
      title: "Closed Beta 運営モード",
      changes: [
        "SWIJ本部向け Beta Dashboard を追加",
        "Health Score · Usage Analytics · Roadmap を追加",
        "Release Notes 画面を追加",
      ],
      improvements: [
        "認定講師フィードバックに使いやすさ評価（5段階）と優先順位を追加",
        "第1期・第2期認定講師限定の正式運用コンソールを整備",
      ],
      isCurrent: false,
      sortOrder: 240,
    },
    {
      id: "rn-2-3-0",
      version: "2.3.0",
      releasedAt: "2026-07-24",
      title: "UI/UX ブラッシュアップ",
      changes: [
        "画面遷移・ローディング・Skeleton を刷新",
        "カード / ボタン / 余白を SWIJ ブランドに統一",
      ],
      improvements: [
        "スマホ・タブレットの操作性を向上",
        "アクセシビリティ（Skip link · focus-visible）を強化",
      ],
      isCurrent: false,
      sortOrder: 230,
    },
    {
      id: "rn-2-2-0",
      version: "2.2.0",
      releasedAt: "2026-07-24",
      title: "ライセンス・課金・権限",
      changes: [
        "RBAC · ライセンス · サブスク · 招待 · 監査ログ",
        "認定校ホームを追加",
      ],
      improvements: [
        "正式運用に向けた権限・課金基盤を整備",
      ],
      isCurrent: false,
      sortOrder: 220,
    },
    {
      id: "rn-2-1-0",
      version: "2.1.0",
      releasedAt: "2026-07-23",
      title: "SWIJ 運営システム",
      changes: [
        "認定講師・認定校管理",
        "本部 / 講師ダッシュボード KPI",
        "通知センター",
      ],
      improvements: [
        "Navy / Gold / White ブランド統一",
      ],
      isCurrent: false,
      sortOrder: 210,
    },
  ];
}

export function getDemoUsageAnalytics(): UsageAnalyticsSnapshot {
  return {
    topScreens: [
      { screen: "dashboard", label: "Dashboard", sessions: 1840, sharePercent: 22 },
      { screen: "clients", label: "Clients", sessions: 1620, sharePercent: 19 },
      { screen: "analysis", label: "Analysis", sessions: 1480, sharePercent: 18 },
      { screen: "journey", label: "Journey", sessions: 980, sharePercent: 12 },
      { screen: "homework", label: "Homework", sessions: 860, sharePercent: 10 },
      { screen: "reports", label: "Report", sessions: 720, sharePercent: 9 },
    ],
    averageSessionMinutes: 11.4,
    mobileSharePercent: 58,
    pcSharePercent: 36,
    tabletSharePercent: 6,
    dropOffPoints: [
      {
        screen: "analysis/confirm",
        label: "分析確認",
        dropOffPercent: 18,
      },
      {
        screen: "clients/new",
        label: "クライアント新規登録",
        dropOffPercent: 14,
      },
      {
        screen: "homework",
        label: "Homework 完了確認",
        dropOffPercent: 11,
      },
    ],
    periodLabel: "直近 14 日（モック）",
    isMock: true,
    updatedAt: nowIso(),
  };
}

export function getDemoRoadmap(): RoadmapItemRecord[] {
  return [
    {
      id: "rm-25-1",
      horizon: "v2_5",
      versionLabel: "Version 2.5",
      title: "運用フィードバック反映",
      summary: "Closed Beta の改善要望・不具合を優先度順に反映し、安定運用を強化します。",
      status: "planned",
      sortOrder: 10,
    },
    {
      id: "rm-25-2",
      horizon: "v2_5",
      versionLabel: "Version 2.5",
      title: "通知・リマインド精度向上",
      summary: "認定更新・Homework・フォロー予定の通知タイミングを最適化します。",
      status: "planned",
      sortOrder: 20,
    },
    {
      id: "rm-30-1",
      horizon: "v3_0",
      versionLabel: "Version 3.0",
      title: "Academy / Community 本番運用",
      summary: "教材配信・コミュニティ・イベントを本番トラフィック向けに拡張します。",
      status: "planned",
      sortOrder: 10,
    },
    {
      id: "rm-30-2",
      horizon: "v3_0",
      versionLabel: "Version 3.0",
      title: "Enterprise & Developer API",
      summary: "企業向けダッシュボードと外部連携 API を正式公開します。",
      status: "planned",
      sortOrder: 20,
    },
    {
      id: "rm-cs-1",
      horizon: "coming_soon",
      versionLabel: "Coming Soon",
      title: "ウェアラブル連携強化",
      summary: "SOXAI 以外のデバイス連携とリアルタイム同期を検討中です。",
      status: "deferred",
      sortOrder: 10,
    },
    {
      id: "rm-cs-2",
      horizon: "coming_soon",
      versionLabel: "Coming Soon",
      title: "多言語対応",
      summary: "英語 UI と海外認定校向けローカライズを準備します。",
      status: "deferred",
      sortOrder: 20,
    },
  ];
}

export function getDemoClosedBetaOpsBundle(): ClosedBetaOpsBundle {
  return {
    metrics: getDemoBetaMetrics(),
    health: getDemoSystemHealth(),
    releaseNotes: getDemoReleaseNotes(),
    usage: getDemoUsageAnalytics(),
    roadmap: getDemoRoadmap(),
    betaPhaseLabel: CLOSED_BETA_PHASE_LABEL,
    appVersion: APP_VERSION || CLOSED_BETA_VERSION,
  };
}
