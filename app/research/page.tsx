"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { PlannedModulePanel } from "@/modules/research";

export default function ResearchPage() {
  return (
    <ModulePageShell title="Research" eyebrow="RESEARCH">
      <PlannedModulePanel />
    </ModulePageShell>
  );
}
