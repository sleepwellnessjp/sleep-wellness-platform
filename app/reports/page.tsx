"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { PlannedModulePanel } from "@/modules/reports";

export default function ReportsPage() {
  return (
    <ModulePageShell title="Reports" eyebrow="REPORTS">
      <PlannedModulePanel />
    </ModulePageShell>
  );
}
