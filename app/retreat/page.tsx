"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { PlannedModulePanel } from "@/modules/retreat";

export default function RetreatPage() {
  return (
    <ModulePageShell title="Retreat" eyebrow="RETREAT">
      <PlannedModulePanel />
    </ModulePageShell>
  );
}
