"use client";

import type { AiIntelligenceSource } from "@/lib/ai-intelligence";

export default function AiSourceBadge({
  source,
}: {
  source: AiIntelligenceSource;
}) {
  return (
    <p className="text-[11px] text-slate-400">
      {source === "rules"
        ? "ルールベース（モック） · 将来 OpenAI 接続予定"
        : "AI（GPT）による生成"}
    </p>
  );
}
