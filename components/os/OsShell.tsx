"use client";

import type { ReactNode } from "react";
import InstructorBetaLaunchChrome from "@/components/beta/InstructorBetaLaunchChrome";
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
  const showBetaLaunch = role === "instructor";

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ backgroundColor: SURFACE }}
    >
      <header className="sticky top-0 z-40 border-b border-[color:var(--sw-border)] bg-[color:var(--sw-card-bg)]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="sw-shell-pad mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:gap-3.5 sm:px-6 sm:py-3.5 md:px-8 md:py-4">
          <OsTopBar role={role} homeHref={homeHref} />
          {eyebrow ? <p className="sr-only">{eyebrow}</p> : null}
          <OsNav role={role} extraItems={extraNavItems} />
        </div>
      </header>
      {children ? (
        <main
          id="main-content"
          tabIndex={-1}
          className={
            contentClassName
              ? `sw-shell-pad ${contentClassName}`
              : "sw-shell-pad mx-auto max-w-6xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14"
          }
        >
          {children}
        </main>
      ) : null}
      <InstructorBetaLaunchChrome enabled={showBetaLaunch} />
    </div>
  );
}
