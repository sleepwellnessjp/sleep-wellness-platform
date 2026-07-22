"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { PlannedModulePanel } from "@/modules/companies";

export default function CompaniesPage() {
  return (
    <ModulePageShell title="Companies" eyebrow="COMPANIES">
      <PlannedModulePanel />
    </ModulePageShell>
  );
}
