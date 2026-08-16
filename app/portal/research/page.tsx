"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { PlannedModulePanel } from "@/modules/research";

/** 認定講師向け研究モジュール（一般公開の /research とは別） */
export default function ResearchPortalPage() {
  return (
    <ModulePageShell title="Research" eyebrow="RESEARCH">
      <PlannedModulePanel />
    </ModulePageShell>
  );
}
