"use client";

import type { ReactNode } from "react";
import AdminSubNav from "@/components/AdminSubNav";
import OsNav from "@/components/os/OsNav";
import OsTopBar from "@/components/os/OsTopBar";
import { GOLD, NAVY, SURFACE } from "@/components/ui/tokens";

export default function AdminShell({
  eyebrow = "SLEEP WELLNESS INSTITUTE JAPAN",
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="sticky top-0 z-40 border-b border-[color:var(--sw-border)] bg-[color:var(--sw-card-bg)]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="sw-shell-pad mx-auto flex max-w-6xl flex-col gap-3.5 px-4 py-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4">
          <OsTopBar role="admin" homeHref="/admin" />
          <OsNav role="admin" />
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="sw-shell-pad mx-auto max-w-6xl px-4 py-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14"
      >
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold tracking-[0.22em] sm:text-[11px] sm:tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              {eyebrow}
            </p>
            <h1
              className="mt-2.5 break-words text-[1.65rem] font-semibold tracking-[-0.05em] sm:mt-3 sm:text-[1.85rem] md:text-4xl"
              style={{ color: NAVY }}
            >
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-[color:var(--sw-muted)] sm:text-[15px]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              {actions}
            </div>
          ) : null}
        </header>
        <AdminSubNav />
        <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6 md:space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
