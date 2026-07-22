import type { OsRole } from "@/lib/os/roles";
import { isAdminOsRole } from "@/lib/os/roles";

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
  { href: "/admin", label: "Home", match: "/admin-exact" },
  { href: "/admin/insights", label: "SWIJ Dashboard", match: "/admin/insights" },
  { href: "/admin/academy", label: "Academy", match: "/admin/academy" },
  { href: "/insights", label: "Insights", match: "/insights" },
  { href: "/community?tab=knowledge", label: "Research", match: "/community" },
  { href: "/admin/community", label: "Community", match: "/admin/community" },
  { href: "/developer", label: "Developer", match: "/developer" },
  { href: "/admin/settings", label: "System", match: "/admin/settings" },
];

const INSTRUCTOR_NAV: OsNavItem[] = [
  { href: "/dashboard", label: "Home", match: "/dashboard" },
  { href: "/clients", label: "クライアント", match: "/clients" },
  { href: "/programs", label: "プログラム", match: "/programs" },
  { href: "/academy", label: "Academy", match: "/academy" },
  { href: "/community", label: "Community", match: "/community" },
  { href: "/insights", label: "Insights", match: "/insights" },
  { href: "/analysis/new", label: "新規分析", match: "/analysis" },
  { href: "/portal", label: "ポータル", match: "/portal" },
];

const CLIENT_NAV: OsNavItem[] = [
  { href: "/client", label: "Home", match: "/client-exact" },
  { href: "/client#sleep-coach", label: "Sleep Coach", match: "/client#sleep-coach" },
  { href: "/client#journey", label: "Journey", match: "/client#journey" },
  { href: "/client#mission", label: "Today's Mission", match: "/client#mission" },
  { href: "/client#homework", label: "宿題", match: "/client#homework" },
  { href: "/client#history", label: "分析履歴", match: "/client#history" },
  { href: "/client#yoga", label: "メラトニンヨガ™", match: "/client#yoga" },
];

const ENTERPRISE_NAV: OsNavItem[] = [
  { href: "/enterprise", label: "Home", match: "/enterprise" },
  { href: "/enterprise#departments", label: "部署比較", match: "/enterprise#departments" },
  { href: "/community", label: "Community", match: "/community" },
  { href: "/settings", label: "設定", match: "/settings" },
];

export function navItemsForRole(role: OsRole): OsNavItem[] {
  if (isAdminOsRole(role)) return ADMIN_NAV;
  if (role === "client") return CLIENT_NAV;
  if (role === "enterprise") return ENTERPRISE_NAV;
  return INSTRUCTOR_NAV;
}

export function homeModulesForRole(role: OsRole): OsHomeModule[] {
  if (isAdminOsRole(role)) {
    return [
      {
        id: "swij",
        eyebrow: "SWIJ",
        title: "SWIJ Dashboard",
        description: "プラットフォーム全体のKPI・運営状況を把握します。",
        href: "/admin",
      },
      {
        id: "academy",
        eyebrow: "ACADEMY",
        title: "Academy",
        description: "資格・学習・更新状況を管理します。",
        href: "/admin/academy",
      },
      {
        id: "insights",
        eyebrow: "INSIGHTS",
        title: "Insights",
        description: "匿名集計による全体傾向と改善ランキング。",
        href: "/admin/insights",
      },
      {
        id: "research",
        eyebrow: "RESEARCH",
        title: "Research",
        description: "研究・ナレッジ資産を参照します。",
        href: "/community?tab=knowledge",
      },
      {
        id: "community",
        eyebrow: "COMMUNITY",
        title: "Community",
        description: "告知・議論・イベントを運営します。",
        href: "/admin/community",
      },
      {
        id: "developer",
        eyebrow: "DEVELOPER",
        title: "Developer",
        description: "API Key・Webhook・OpenAPI で外部連携を管理。",
        href: "/developer",
      },
      {
        id: "system",
        eyebrow: "SYSTEM",
        title: "System",
        description: "ブランド・通知・ログなどシステム設定。",
        href: "/admin/settings",
      },
    ];
  }

  if (role === "instructor") {
    return [
      {
        id: "appointments",
        eyebrow: "SCHEDULE",
        title: "今日の予約",
        description: "本日のセッション予定を確認します。",
        href: "/dashboard#appointments",
      },
      {
        id: "homework",
        eyebrow: "HOMEWORK",
        title: "今日の宿題確認",
        description: "期限が近い宿題の提出状況を確認します。",
        href: "/dashboard#homework",
      },
      {
        id: "insight",
        eyebrow: "AI INSIGHT",
        title: "AI Instructor Insight",
        description: "カウンセリング前のAIインサイト。",
        href: "/dashboard#insight",
      },
      {
        id: "clients",
        eyebrow: "CLIENTS",
        title: "担当クライアント",
        description: "担当クライアント一覧へ移動します。",
        href: "/clients",
      },
      {
        id: "academy",
        eyebrow: "ACADEMY",
        title: "Academy",
        description: "学習・試験・資格更新。",
        href: "/academy",
      },
      {
        id: "community",
        eyebrow: "COMMUNITY",
        title: "Community",
        description: "事例共有・イベント・メッセージ。",
        href: "/community",
      },
    ];
  }

  if (role === "client") {
    return [
      {
        id: "coach",
        eyebrow: "COACH",
        title: "Sleep Coach",
        description: "今日のフォーカスとアクション。",
        href: "/client#sleep-coach",
      },
      {
        id: "journey",
        eyebrow: "JOURNEY",
        title: "Journey",
        description: "改善の物語を振り返ります。",
        href: "/client#journey",
      },
      {
        id: "mission",
        eyebrow: "MISSION",
        title: "Today's Mission",
        description: "今日やるべきミッション。",
        href: "/client#mission",
      },
      {
        id: "homework",
        eyebrow: "HOMEWORK",
        title: "宿題",
        description: "講師から出された宿題。",
        href: "/client#homework",
      },
      {
        id: "history",
        eyebrow: "HISTORY",
        title: "分析履歴",
        description: "これまでの睡眠分析結果。",
        href: "/client#history",
      },
      {
        id: "yoga",
        eyebrow: "YOGA",
        title: "メラトニンヨガ™",
        description: "今日のヨガ実践。",
        href: "/client#yoga",
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
  if (item.match === "/clients") {
    return pathname === "/clients" || pathname.startsWith("/clients/");
  }
  if (item.match === "/programs") {
    return pathname === "/programs" || pathname.startsWith("/programs/");
  }
  if (item.match === "/analysis") {
    return pathname.startsWith("/analysis");
  }
  if (item.match.includes("#")) {
    const base = item.match.split("#")[0] ?? item.match;
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}
