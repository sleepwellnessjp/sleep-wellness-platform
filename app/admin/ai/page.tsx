"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  KnowledgeBaseSearch,
  ResearchAiReportCard,
  SwijIntelligenceDashboard,
} from "@/components/ai-intelligence";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  AI_INTELLIGENCE_FEATURE_DESCRIPTIONS,
  AI_INTELLIGENCE_FEATURE_IDS,
  AI_INTELLIGENCE_FEATURE_LABELS,
  AI_INTELLIGENCE_ROUTES,
  type AiIntelligenceBundle,
  type ResearchAiReport,
  type SwijIntelligenceReport,
} from "@/lib/ai-intelligence";

type TabId = "swij" | "research" | "knowledge" | "overview";

export default function AdminAiIntelligencePage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [bundle, setBundle] = useState<AiIntelligenceBundle | null>(null);
  const [swij, setSwij] = useState<SwijIntelligenceReport | null>(null);
  const [research, setResearch] = useState<ResearchAiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [bundleRes, swijRes, researchRes] = await Promise.all([
        fetch(`${AI_INTELLIGENCE_ROUTES.api.admin}?view=bundle`, {
          cache: "no-store",
        }),
        fetch(`${AI_INTELLIGENCE_ROUTES.api.admin}?view=swij`, {
          cache: "no-store",
        }),
        fetch(`${AI_INTELLIGENCE_ROUTES.api.admin}?view=research`, {
          cache: "no-store",
        }),
      ]);
      const bundleJson = (await bundleRes.json()) as {
        bundle?: AiIntelligenceBundle;
        error?: string;
      };
      const swijJson = (await swijRes.json()) as {
        report?: SwijIntelligenceReport;
        error?: string;
      };
      const researchJson = (await researchRes.json()) as {
        report?: ResearchAiReport;
        error?: string;
      };
      if (!bundleRes.ok) throw new Error(bundleJson.error ?? "取得に失敗");
      setBundle(bundleJson.bundle ?? null);
      setSwij(swijJson.report ?? null);
      setResearch(researchJson.report ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "取得に失敗しました",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      eyebrow="AI INTELLIGENCE"
      title="Sleep Wellness AI Intelligence"
      description="認定講師・クライアント・本部データを学習する Sleep Wellness 専用 AI（現在はモック）。"
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["swij", "SWIJ Intelligence"],
            ["research", "Research AI"],
            ["knowledge", "Knowledge Base"],
          ] as const
        ).map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-3.5 py-2 text-[12px] font-semibold sm:text-[13px] ${
                active ? "text-white" : "bg-white text-slate-500 hover:bg-slate-100"
              }`}
              style={active ? { backgroundColor: NAVY } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>

      {message ? (
        <p className="mb-4 text-[14px] text-[#a33a3a]" role="alert">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <SoftSkeleton variant="card" />
          <SoftSkeleton variant="journey" />
        </div>
      ) : null}

      {!loading && tab === "overview" ? (
        <div className="space-y-4">
          <p className="text-[14px] leading-7 text-slate-600">
            Sleep Wellness Platform 最大の AI レイヤー。6機能すべてルールベースで稼働し、
            将来 OpenAI API に差し替え可能な Generator 口を備えています。
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AI_INTELLIGENCE_FEATURE_IDS.map((id) => (
              <div
                key={id}
                className="rounded-2xl border border-[#071426]/08 bg-white px-4 py-4"
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.16em]"
                  style={{ color: GOLD }}
                >
                  {id.replaceAll("_", " ").toUpperCase()}
                </p>
                <p
                  className="mt-2 text-[15px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {AI_INTELLIGENCE_FEATURE_LABELS[id]}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  {AI_INTELLIGENCE_FEATURE_DESCRIPTIONS[id]}
                </p>
              </div>
            ))}
          </div>
          {bundle ? (
            <p className="text-[12px] text-slate-400">
              Bundle generatedAt {bundle.generatedAt} · source {bundle.source}
            </p>
          ) : null}
        </div>
      ) : null}

      {!loading && tab === "swij" && swij ? (
        <SwijIntelligenceDashboard report={swij} />
      ) : null}

      {!loading && tab === "research" && research ? (
        <ResearchAiReportCard report={research} />
      ) : null}

      {!loading && tab === "knowledge" ? (
        <KnowledgeBaseSearch
          initialAnswer={bundle?.knowledgeAnswer ?? null}
        />
      ) : null}
    </AdminShell>
  );
}
