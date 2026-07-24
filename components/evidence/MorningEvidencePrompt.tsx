"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { CLIENT_PORTAL_ROUTES } from "@/lib/client-portal/constants";
import type { MorningEvidenceSurvey } from "@/lib/evidence";

/**
 * クライアントホーム向けの翌朝アンケート誘導（任意・既存機能非侵襲）。
 */
export default function MorningEvidencePrompt() {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/evidence/morning", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const json = (await response.json()) as {
          survey?: MorningEvidenceSurvey | null;
        };
        if (!cancelled) setPending(!json.survey);
      } catch {
        // silent — 既存ホームを壊さない
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pending) return null;

  return (
    <Link
      href={CLIENT_PORTAL_ROUTES.morning}
      className="mt-5 block rounded-[1.5rem] border border-[#8a6a2d]/25 bg-gradient-to-br from-[#faf7f1] to-white px-5 py-4 transition hover:border-[#8a6a2d]/40"
    >
      <p
        className="text-[10px] font-semibold tracking-[0.2em]"
        style={{ color: GOLD }}
      >
        EVIDENCE · 翌朝
      </p>
      <p
        className="mt-1 text-[15px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        今朝のアンケート（約30秒）
      </p>
      <p className="mt-1 text-[13px] text-slate-500">
        睡眠満足度・起床時気分・日中の調子を記録してください
      </p>
    </Link>
  );
}
