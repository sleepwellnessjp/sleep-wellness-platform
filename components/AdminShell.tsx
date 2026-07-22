"use client";

import type { ReactNode } from "react";
import AdminSubNav from "@/components/AdminSubNav";
import OsNav from "@/components/os/OsNav";
import OsTopBar from "@/components/os/OsTopBar";
import { GOLD, NAVY, SURFACE } from "@/components/ui/tokens";

export default function AdminShell({
  eyebrow = "MANAGEMENT CONSOLE",
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
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8">
          <OsTopBar role="admin" homeHref="/admin" />
          <OsNav role="admin" />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              {eyebrow}
            </p>
            <h1
              className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
              style={{ color: NAVY }}
            >
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
        <AdminSubNav />
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
