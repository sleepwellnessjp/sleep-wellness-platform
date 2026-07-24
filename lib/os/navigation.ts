import type { OsRole } from "@/lib/os/roles";
import { isAdminOsRole, isSchoolOsRole } from "@/lib/os/roles";

export type OsNavItem = {
  href: string;
  label: string;
  match: string;
};

export type OsHomeModule = {
  id: string;
  title: string;
  description: string;
  href: string;
  eyebrow: string;
};

const ADMIN_NAV: OsNavItem[] = [
  { href: "/admin", label: "本部", match: "/admin-exact" },
  { href: "/admin/beta", label: "Closed Beta", match: "/admin/beta" },
  { href: "/admin/evidence", label: "実証データ", match: "/admin/evidence" },
  { href: "/admin/roles", label: "権限", match: "/admin/roles" },
  { href: "/admin/certification", label: "認定講師", match: "/admin/certification" },
  { href: "/admin/schools", label: "認定校", match: "/admin/schools" },
  { href: "/admin/license", label: "License", match: "/admin/license" },
  { href: "/admin/subscriptions", label: "課金", match: "/admin/subscriptions" },
  { href: "/admin/audit", label: "監査", match: "/admin/audit" },
  { href: "/admin/settings", label: "System", match: "/admin/settings" },
];

/** Version 2.2 — 認定校ナビゲーション */
const SCHOOL_NAV: OsNavItem[] = [
  { href: "/school", label: "校ダッシュボード", match: "/school" },
  { href: "/admin/schools", label: "校情報", match: "/admin/schools" },
  { href: "/billing", label: "プラン", match: "/billing" },
  { href: "/notifications", label: "通知", match: "/notifications" },
  { href: "/settings", label: "設定", match: "/settings" },
];

/** Version 2.2 — primary instructor navigation */
const INSTRUCTOR_NAV: OsNavItem[] = [
  { href: "/dashboard", label: "Dashboard", match: "/dashboard" },
  { href: "/clients", label: "Clients", match: "/clients" },
  { href: "/analysis/new", label: "Analysis", match: "/analysis" },
  { href: "/journey", label: "Journey", match: "/journey" },
  { href: "/homework", label: "Homework", match: "/homework" },
  { href: "/invitations", label: "招待", match: "/invitations" },
  { href: "/notifications", label: "通知", match: "/notifications" },
  { href: "/knowledge", label: "Knowledge", match: "/knowledge" },
  { href: "/reports", label: "Report", match: "/reports" },
  { href: "/feedback", label: "Feedback", match: "/feedback" },
  { href: "/license", label: "License", match: "/license" },
  { href: "/billing", label: "プラン", match: "/billing" },
];

const CLIENT_NAV: OsNavItem[] = [
  { href: "/client", label: "Home", match: "/client-exact" },
  { href: "/client/morning", label: "翌朝", match: "/client/morning" },
  { href: "/client/sleep", label: "Sleep", match: "/client/sleep" },
  { href: "/client/coach", label: "Coach", match: "/client/coach" },
  { href: "/client/advice", label: "Advice", match: "/client/advice" },
  { href: "/client/homework", label: "Homework", match: "/client/homework" },
  { href: "/client/journey", label: "Journey", match: "/client/journey" },
  { href: "/client/reports", label: "Report", match: "/client/reports" },
  { href: "/client/chat", label: "Chat", match: "/client/chat" },
  { href: "/client/goals", label: "Goals", match: "/client/goals" },
];

const ENTERPRISE_NAV: OsNavItem[] = [
  { href: "/enterprise", label: "Home", match: "/enterprise" },
  { href: "/enterprise#departments", label: "部署比較", match: "/enterprise#departments" },
  { href: "/community", label: "Community", match: "/community" },
  { href: "/settings", label: "設定", match: "/settings" },
];

export function navItemsForRole(role: OsRole): OsNavItem[] {
  if (isAdminOsRole(role)) return ADMIN_NAV;
  if (isSchoolOsRole(role)) return SCHOOL_NAV;
  if (role === "client") return CLIENT_NAV;
  if (role === "enterprise") return ENTERPRISE_NAV;
  return INSTRUCTOR_NAV;
}

export function homeModulesForRole(role: OsRole): OsHomeModule[] {
  if (isAdminOsRole(role)) {
    return [
      {
        id: "hq",
        eyebrow: "HQ",
        title: "本部ダッシュボード",
        description: "全国認定講師・認定校・改善・イベントを把握します。",
        href: "/admin",
      },
      {
        id: "closed-beta",
        eyebrow: "CLOSED BETA",
        title: "Closed Beta 運営",
        description: "KPI・要望・不具合・成果・週次レポート・バックログで PDCA。",
        href: "/admin/beta",
      },
      {
        id: "evidence",
        eyebrow: "EVIDENCE",
        title: "実証データ収集",
        description: "セッション／翌朝アンケートの匿名集計（改善率・満足度・継続率）。",
        href: "/admin/evidence",
      },
      {
        id: "certification",
        eyebrow: "OPS",
        title: "認定講師管理",
        description: "レベル・更新・停止・退会を運営します。",
        href: "/admin/certification",
      },
      {
        id: "schools",
        eyebrow: "SCHOOLS",
        title: "認定校管理",
        description: "所属講師・受講生・講座・修了率を確認します。",
        href: "/admin/schools",
      },
      {
        id: "notifications",
        eyebrow: "NOTIFY",
        title: "通知センター",
        description: "本部お知らせ・更新・イベント・教材・AI通知。",
        href: "/admin/notifications",
      },
      {
        id: "ai",
        eyebrow: "AI",
        title: "AI Intelligence",
        description: "SWIJ横断AI・Research・Knowledgeを確認します。",
        href: "/admin/ai",
      },
      {
        id: "academy",
        eyebrow: "ACADEMY",
        title: "Academy",
        description: "資格・学習・更新状況を管理します。",
        href: "/admin/academy",
      },
      {
        id: "community",
        eyebrow: "COMMUNITY",
        title: "Community",
        description: "告知・議論・イベントを運営します。",
        href: "/admin/community",
      },
      {
        id: "roles",
        eyebrow: "RBAC",
        title: "権限管理",
        description: "SWIJ本部・認定校・認定講師・クライアントの権限を確認します。",
        href: "/admin/roles",
      },
      {
        id: "license",
        eyebrow: "LICENSE",
        title: "ライセンス",
        description: "発行・更新・停止・証明書を管理します。",
        href: "/admin/license",
      },
      {
        id: "subscriptions",
        eyebrow: "BILLING",
        title: "サブスクリプション",
        description: "Basic / Professional / Enterprise（モック）。",
        href: "/admin/subscriptions",
      },
      {
        id: "audit",
        eyebrow: "AUDIT",
        title: "監査ログ",
        description: "ログイン・分析・レポート・ライセンス更新を追跡します。",
        href: "/admin/audit",
      },
      {
        id: "settings",
        eyebrow: "SYSTEM",
        title: "システム設定",
        description: "ブランド・連絡先・規約を管理します。",
        href: "/admin/settings",
      },
    ];
  }

  if (role === "school") {
    return [
      {
        id: "school",
        eyebrow: "SCHOOL",
        title: "認定校ダッシュボード",
        description: "所属講師・受講状況・プランを確認します。",
        href: "/school",
      },
      {
        id: "billing",
        eyebrow: "PLAN",
        title: "プラン",
        description: "認定校向けプラン（モック）を確認します。",
        href: "/billing",
      },
    ];
  }

  if (role === "instructor") {
    return [
      {
        id: "dashboard",
        eyebrow: "DASHBOARD",
        title: "Dashboard",
        description: "今日の担当と今週の予定を把握します。",
        href: "/dashboard",
      },
      {
        id: "clients",
        eyebrow: "CLIENTS",
        title: "Clients",
        description: "担当クライアント一覧へ移動します。",
        href: "/clients",
      },
      {
        id: "analysis",
        eyebrow: "ANALYSIS",
        title: "Analysis",
        description: "睡眠分析ワークスペースを開きます。",
        href: "/analysis/new",
      },
      {
        id: "journey",
        eyebrow: "JOURNEY",
        title: "Journey",
        description: "Sleep Journey の進捗を確認します。",
        href: "/journey",
      },
      {
        id: "homework",
        eyebrow: "HOMEWORK",
        title: "Homework",
        description: "宿題とフォローアップを管理します。",
        href: "/homework",
      },
      {
        id: "notifications",
        eyebrow: "NOTIFY",
        title: "通知センター",
        description: "本部お知らせ・認定更新・イベント・教材・AI。",
        href: "/notifications",
      },
      {
        id: "knowledge",
        eyebrow: "KNOWLEDGE",
        title: "Knowledge",
        description: "Sleep Wellness Method と認定テキストを検索。",
        href: "/knowledge",
      },
      {
        id: "reports",
        eyebrow: "REPORT",
        title: "Report",
        description: "分析レポート一覧を確認します。",
        href: "/reports",
      },
      {
        id: "feedback",
        eyebrow: "CLOSED BETA",
        title: "Beta フィードバック",
        description: "改善要望・不具合・新機能提案・使いやすさ評価を送信。",
        href: "/feedback",
      },
      {
        id: "invitations",
        eyebrow: "INVITE",
        title: "クライアント招待",
        description: "招待メールと招待コードを発行します。",
        href: "/invitations",
      },
      {
        id: "license",
        eyebrow: "LICENSE",
        title: "License",
        description: "ライセンス状況と更新期限を確認します。",
        href: "/license",
      },
      {
        id: "billing",
        eyebrow: "PLAN",
        title: "プラン",
        description: "Basic / Professional / Enterprise（モック）。",
        href: "/billing",
      },
    ];
  }

  if (role === "client") {
    return [
      {
        id: "home",
        eyebrow: "HOME",
        title: "Client Home",
        description: "今日のスコアと目標を確認します。",
        href: "/client",
      },
      {
        id: "morning",
        eyebrow: "EVIDENCE",
        title: "翌朝アンケート",
        description: "睡眠満足度・起床時気分・日中の調子（実証データ）。",
        href: "/client/morning",
      },
      {
        id: "sleep",
        eyebrow: "SLEEP",
        title: "Sleep Record",
        description: "睡眠指標と推移グラフ。",
        href: "/client/sleep",
      },
      {
        id: "coach",
        eyebrow: "COACH",
        title: "Sleep Coach",
        description: "今朝のコンディションとおすすめ行動。",
        href: "/client/coach",
      },
      {
        id: "advice",
        eyebrow: "ADVICE",
        title: "Today's Advice",
        description: "AIによる今日のアドバイス。",
        href: "/client/advice",
      },
      {
        id: "homework",
        eyebrow: "HOMEWORK",
        title: "Homework",
        description: "認定講師からの宿題。",
        href: "/client/homework",
      },
      {
        id: "journey",
        eyebrow: "JOURNEY",
        title: "Journey",
        description: "改善記録と講師コメント。",
        href: "/client/journey",
      },
      {
        id: "reports",
        eyebrow: "REPORT",
        title: "Report",
        description: "改善レポートの閲覧。",
        href: "/client/reports",
      },
      {
        id: "chat",
        eyebrow: "CHAT",
        title: "Chat",
        description: "認定講師とのメッセージ。",
        href: "/client/chat",
      },
      {
        id: "goals",
        eyebrow: "GOALS",
        title: "Goals",
        description: "睡眠改善目標と達成率。",
        href: "/client/goals",
      },
    ];
  }

  return [
    {
      id: "employees",
      eyebrow: "ORG",
      title: "社員数",
      description: "対象社員の登録状況。",
      href: "/enterprise#employees",
    },
    {
      id: "coverage",
      eyebrow: "COVERAGE",
      title: "分析実施率",
      description: "分析を受けた社員の割合。",
      href: "/enterprise#coverage",
    },
    {
      id: "score",
      eyebrow: "SCORE",
      title: "平均Score",
      description: "組織全体の平均 Sleep Wellness Score。",
      href: "/enterprise#score",
    },
    {
      id: "improvement",
      eyebrow: "IMPROVEMENT",
      title: "改善率",
      description: "前回比で改善した社員の割合。",
      href: "/enterprise#improvement",
    },
    {
      id: "departments",
      eyebrow: "DEPARTMENTS",
      title: "部署比較",
      description: "部署ごとのスコアと実施状況。",
      href: "/enterprise#departments",
    },
  ];
}

export function isNavItemActive(pathname: string, item: OsNavItem): boolean {
  if (item.match === "/admin-exact") {
    return pathname === "/admin";
  }
  if (item.match === "/client-exact") {
    return pathname === "/client";
  }
  if (item.match === "/client/morning") {
    return (
      pathname === "/client/morning" ||
      pathname.startsWith("/client/morning/")
    );
  }
  if (item.match === "/client/sleep") {
    return pathname === "/client/sleep" || pathname.startsWith("/client/sleep/");
  }
  if (item.match === "/client/advice") {
    return (
      pathname === "/client/advice" || pathname.startsWith("/client/advice/")
    );
  }
  if (item.match === "/client/coach") {
    return (
      pathname === "/client/coach" || pathname.startsWith("/client/coach/")
    );
  }
  if (item.match === "/client/homework") {
    return (
      pathname === "/client/homework" ||
      pathname.startsWith("/client/homework/")
    );
  }
  if (item.match === "/client/journey") {
    return (
      pathname === "/client/journey" || pathname.startsWith("/client/journey/")
    );
  }
  if (item.match === "/client/reports") {
    return (
      pathname === "/client/reports" || pathname.startsWith("/client/reports/")
    );
  }
  if (item.match === "/client/chat") {
    return pathname === "/client/chat" || pathname.startsWith("/client/chat/");
  }
  if (item.match === "/client/goals") {
    return pathname === "/client/goals" || pathname.startsWith("/client/goals/");
  }
  if (item.match === "/clients") {
    return pathname === "/clients" || pathname.startsWith("/clients/");
  }
  if (item.match === "/programs") {
    return pathname === "/programs" || pathname.startsWith("/programs/");
  }
  if (item.match === "/analysis") {
    return pathname === "/analysis" || pathname.startsWith("/analysis/");
  }
  if (item.match === "/journey") {
    return pathname === "/journey" || pathname.startsWith("/journey/");
  }
  if (item.match === "/homework") {
    return pathname === "/homework" || pathname.startsWith("/homework/");
  }
  if (item.match === "/reports") {
    return pathname === "/reports" || pathname.startsWith("/reports/");
  }
  if (item.match === "/knowledge") {
    return pathname === "/knowledge" || pathname.startsWith("/knowledge/");
  }
  if (item.match === "/vision") {
    return pathname === "/vision" || pathname.startsWith("/vision/");
  }
  if (item.match === "/invitations") {
    return pathname === "/invitations" || pathname.startsWith("/invitations/");
  }
  if (item.match === "/billing") {
    return pathname === "/billing" || pathname.startsWith("/billing/");
  }
  if (item.match === "/license") {
    return pathname === "/license" || pathname.startsWith("/license/");
  }
  if (item.match === "/school") {
    return pathname === "/school" || pathname.startsWith("/school/");
  }
  if (item.match.includes("#")) {
    const base = item.match.split("#")[0] ?? item.match;
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
