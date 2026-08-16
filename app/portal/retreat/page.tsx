"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { PlannedModulePanel } from "@/modules/retreat";

/** 認定講師向けリトリート管理（一般公開の /retreat とは別） */
export default function RetreatPortalPage() {
  return (
    <ModulePageShell title="Retreat" eyebrow="RETREAT">
      <PlannedModulePanel />
    </ModulePageShell>
  );
}
