"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SUCCESS, TEAL } from "@/components/ui/tokens";
import {
  EVIDENCE_COLLECTION_PHASE_LABEL,
  type EvidenceCollectionBundle,
} from "@/lib/evidence";
import { SWIJ_EYEBROW_HQ } from "@/lib/brand/swij-brand";

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#071426]/08 bg-[#fafaf8] px-4 py-4 sm:px-5">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400">
        {label}
      </p>
      <p
        className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] tabular-nums"
        style={{ color: NAVY }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function SentimentBar({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  return (
    <div className="overflow-hidden rounded-full bg-slate-100">
      <div className="flex h-3 w-full">
        <div style={{ width: `${positive}%`, backgroundColor: SUCCESS }} />
        <div style={{ width: `${neutral}%`, backgroundColor: TEAL }} />
        <div style={{ width: `${negative}%`, backgroundColor: "#a33a3a" }} />
      </div>
    </div>
  );
}

function EvidenceDashboard({ data }: { data: EvidenceCollectionBundle }) {
  const { aggregate } = data;
  const analysis = aggregate.commentAnalysis;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="改善率"
          value={`${aggregate.improvementRate}%`}
          hint="匿名集計の合成指標"
        />
        <MetricTile
          label="満足度"
          value={`${aggregate.averageSatisfaction.toFixed(1)} / 5`}
          hint={`${aggregate.satisfactionPercent}% 換算`}
        />
        <MetricTile
          label="継続率"
          value={`${aggregate.continuationRate}%`}
          hint={`次回予約見込み ${aggregate.nextAppointmentYesRate}%`}
        />
        <MetricTile
          label="宿題実施率"
          value={`${aggregate.homeworkCompletionRate}%`}
          hint={`見込み平均 ${aggregate.averageHomeworkLikelihood.toFixed(1)}`}
        />
      </div>

      <SectionCard title="収集サンプル（匿名）">
        <p className="text-[13px] text-slate-500">{aggregate.periodLabel}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricTile
            label="セッション回答"
            value={String(data.recentSessionCount)}
          />
          <MetricTile
            label="翌朝回答"
            value={String(data.recentMorningCount)}
          />
          <MetricTile
            label="コメント件数"
            value={String(data.recentCommentCount)}
            hint="本文は本部画面に表示しません"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricTile
            label="睡眠満足度（平均）"
            value={aggregate.averageSleepSatisfaction.toFixed(1)}
          />
          <MetricTile
            label="起床時気分（平均）"
            value={aggregate.averageMorningMood.toFixed(1)}
          />
          <MetricTile
            label="日中の調子（平均）"
            value={aggregate.averageDaytimeCondition.toFixed(1)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="コメント分析"
        eyebrow={analysis.isMock ? "MOCK · 匿名" : "匿名"}
      >
        <p className="mb-3 text-[12px] text-slate-400">
          {analysis.isMock
            ? "モック分析 · 生コメントは非公開 · テーマ傾向のみ"
            : "匿名コメントのテーマ傾向"}
        </p>
        <p className="text-[14px] leading-7 text-slate-600">{analysis.summary}</p>
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-3 text-[12px] text-slate-500">
            <span>ポジティブ {analysis.positiveShare}%</span>
            <span>ニュートラル {analysis.neutralShare}%</span>
            <span>ネガティブ {analysis.negativeShare}%</span>
          </div>
          <SentimentBar
            positive={analysis.positiveShare}
            neutral={analysis.neutralShare}
            negative={analysis.negativeShare}
          />
        </div>
        <ul className="mt-5 space-y-3">
          {analysis.themes.map((theme) => (
            <li
              key={theme.theme}
              className="rounded-2xl border border-[#071426]/06 bg-[#fafaf8] px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-[#071426]">
                  {theme.theme}
                </p>
                <p className="text-[12px] text-slate-400">
                  言及 {theme.mentionCount} · {theme.sentiment}
                </p>
              </div>
              <p className="mt-1 text-[13px] text-slate-500">
                {theme.sampleSnippet}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function EvidenceDashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

export default function AdminEvidencePage() {
  const [bundle, setBundle] = useState<EvidenceCollectionBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/evidence", { cache: "no-store" });
      const json = (await response.json()) as {
        bundle?: EvidenceCollectionBundle;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
      setBundle(json.bundle ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "取得に失敗しました",
      );
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell
      eyebrow={`${SWIJ_EYEBROW_HQ} · EVIDENCE`}
      title="実証データ収集"
      description="Closed Beta のセッション／翌朝アンケートを匿名集計し、改善率・満足度・継続率・宿題実施率を把握します。"
    >
      <div
        className="mb-8 rounded-[1.75rem] border border-[#071426]/08 px-5 py-5 sm:px-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(7,20,38,0.03) 0%, rgba(138,106,45,0.08) 100%)",
        }}
      >
        <p
          className="text-[10px] font-semibold tracking-[0.24em]"
          style={{ color: GOLD }}
        >
          SLEEP WELLNESS INSTITUTE JAPAN
        </p>
        <p className="mt-2 text-[15px] font-semibold tracking-[-0.02em] text-[#071426]">
          {EVIDENCE_COLLECTION_PHASE_LABEL}
        </p>
        <p className="mt-1 text-[13px] text-slate-500">
          Version {bundle?.aggregate.appVersion ?? "1.0.0"} · 全データ匿名集計 ·
          個人特定不可
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 text-[13px] font-semibold"
          style={{ color: NAVY }}
        >
          再読み込み
        </button>
      </div>

      {message ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-[#a33a3a]" role="alert">
            {message}
          </p>
        </SectionCard>
      ) : null}

      {loading ? (
        <EvidenceDashboardLoading />
      ) : bundle ? (
        <EvidenceDashboard data={bundle} />
      ) : null}
    </AdminShell>
  );
}
