"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOCUS_RING, GOLD, NAVY } from "@/components/ui/tokens";

const ITEMS = [
  { href: "/admin", label: "本部ダッシュボード", match: "exact" as const },
  { href: "/admin/beta", label: "Closed Beta", match: "prefix" as const },
  { href: "/admin/evidence", label: "実証データ", match: "prefix" as const },
  { href: "/admin/roles", label: "権限管理", match: "prefix" as const },
  { href: "/admin/certification", label: "認定講師管理", match: "prefix" as const },
  { href: "/admin/schools", label: "認定校", match: "prefix" as const },
  { href: "/admin/notifications", label: "通知センター", match: "prefix" as const },
  { href: "/admin/instructors", label: "講師一覧", match: "prefix" as const },
  { href: "/admin/clients", label: "クライアント", match: "prefix" as const },
  { href: "/admin/ai", label: "AI Intelligence", match: "prefix" as const },
  { href: "/admin/journey", label: "Journey", match: "prefix" as const },
  { href: "/admin/academy", label: "Academy", match: "prefix" as const },
  { href: "/admin/community", label: "Community", match: "prefix" as const },
  { href: "/admin/insights", label: "Insights", match: "prefix" as const },
  { href: "/admin/analytics", label: "分析統計", match: "prefix" as const },
  { href: "/admin/feedback", label: "フィードバック", match: "prefix" as const },
  { href: "/admin/license", label: "ライセンス", match: "prefix" as const },
  { href: "/admin/subscriptions", label: "サブスク", match: "prefix" as const },
  { href: "/admin/invitations", label: "招待", match: "prefix" as const },
  { href: "/admin/audit", label: "監査ログ", match: "prefix" as const },
  { href: "/developer", label: "Developer", match: "prefix" as const },
  { href: "/admin/settings", label: "システム設定", match: "prefix" as const },
  { href: "/admin/logs", label: "ログ", match: "prefix" as const },
] as const;

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSubNav() {
  const pathname = usePathname() || "/admin";

  return (
    <nav
      aria-label="管理コンソール"
      className="sw-h-scroll mt-6 -mx-1 flex flex-nowrap gap-1.5 overflow-x-auto border-b border-[color:var(--sw-border-subtle)] px-1 pb-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {ITEMS.map((item) => {
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
