"use client";

import Link from "next/link";
import KnowledgeBaseSearch from "@/components/ai-intelligence/KnowledgeBaseSearch";
import ModulePageShell from "@/modules/_shared/ModulePageShell";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { AI_INTELLIGENCE_ROUTES } from "@/lib/ai-intelligence";

export default function KnowledgePage() {
  return (
    <ModulePageShell
      eyebrow="KNOWLEDGE BASE"
      title="Sleep Wellness Knowledge"
    >
      <p className="mb-5 text-[14px] leading-7 text-slate-600">
        Sleep Wellness Method・メラトニンヨガ™・睡眠科学・認定テキスト・研究論文を
        AI が検索します。
      </p>
      <div className="mb-6 flex flex-wrap gap-3 text-[13px]">
        <Link
          href={AI_INTELLIGENCE_ROUTES.admin}
          className="font-semibold"
          style={{ color: GOLD }}
        >
          AI Intelligence（本部）→
        </Link>
        <span className="text-slate-300" aria-hidden>
          |
        </span>
        <Link
          href="/community?tab=knowledge"
          className="font-semibold"
          style={{ color: NAVY }}
        >
          Community Knowledge
        </Link>
      </div>
      <KnowledgeBaseSearch />
    </ModulePageShell>
  );
}
