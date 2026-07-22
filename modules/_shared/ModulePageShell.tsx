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
    <OsShell contentClassName="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        {eyebrow}
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-[-0.04em]"
        style={{ color: NAVY }}
      >
        {title}
      </h1>
      <div className="mt-8">{children}</div>
    </OsShell>
  );
}
