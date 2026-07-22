"use client";

import type { ReactNode } from "react";
import OsNav from "@/components/os/OsNav";
import OsTopBar, { useResolvedOsRole } from "@/components/os/OsTopBar";
import type { OsNavItem } from "@/lib/os/navigation";
import type { OsRole } from "@/lib/os/roles";
import { homePathForRole } from "@/lib/safe-redirect";
import { SURFACE } from "@/components/ui/tokens";

export default function OsShell({
  role: roleProp,
  eyebrow,
  extraNavItems,
  children,
  contentClassName,
}: {
  role?: OsRole;
  eyebrow?: string;
  extraNavItems?: OsNavItem[];
  children?: ReactNode;
  contentClassName?: string;
}) {
  const resolved = useResolvedOsRole(roleProp ?? "instructor");
  const role = roleProp ?? resolved;
  const homeHref = homePathForRole(role);

  return (
    <div className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8">
          <OsTopBar role={role} homeHref={homeHref} />
          {eyebrow ? (
            <p className="sr-only">{eyebrow}</p>
          ) : null}
          <OsNav role={role} extraItems={extraNavItems} />
        </div>
      </header>
      {children ? (
        <div className={contentClassName ?? "mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14"}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
