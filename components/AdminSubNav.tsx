"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOCUS_RING, GOLD, NAVY } from "@/components/ui/tokens";
import type { OsRole } from "@/lib/os/roles";
import { isAdminOsRole, isSchoolOsRole } from "@/lib/os/roles";

type NavItem = {
  href: string;
  label: string;
  match: "exact" | "prefix";
  /** Founder(admin) / Super Admin のみ表示 */
  hqOnly?: boolean;
  /** 認定校にも表示 */
  schoolVisible?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "本部ダッシュボード", match: "exact", hqOnly: true },
  { href: "/admin/beta", label: "Closed Beta", match: "prefix", hqOnly: true },
  { href: "/admin/evidence", label: "実証データ", match: "prefix", hqOnly: true },
  { href: "/admin/roles", label: "権限管理", match: "prefix", hqOnly: true },
  {
    href: "/admin/certification",
    label: "認定講師管理",
    match: "prefix",
    hqOnly: true,
  },
  {
    href: "/admin/instructor-activities",
    label: "認定講師イベント管理",
    match: "prefix",
    hqOnly: true,
  },
  {
    href: "/admin/instructor-activity-schedules",
    label: "活動予定",
    match: "prefix",
    hqOnly: true,
  },
  {
    href: "/admin/sleep-content",
    label: "睡眠コンテンツ",
    match: "prefix",
    hqOnly: true,
  },
  {
    href: "/admin/schools",
    label: "認定校",
    match: "prefix",
    schoolVisible: true,
  },
  {
    href: "/admin/notifications",
    label: "通知センター",
    match: "prefix",
    hqOnly: true,
  },
  {
    href: "/admin/instructors",
    label: "認定講師一覧",
    match: "prefix",
    hqOnly: true,
  },
  {
    href: "/admin/instructor-accounts",
    label: "会員講師",
    match: "prefix",
    hqOnly: true,
  },
  {
    href: "/admin/credit-requests",
    label: "追加パック申請",
    match: "prefix",
    hqOnly: true,
  },
  { href: "/admin/clients", label: "クライアント", match: "prefix", hqOnly: true },
  { href: "/admin/ai", label: "AI Intelligence", match: "prefix", hqOnly: true },
  { href: "/admin/journey", label: "Journey", match: "prefix", hqOnly: true },
  { href: "/admin/academy", label: "Academy", match: "prefix", hqOnly: true },
  { href: "/admin/community", label: "Community", match: "prefix", hqOnly: true },
  { href: "/admin/insights", label: "Insights", match: "prefix", hqOnly: true },
  { href: "/admin/analytics", label: "分析統計", match: "prefix", hqOnly: true },
  {
    href: "/admin/feedback",
    label: "フィードバック",
    match: "prefix",
    hqOnly: true,
  },
  { href: "/admin/licenses", label: "ライセンス", match: "prefix", hqOnly: true },
  {
    href: "/admin/license",
    label: "課金ライセンス",
    match: "exact",
    schoolVisible: true,
  },
  {
    href: "/admin/subscriptions",
    label: "サブスク",
    match: "prefix",
    schoolVisible: true,
  },
  { href: "/admin/invitations", label: "招待", match: "prefix", hqOnly: true },
  { href: "/admin/audit", label: "監査ログ", match: "prefix", hqOnly: true },
  { href: "/developer", label: "Developer", match: "prefix", hqOnly: true },
  {
    href: "/admin/settings",
    label: "システム設定",
    match: "prefix",
    hqOnly: true,
  },
  { href: "/admin/logs", label: "ログ", match: "prefix", hqOnly: true },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemsForRole(role: OsRole): NavItem[] {
  if (isAdminOsRole(role)) return ITEMS;
  if (isSchoolOsRole(role)) {
    return ITEMS.filter((item) => item.schoolVisible);
  }
  return [];
}

export default function AdminSubNav({
  role = "admin",
}: {
  role?: OsRole;
}) {
  const pathname = usePathname() || "/admin";
  const items = itemsForRole(role);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="管理コンソール"
      className="sw-h-scroll mt-6 -mx-1 flex flex-nowrap gap-1.5 overflow-x-auto border-b border-[color:var(--sw-border-subtle)] px-1 pb-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sw-nav-link inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 py-2 text-[12px] font-semibold tracking-[-0.01em] transition duration-200 sm:min-h-9 sm:px-4 sm:text-[13px] ${FOCUS_RING} ${
              active
                ? "text-white"
                : "text-[color:var(--sw-muted)] hover:bg-[color:var(--sw-navy)]/[0.04] hover:text-[color:var(--sw-navy)]"
            }`}
            style={
              active
                ? {
                    backgroundColor:
                      active && item.href === "/admin" ? GOLD : NAVY,
                  }
                : undefined
            }
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
