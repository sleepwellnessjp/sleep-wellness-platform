import type { ModuleId, ModuleManifest } from "./types";

/**
 * Canonical Module Registry for Version 3.0.
 * Add a new feature = register here + create modules/<id>/ scaffold.
 */
export const MODULE_REGISTRY: readonly ModuleManifest[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "ロール別ホームと本日の業務サマリー",
    basePath: "/dashboard",
    status: "active",
    routes: ["/dashboard", "/admin", "/client", "/enterprise"],
  },
  {
    id: "clients",
    name: "Clients",
    description: "クライアント一覧・詳細・プロフィール管理",
    basePath: "/clients",
    status: "active",
    routes: ["/clients", "/clients/new", "/clients/[id]", "/clients/[id]/compare"],
  },
  {
    id: "analysis",
    name: "Analysis",
    description: "SOXAI 睡眠分析フローと結果表示",
    basePath: "/analysis",
    status: "active",
    routes: [
      "/analysis",
      "/analysis/new",
      "/analysis/confirm",
      "/analysis/loading",
      "/analysis/result",
    ],
  },
  {
    id: "ai",
    name: "AI",
    description: "Instructor Insight / Follow Alerts / 生成系AI",
    basePath: "/insights",
    status: "active",
    routes: ["/insights"],
  },
  {
    id: "sleep-coach",
    name: "Sleep Coach",
    description: "日次コーチ提案（ルールベース → GPT 差し替え可）",
    basePath: "/client",
    status: "active",
    routes: ["/client#sleep-coach"],
  },
  {
    id: "journey",
    name: "Journey",
    description: "Sleep Wellness Journey™ 改善の物語",
    basePath: "/journey",
    status: "active",
    routes: ["/journey", "/client#journey"],
  },
  {
    id: "homework",
    name: "Homework",
    description: "宿題の作成・提出・達成率",
    basePath: "/homework",
    status: "active",
    routes: ["/homework", "/client#homework", "/programs"],
  },
  {
    id: "academy",
    name: "Academy",
    description: "認定講座・テスト・証明書",
    basePath: "/academy",
    status: "active",
    routes: [
      "/academy",
      "/academy/learn/[lessonId]",
      "/academy/tests/[testId]",
      "/academy/certificates/[id]",
      "/admin/academy",
    ],
  },
  {
    id: "community",
    name: "Community",
    description: "ディスカッション・ナレッジ共有",
    basePath: "/community",
    status: "active",
    routes: ["/community", "/community/discussions/[id]", "/admin/community"],
  },
  {
    id: "insights",
    name: "Insights",
    description: "Sleep Wellness Intelligence（集計・匿名化）",
    basePath: "/insights",
    status: "active",
    routes: ["/insights", "/admin/insights"],
  },
  {
    id: "research",
    name: "Research",
    description: "研究・エビデンスライブラリ（今後独立）",
    basePath: "/portal/research",
    status: "planned",
    routes: ["/portal/research"],
  },
  {
    id: "retreat",
    name: "Retreat",
    description: "リトリートプログラム管理",
    basePath: "/portal/retreat",
    status: "planned",
    routes: ["/portal/retreat"],
  },
  {
    id: "events",
    name: "Events",
    description: "イベント・セミナー管理",
    basePath: "/events",
    status: "planned",
    routes: ["/events"],
  },
  {
    id: "companies",
    name: "Companies",
    description: "企業テナント・組織管理",
    basePath: "/companies",
    status: "planned",
    routes: ["/companies", "/enterprise"],
  },
  {
    id: "reports",
    name: "Reports",
    description: "PDF / 分析レポート出力",
    basePath: "/reports",
    status: "beta",
    routes: ["/reports"],
  },
  {
    id: "billing",
    name: "Billing",
    description: "クレジット・請求・プラン",
    basePath: "/billing",
    status: "planned",
    routes: ["/billing"],
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "OS 通知センターと配信ルール",
    basePath: "/notifications",
    status: "beta",
    routes: ["/notifications"],
  },
  {
    id: "settings",
    name: "Settings",
    description: "プロフィール・通知・セキュリティ設定",
    basePath: "/settings",
    status: "active",
    routes: ["/settings", "/admin/settings"],
  },
  {
    id: "developer",
    name: "Developer",
    description: "Sleep Wellness API Platform（API Key / Webhook / OpenAPI）",
    basePath: "/developer",
    status: "active",
    routes: [
      "/developer",
      "/developer/docs",
      "/developer/audit",
      "/api/v1",
      "/api/developer",
    ],
  },
] as const;

export function getModule(id: ModuleId): ModuleManifest | undefined {
  return MODULE_REGISTRY.find((m) => m.id === id);
}

export function listActiveModules(): ModuleManifest[] {
  return MODULE_REGISTRY.filter((m) => m.status === "active" || m.status === "beta");
}

export function listPlannedModules(): ModuleManifest[] {
  return MODULE_REGISTRY.filter((m) => m.status === "planned");
}
