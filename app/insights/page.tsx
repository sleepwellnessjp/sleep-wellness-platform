"use client";

import { useEffect, useState } from "react";
import InstructorNav from "@/components/InstructorNav";
import SectionCard from "@/components/ui/SectionCard";
import SwiInsightsDashboard, {
  SwiInsightsLoading,
} from "@/components/SwiInsightsDashboard";
import { GOLD, NAVY, SURFACE } from "@/components/ui/tokens";
import type { SwiInsightsOverview } from "@/lib/swi/types";

export default function InstructorInsightsPage() {
  const [insights, setInsights] = useState<SwiInsightsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/insights", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          insights?: SwiInsightsOverview;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setInsights(json.insights ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <InstructorNav />
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header>
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS INTELLIGENCE
          </p>
          <h1
            className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            Insights
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
            担当クライアントの匿名集計。氏名・連絡先などの個人情報は表示しません。
          </p>
        </header>

        <div className="mt-8">
          {loading ? (
            <SwiInsightsLoading />
          ) : error ? (
            <SectionCard title="読み込みエラー">
              <p className="text-sm text-slate-600">{error}</p>
            </SectionCard>
          ) : insights ? (
            <SwiInsightsDashboard insights={insights} />
          ) : null}
        </div>
      </div>
    </main>
  );
}
