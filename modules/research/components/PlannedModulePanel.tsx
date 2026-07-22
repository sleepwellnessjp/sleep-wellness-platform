"use client";

import SectionCard from "@/design-system/Card";
import Badge from "@/design-system/Badge";
import { researchService } from "../services/research-service";

export default function PlannedModulePanel() {
  const overview = researchService.getOverview();
  return (
    <SectionCard eyebrow="MODULE" title={overview.title}>
      <div className="mb-4">
        <Badge tone="planned">PLANNED</Badge>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{overview.summary}</p>
      <ul className="mt-5 space-y-2 text-sm text-slate-700">
        {overview.nextSteps.map((step) => (
          <li key={step} className="flex gap-2">
            <span className="text-[#8a6a2d]">•</span>
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
