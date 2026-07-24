"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isNavItemActive,
  navItemsForRole,
  type OsNavItem,
} from "@/lib/os/navigation";
import type { OsRole } from "@/lib/os/roles";
import { FOCUS_RING, GOLD, NAVY } from "@/components/ui/tokens";

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
      className="sw-h-scroll -mx-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, item);
        const accent = item.href.startsWith("/admin") && active ? GOLD : NAVY;
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={`sw-nav-link inline-flex min-h-11 shrink-0 items-center rounded-2xl px-3.5 py-2.5 text-[12px] font-semibold tracking-[-0.01em] transition duration-200 active:opacity-90 sm:min-h-10 sm:px-3.5 sm:py-2 md:min-h-0 lg:px-4 lg:text-[13px] ${FOCUS_RING} ${
              active
                ? "text-white"
                : "text-[color:var(--sw-muted)] sm:hover:bg-[color:var(--sw-navy)]/[0.04] sm:hover:text-[color:var(--sw-navy)]"
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
