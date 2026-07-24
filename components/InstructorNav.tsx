"use client";

import OsNav from "@/components/os/OsNav";
import OsTopBar, { useResolvedOsRole } from "@/components/os/OsTopBar";
import { homePathForRole } from "@/lib/safe-redirect";

/**
 * Sleep Wellness OS chrome for instructor / admin surfaces.
 * Keeps the historic `InstructorNav` import path so existing pages pick up
 * search, notifications, settings, and role menus automatically.
 */
export default function InstructorNav({
  eyebrow = "INSTRUCTOR",
}: {
  eyebrow?: string;
}) {
  const role = useResolvedOsRole("instructor");
  const homeHref = homePathForRole(role);

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--sw-border)] bg-[color:var(--sw-card-bg)]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="sw-shell-pad mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:gap-3.5 sm:px-6 sm:py-3.5 md:px-8 md:py-4">
        <OsTopBar role={role} homeHref={homeHref} />
        <p className="sr-only">{eyebrow}</p>
        <OsNav role={role} />
      </div>
    </header>
  );
}
