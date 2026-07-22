"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GOLD, NAVY } from "@/components/ui/tokens";

const ITEMS = [
  { href: "/admin", label: "ダッシュボード", match: "exact" as const },
  { href: "/admin/instructors", label: "認定講師", match: "prefix" as const },
  { href: "/admin/clients", label: "クライアント", match: "prefix" as const },
  { href: "/admin/academy", label: "Academy", match: "prefix" as const },
  { href: "/admin/community", label: "Community", match: "prefix" as const },
  { href: "/admin/insights", label: "Insights", match: "prefix" as const },
  { href: "/admin/analytics", label: "分析統計", match: "prefix" as const },
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
      className="mt-6 flex flex-wrap gap-1.5 border-b border-slate-200/80 pb-4"
    >
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href, item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3.5 py-2 text-[12px] font-semibold tracking-[-0.01em] transition sm:px-4 sm:text-[13px] ${
              active
                ? "text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-[#071426]"
            }`}
            style={active ? { backgroundColor: active && item.href === "/admin" ? GOLD : NAVY } : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
