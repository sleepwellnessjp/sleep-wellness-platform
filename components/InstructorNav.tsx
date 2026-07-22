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
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8">
        <OsTopBar role={role} homeHref={homeHref} />
        <p className="sr-only">{eyebrow}</p>
        <OsNav role={role} />
      </div>
    </header>
  );
}
