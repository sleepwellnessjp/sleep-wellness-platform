"use client";

import type { ReactNode } from "react";
import OsShell from "@/components/os/OsShell";
import { GOLD, NAVY } from "@/design-system/tokens";

type Props = {
  children: ReactNode;
  title: string;
  eyebrow?: string;
};

/** Shared page chrome for module entry routes. */
export default function ModulePageShell({
  children,
  title,
  eyebrow = "MODULE",
}: Props) {
  return (
    <OsShell contentClassName="sw-shell-pad mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14">
      <p
        className="text-[10px] font-semibold tracking-[0.22em] sm:tracking-[0.28em]"
        style={{ color: GOLD }}
      >
        {eyebrow}
      </p>
      <h1
        className="mt-2 break-words text-[1.55rem] font-semibold tracking-[-0.04em] sm:text-[1.65rem] md:text-3xl"
        style={{ color: NAVY }}
      >
        {title}
      </h1>
      <div className="mt-6 w-full space-y-5 sm:mt-8 sm:space-y-6 md:space-y-8">
        {children}
      </div>
    </OsShell>
  );
}
