"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import SwiInsightsDashboard, {
  SwiInsightsLoading,
} from "@/components/SwiInsightsDashboard";
import type { SwiInsightsOverview } from "@/lib/swi/types";

export default function AdminInsightsPage() {
  const [insights, setInsights] = useState<SwiInsightsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/insights", { cache: "no-store" })
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
    <AdminShell
      eyebrow="SLEEP WELLNESS INTELLIGENCE"
      title="Insights"
      description="匿名化された睡眠ウェルネスデータの全体傾向。個人情報は表示しません。"
    >
      {loading ? (
        <SwiInsightsLoading />
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : insights ? (
        <SwiInsightsDashboard insights={insights} />
      ) : null}
    </AdminShell>
  );
}
