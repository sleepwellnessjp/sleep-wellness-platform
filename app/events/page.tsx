"use client";

import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { PlannedModulePanel } from "@/modules/events";

export default function EventsPage() {
  return (
    <ModulePageShell title="Events" eyebrow="EVENTS">
      <PlannedModulePanel />
    </ModulePageShell>
  );
}
