"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isNavItemActive,
  navItemsForRole,
  type OsNavItem,
} from "@/lib/os/navigation";
import type { OsRole } from "@/lib/os/roles";
import { GOLD, NAVY } from "@/components/ui/tokens";

export default function OsNav({
  role,
  extraItems = [],
}: {
  role: OsRole;
  extraItems?: OsNavItem[];
}) {
  const pathname = usePathname() || "/";
  const items = [...navItemsForRole(role), ...extraItems];

  return (
    <nav
      aria-label="Sleep Wellness OS メニュー"
      className="flex flex-wrap items-center gap-1.5 sm:gap-2"
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, item);
        const accent = item.href.startsWith("/admin") && active ? GOLD : NAVY;
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={`rounded-2xl px-3.5 py-2 text-[12px] font-semibold tracking-[-0.01em] transition sm:px-4 sm:text-[13px] ${
              active
                ? "text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-[#071426]"
            }`}
            style={active ? { backgroundColor: accent } : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
