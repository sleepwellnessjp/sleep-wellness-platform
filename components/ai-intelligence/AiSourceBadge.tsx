"use client";

import type { AiIntelligenceSource } from "@/lib/ai-intelligence";

/**
 * 生成ソース表示。クライアント向け画面では既定で非表示。
 * 開発時のみ NEXT_PUBLIC_SHOW_AI_SOURCE_BADGE=1 で表示する。
 */
export default function AiSourceBadge({
  source,
}: {
  source: AiIntelligenceSource;
}) {
  const showDevBadge =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_SHOW_AI_SOURCE_BADGE === "1";

  if (!showDevBadge) return null;

  return (
    <p className="text-[11px] text-slate-400">
      {source === "rules"
        ? "ルールベース（モック） · 将来 OpenAI 接続予定"
        : "AI（GPT）による生成"}
    </p>
  );
}
