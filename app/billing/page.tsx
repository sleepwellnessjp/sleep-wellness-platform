"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { PlannedModulePanel } from "@/modules/billing";

export default function BillingPage() {
  return (
    <ModulePageShell title="Billing" eyebrow="BILLING">
      <PlannedModulePanel />
    </ModulePageShell>
  );
}
