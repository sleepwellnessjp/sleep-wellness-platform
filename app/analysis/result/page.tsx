"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import AnalysisFlow from "@/components/AnalysisFlow";
import AiFollowAlerts from "@/components/AiFollowAlerts";
import AnalysisAiIntelligenceSection from "@/components/ai-intelligence/AnalysisAiIntelligenceSection";
import SessionEvidenceSurveyCard from "@/components/evidence/SessionEvidenceSurveyCard";
import WellnessRadarChart from "@/components/WellnessRadarChart";
import RecommendationsUntilNextCard from "@/components/RecommendationsUntilNextCard";
import PreviousHomeworkCard from "@/components/PreviousHomeworkCard";
import RecoveryIndexCard from "@/components/analysis/RecoveryIndexCard";
import {
  ClientWellnessReportSections,
} from "@/components/analysis/ClientWellnessReport";
import {
  buildVisualPanels,
  MEDICAL_METRIC_ROWS,
  SleepStagesOverview,
  SleepStagesPrintBlock,
} from "@/components/SoxaiVisualCharts";
import { useToast } from "@/components/ui/Toast";
import { computeRecoveryIndex } from "@/lib/recovery-index";
import {
  evaluateMetric,
  formatHrvRange,
  metricGuideline,
} from "@/lib/report-metric-guide";
import {
  AnalysisResult,
  formatImprovementStars,
  getExtractionDraft,
  getPendingAnalysisRequest,
  hydrateAnalysisSession,
  improvementPriorityLabel,
  loadAnalysisGraphs,
  loadAnalysisImages,
  loadAnalysisResult,
  mergeInstructorCounseling,
  parseInstructorSuggestionsToCounseling,
  subscribeAnalysisSession,
  WELLNESS_CATEGORY_LABELS,
  type ImprovementItem,
  type WellnessCategoryKey,
} from "@/lib/analysis-session";
import {
  buildDemoAnalysisResult,
  DEMO_LIFESTYLE_SNAPSHOT,
} from "@/lib/demo-analysis-result";
import type { LifestyleSnapshot } from "@/lib/wellness-client-report";
import { startProgressiveAnalysisBackground } from "@/lib/analysis-progressive";
import { buildAiFollowAlerts, type AiFollowAlert } from "@/lib/ai-follow-alerts";
import { displayValue, type SoxaiGraphBundle } from "@/lib/soxai-graphs";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";
import { formatGenderLabel, hasAgeAndGender } from "@/lib/client-profile";
import { loadLastSavedAnalysisRef } from "@/lib/client-store";
import {
  analysisResultToStoredShape,
  buildPreviousComparisonSummary,
  buildPreviousHomeworkComparison,
  findFirstAnalysis,
  findPreviousAnalysis,
  previousComparisonToneColor,
  type PreviousComparisonSummary,
  type PreviousHomeworkComparison,
} from "@/lib/previous-comparison";
import { pickBrandClosingMessage } from "@/lib/brand-closing-messages";
import { getClientProfile } from "@/lib/repositories/client-profile-repository";
import {
  getAnalysisById,
  getClientById,
  recordPdfDownload,
} from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_LIGHT = "#d8b36a";

function takeItems<T>(items: T[] | undefined, max: number): T[] {
  if (!items?.length) return [];
  return items.slice(0, max);
}

function clampSentences(text: string, maxSentences: number): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const parts = trimmed.match(/[^.!?。！？]+[.!?。！？]?/g);
  if (!parts) return trimmed;

  const sentences = parts.map((part) => part.trim()).filter(Boolean);
  if (sentences.length <= maxSentences) return trimmed;
  return sentences.slice(0, maxSentences).join("");
}

function clampLine(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1).trimEnd()}…`;
}

/** 測定データ未取得 */
const UNMEASURED = "未測定";
/** コンテンツ未生成・今後対応予定 */
const FORTHCOMING = "今後対応";

function AiContentPendingPlaceholder({ label }: { label: string }) {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label={`${label}を生成中`}>
      <div className="h-3.5 w-[88%] animate-pulse rounded bg-slate-100" />
      <div className="h-3.5 w-[72%] animate-pulse rounded bg-slate-100" />
      <div className="h-3.5 w-[64%] animate-pulse rounded bg-slate-100" />
      <p className="pt-1 text-[12px] text-slate-400">{label}を生成しています…</p>
    </div>
  );
}

function formatDateLabel(value?: string): string {
  if (!value?.trim()) return UNMEASURED;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

/** Markdown風 **太字** を描画 */
function renderRichText(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-semibold" style={{ color: NAVY }}>
          {bold[1]}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function FormattedAiText({ text }: { text: string }) {
  const blocks = text
    .split(/\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => (
        <p
          key={index}
          className="break-words text-[14px] leading-6 text-slate-600 sm:text-base sm:leading-8"
        >
          {renderRichText(block)}
        </p>
      ))}
    </div>
  );
}

type KarteSectionTitle =
  | "今回最も重要な課題"
  | "判断の根拠"
  | "今回もっとも改善効果が高い行動";

type KarteSection = { title: KarteSectionTitle; body: string };

const KARTE_HEADING_ALIASES: Record<string, KarteSectionTitle> = {
  今回最も重要な課題: "今回最も重要な課題",
  判断の根拠: "判断の根拠",
  今回もっとも改善効果が高い行動: "今回もっとも改善効果が高い行動",
  最も効果が高い改善ポイント: "今回もっとも改善効果が高い行動",
  // 旧 AIカルテ見出し互換
  現在の状態: "今回最も重要な課題",
  原因分析: "判断の根拠",
  考えられる要因: "判断の根拠",
  改善戦略: "今回もっとも改善効果が高い行動",
  次回までの目標: "今回もっとも改善効果が高い行動",
};

/** Sleep Wellness Insight を3見出し構成へ整形（旧見出しも互換） */
function parseKarteSections(text: string): KarteSection[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const headingPattern =
    /(?:^|\n)\s*■?\s*(今回最も重要な課題|判断の根拠|今回もっとも改善効果が高い行動|最も効果が高い改善ポイント|現在の状態|原因分析|考えられる要因|改善戦略|次回までの目標)\s*[:：]?\s*/g;
  const hits = [...trimmed.matchAll(headingPattern)];

  if (hits.length >= 2) {
    const sections: KarteSection[] = [];
    for (let i = 0; i < hits.length; i++) {
      const rawTitle = hits[i][1];
      const title = KARTE_HEADING_ALIASES[rawTitle] ?? "今回最も重要な課題";
      const start = (hits[i].index ?? 0) + hits[i][0].length;
      const end = i + 1 < hits.length ? (hits[i + 1].index ?? trimmed.length) : trimmed.length;
      const body = trimmed.slice(start, end).trim();
      if (body) sections.push({ title, body });
    }
    if (sections.length > 0) return sections;
  }

  const sentences = trimmed
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [];
  if (sentences.length === 1) {
    return [{ title: "今回最も重要な課題", body: sentences[0] }];
  }
  if (sentences.length === 2) {
    return [
      { title: "今回最も重要な課題", body: sentences[0] },
      { title: "今回もっとも改善効果が高い行動", body: sentences[1] },
    ];
  }

  const mid = Math.max(1, Math.floor(sentences.length / 3));
  const mid2 = Math.max(mid + 1, Math.floor((sentences.length * 2) / 3));
  const fallback: KarteSection[] = [
    { title: "今回最も重要な課題", body: sentences.slice(0, mid).join("") },
    { title: "判断の根拠", body: sentences.slice(mid, mid2).join("") },
    {
      title: "今回もっとも改善効果が高い行動",
      body: sentences.slice(mid2).join(""),
    },
  ];
  return fallback.filter((s) => s.body);
}

function FormattedKarteText({ text }: { text: string }) {
  const sections = parseKarteSections(text);
  if (sections.length === 0) return null;

  const KARTE_HINTS: Record<KarteSection["title"], string> = {
    今回最も重要な課題: "いま最も大切な焦点",
    判断の根拠: "データ同士を関連づけた考察",
    今回もっとも改善効果が高い行動: "今回いちばん効果が期待できる行動",
  };

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.title} className="report-karte-block">
          <p
            className="report-karte-heading text-[13px] font-semibold tracking-[-0.01em] sm:text-[14px]"
            style={{ color: NAVY }}
          >
            {section.title}
            <span className="ml-2 text-[11px] font-medium tracking-normal text-slate-400 sm:text-[12px]">
              {KARTE_HINTS[section.title]}
            </span>
          </p>
          <p className="report-karte-body mt-1 break-words text-[14px] leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
            {renderRichText(section.body)}
          </p>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow: string;
}) {
  return (
    <div className="report-section-label mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="report-section-mark hidden h-4 w-[3px] shrink-0 rounded-full sm:block"
          style={{ backgroundColor: GOLD }}
          aria-hidden
        />
        <h2
          className="min-w-0 break-words text-[15px] font-semibold tracking-[-0.02em] sm:text-[1.05rem]"
          style={{ color: NAVY }}
        >
          {title}
        </h2>
      </div>
      <p
        className="report-section-eyebrow text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        {eyebrow}
      </p>
    </div>
  );
}

/** 印刷でも残す、クライアント向けの短い導入文 */
function ReportLead({ children }: { children: ReactNode }) {
  return (
    <p className="report-lead mb-3 text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
      {children}
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[14px] leading-6 text-slate-400 sm:text-[15px] sm:leading-7">
        {FORTHCOMING}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 24)}`}
          className="flex gap-2.5 break-words text-[14px] leading-6 text-slate-600 sm:text-[0.95rem] sm:leading-7"
        >
          <span
            className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: GOLD }}
            aria-hidden
          />
          <span>{renderRichText(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function ImprovementsList({ items }: { items: ImprovementItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[14px] leading-6 text-slate-400 sm:text-[15px] sm:leading-7">
        {FORTHCOMING}
      </p>
    );
  }

  return (
    <ul className="space-y-3.5">
      {items.map((item, index) => (
        <li
          key={`${index}-${item.stars}-${item.text.slice(0, 24)}`}
          className="rounded-xl border border-[#071426]/08 bg-[#fafaf8] px-3.5 py-3 sm:px-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span
              className="text-[13px] font-semibold tracking-[0.04em] tabular-nums"
              style={{ color: GOLD }}
              aria-hidden
            >
              {formatImprovementStars(item.stars)}
            </span>
            <span
              className="text-[12px] font-semibold tracking-[-0.01em] sm:text-[13px]"
              style={{ color: NAVY }}
            >
              {improvementPriorityLabel(item.stars)}
            </span>
          </div>
          <p className="mt-1.5 break-words text-[14px] leading-6 text-slate-600 sm:text-[0.95rem] sm:leading-7">
            {renderRichText(item.text)}
          </p>
          {item.whyNow?.trim() ? (
            <p className="mt-2 border-t border-[#071426]/06 pt-2 text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
              <span
                className="mr-1.5 font-semibold tracking-[-0.01em]"
                style={{ color: GOLD }}
              >
                なぜ今優先するか
              </span>
              {renderRichText(item.whyNow.trim())}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

const RANKING_MARKS = ["①", "②", "③", "④", "⑤"] as const;

function TodaysRecommendationsList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="text-[14px] leading-6 text-slate-400 sm:text-[15px] sm:leading-7">
        {FORTHCOMING}
      </p>
    );
  }

  return (
    <ol className="space-y-2.5">
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 24)}`}
          className="flex gap-2.5 break-words text-[14px] leading-6 text-slate-700 sm:gap-3 sm:text-base sm:leading-7"
        >
          <span
            className="w-[1.5rem] shrink-0 text-[1.05rem] font-semibold tabular-nums"
            style={{ color: NAVY }}
            aria-hidden
          >
            {RANKING_MARKS[index] ?? `${index + 1}.`}
          </span>
          <span className="min-w-0 font-medium" style={{ color: NAVY }}>
            {item}
          </span>
        </li>
      ))}
    </ol>
  );
}

function buildLifestyleRows(result: AnalysisResult): Array<{
  label: string;
  value: string;
}> {
  const bedtime = result.metrics.bedtime?.trim() || "";
  const wakeTime = result.metrics.wakeTime?.trim() || "";
  const schedule =
    bedtime && wakeTime
      ? `${bedtime} 〜 ${wakeTime}`
      : bedtime || wakeTime;

  const rows: Array<{ label: string; value: string }> = [
    { label: "飲酒習慣", value: result.drinkingHabit?.trim() || "" },
    { label: "運動習慣", value: result.exerciseHabit?.trim() || "" },
    { label: "服薬", value: result.medications?.trim() || "" },
    { label: "いびき・鼻閉", value: result.snoringNasal?.trim() || "" },
    { label: "既往・体調", value: result.medicalHistory?.trim() || "" },
    { label: "就寝・起床", value: schedule },
  ];
  return rows.filter((row) => row.value.length > 0);
}

function InstructorCommentField({
  suggestions,
  counseling,
}: {
  suggestions: string[];
  counseling?: AnalysisResult["instructorCounseling"];
}) {
  const plan = mergeInstructorCounseling(
    counseling,
    parseInstructorSuggestionsToCounseling(suggestions),
  );

  const groups: Array<{
    title: string;
    eyebrow: string;
    items: string[];
  }> = [
    {
      title: "良好な点",
      eyebrow: "GOOD",
      items: plan?.goodPoints ?? [],
    },
    {
      title: "改善が必要な点",
      eyebrow: "IMPROVE",
      items: plan?.needsImprovement ?? [],
    },
    {
      title: "考えられる要因",
      eyebrow: "FACTORS",
      items: plan?.possibleFactors ?? [],
    },
    {
      title: "質問候補",
      eyebrow: "QUESTIONS",
      items: plan?.questionCandidates ?? [],
    },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="report-panel report-instructor-comment mt-5 rounded-xl border border-[#071426]/10 bg-white px-4 py-4 sm:mt-6 sm:px-5">
      <div className="report-instructor-ai-suggestions rounded-lg border border-[#8a6a2d]/20 bg-[#fbf9f4] px-3.5 py-3.5 sm:px-4">
        <SectionLabel title="AIから講師への提案" eyebrow="FOR INSTRUCTOR" />
        <p className="report-instructor-ai-lead mb-3 text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
          今回の分析結果から自動生成したカウンセリング支援です。認定講師がそのまま確認・観察・説明に使えます。
        </p>
        <div className="space-y-3.5 report-instructor-ai-groups">
          {groups.map((group) => (
            <div key={group.title} className="report-instructor-ai-group">
              <p
                className="text-[11px] font-semibold tracking-[0.12em]"
                style={{ color: GOLD }}
              >
                {group.eyebrow}
              </p>
              <p
                className="mt-0.5 text-[13px] font-semibold tracking-[-0.01em]"
                style={{ color: NAVY }}
              >
                {group.title}
              </p>
              <ol className="mt-1.5 space-y-1.5">
                {group.items.map((item, index) => (
                  <li
                    key={`${group.title}-${index}`}
                    className="flex gap-2.5 text-[13px] leading-6 text-slate-700 sm:text-[14px]"
                  >
                    <span
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: "#071426" }}
                    >
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstituteBrandComment({ seed }: { seed: string }) {
  const message = pickBrandClosingMessage(seed);

  return (
    <section
      className="report-brand-comment relative mt-6 overflow-hidden rounded-2xl border border-[#8a6a2d]/25 sm:mt-7"
      style={{
        background:
          "linear-gradient(165deg, #fbf9f4 0%, #f7f3ea 42%, #f3eee4 100%)",
        boxShadow:
          "0 18px 48px -36px rgba(7,20,38,.28), inset 0 1px 0 rgba(255,255,255,.72)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-px sm:inset-x-7"
        style={{
          background: `linear-gradient(90deg, transparent, ${GOLD_LIGHT}, transparent)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-4 left-0 w-px sm:inset-y-5"
        style={{
          background: `linear-gradient(180deg, transparent, ${GOLD}55, transparent)`,
        }}
        aria-hidden
      />

      <div className="relative px-5 py-7 text-center sm:px-8 sm:py-9">
        <p
          className="text-[10px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          FROM THE INSTITUTE
        </p>
        <h2
          className="mt-2.5 text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
          style={{ color: NAVY }}
        >
          Sleep Wellness Institute Japan コメント
        </h2>
        <div
          className="mx-auto mt-4 h-px w-12 sm:mt-5"
          style={{
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          }}
          aria-hidden
        />

        <div className="mx-auto mt-5 max-w-[28rem] space-y-4 sm:mt-6 sm:space-y-5">
          {message.paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="whitespace-pre-line text-[14px] leading-[1.85] tracking-[0.02em] text-slate-600 sm:text-[15px] sm:leading-[1.95]"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function subscribeNoop() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

export default function AnalysisResultPage() {
  const isClient = useIsClient();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [graphs, setGraphs] = useState<SoxaiGraphBundle | Record<string, never>>(
    {},
  );
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDemoLayout, setIsDemoLayout] = useState(false);

  useEffect(() => {
    if (!isClient) return;

    const params = new URLSearchParams(window.location.search);
    const analysisId = params.get("analysisId")?.trim();
    const forceDemo =
      params.get("demo") === "1" || params.get("layout") === "1";

    if (!analysisId || forceDemo) {
      const stored = forceDemo ? null : loadAnalysisResult();
      if (stored) {
        setResult(stored);
        setImages(loadAnalysisImages());
        setGraphs(loadAnalysisGraphs());
        setIsDemoLayout(false);
        return;
      }
      const demo = buildDemoAnalysisResult();
      setResult(demo);
      setImages([]);
      setGraphs(demo.graphs ?? {});
      setIsDemoLayout(true);
      return;
    }

    let cancelled = false;
    setLoadingSaved(true);
    setLoadError(null);
    setIsDemoLayout(false);

    void getAnalysisById(analysisId)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setLoadError("保存済みの分析結果が見つかりません。");
          const demo = buildDemoAnalysisResult();
          setResult(demo);
          setImages([]);
          setGraphs(demo.graphs ?? {});
          setIsDemoLayout(true);
          return;
        }

        const hydrated = hydrateAnalysisSession({
          ...found.analysis.result,
          analysisId: found.analysis.id,
          clientId: found.client.id,
          clientName: found.client.name,
          measurementDate: found.analysis.analysisDate,
          metrics: found.analysis.metrics,
          graphs: found.analysis.result.graphs,
        });
        setResult(hydrated);
        // 保存済み分析はセッションの別分析画像を混ぜない（画像バイナリは未永続化）
        setImages([]);
        setGraphs(hydrated.graphs ?? {});
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Failed to load saved analysis:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "保存済み分析の読み込みに失敗しました。",
        );
        const demo = buildDemoAnalysisResult();
        setResult(demo);
        setImages([]);
        setGraphs(demo.graphs ?? {});
        setIsDemoLayout(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingSaved(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient || loadingSaved || !result) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") !== "1") return;
    const timer = window.setTimeout(() => {
      window.print();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isClient, loadingSaved, result]);

  if (!isClient || loadingSaved) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-[#f7f7f5]"
      >
        <p className="text-base text-slate-400">読み込み中...</p>
      </main>
    );
  }

  if (!result) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 py-16 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-20 sm:pb-20"
      >
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.18)] sm:max-w-lg sm:p-12">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            SLEEP WELLNESS REPORT
          </p>

          <h1
            className="mt-5 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            分析結果がありません
          </h1>

          <p className="mt-5 text-[15px] leading-7 text-slate-500 sm:text-base sm:leading-8">
            {loadError ?? "新しい分析を開始してください。"}
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:justify-center sm:gap-3">
            <Link
              href="/portal"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition active:bg-slate-50 sm:w-auto sm:hover:bg-slate-50 sm:active:bg-transparent"
              style={{ color: NAVY }}
            >
              分析履歴へ
            </Link>
            <Link
              href="/clients"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition active:bg-slate-50 sm:w-auto sm:hover:bg-slate-50 sm:active:bg-transparent"
              style={{ color: NAVY }}
            >
              クライアント一覧
            </Link>
            <Link
              href="/analysis/new"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition active:opacity-90 sm:w-auto sm:hover:opacity-90 sm:active:opacity-100"
              style={{ backgroundColor: NAVY }}
            >
              新しい分析を作成
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ResultContent
      result={result}
      images={images}
      graphs={graphs}
      isDemoLayout={isDemoLayout}
    />
  );
}

function PreviousComparisonSection({
  summary,
  firstSummary,
  narrative,
  clientId,
}: {
  summary: PreviousComparisonSummary | null;
  firstSummary?: PreviousComparisonSummary | null;
  narrative?: AnalysisResult["comparisonNarrative"];
  clientId?: string;
}) {
  if (!summary && !firstSummary && !narrative?.vsPrevious && !narrative?.vsFirst) {
    return null;
  }

  return (
    <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 bg-[#fafafa] px-4 py-4 sm:mt-6 sm:px-5">
      <SectionLabel title="分析履歴との比較" eyebrow="PROGRESS" />

      {summary ? (
        <div className="mt-1">
          <p className="mb-3 text-[13px] leading-6 text-slate-500">
            前回比較
            {summary.previousDate ? (
              <span className="ml-1.5 text-slate-400">
                （{formatDateLabel(summary.previousDate)}）
              </span>
            ) : null}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            {summary.items.map((item) => (
              <div
                key={`prev-${item.label}`}
                className="min-w-0 rounded-xl border border-[#071426]/10 bg-white px-2.5 py-2.5 sm:px-3.5 sm:py-3.5"
              >
                <p className="text-[10px] font-medium tracking-[0.04em] text-slate-400 sm:text-[11px]">
                  {item.label}
                </p>
                <p
                  className="mt-1 break-words text-[0.95rem] font-semibold tracking-[-0.03em] sm:text-[1.12rem]"
                  style={{ color: previousComparisonToneColor(item.tone) }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          {narrative?.vsPrevious?.trim() ? (
            <div className="mt-3 rounded-lg border border-[#071426]/08 bg-white/80 px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                AI解説 · 前回比較
              </p>
              <p className="mt-1.5 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7">
                {renderRichText(narrative.vsPrevious.trim())}
              </p>
            </div>
          ) : null}
          <p className="mt-3 text-[13px] leading-6 text-slate-500">
            {summary.profileNote}
          </p>
        </div>
      ) : null}

      {firstSummary ? (
        <div className="mt-5 border-t border-[#071426]/08 pt-4">
          <p className="mb-3 text-[13px] leading-6 text-slate-500">
            初回比較
            {firstSummary.previousDate ? (
              <span className="ml-1.5 text-slate-400">
                （{formatDateLabel(firstSummary.previousDate)}）
              </span>
            ) : null}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            {firstSummary.items.map((item) => (
              <div
                key={`first-${item.label}`}
                className="min-w-0 rounded-xl border border-[#071426]/10 bg-white px-2.5 py-2.5 sm:px-3.5 sm:py-3.5"
              >
                <p className="text-[10px] font-medium tracking-[0.04em] text-slate-400 sm:text-[11px]">
                  {item.label}
                </p>
                <p
                  className="mt-1 break-words text-[0.95rem] font-semibold tracking-[-0.03em] sm:text-[1.12rem]"
                  style={{ color: previousComparisonToneColor(item.tone) }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          {narrative?.vsFirst?.trim() ? (
            <div className="mt-3 rounded-lg border border-[#071426]/08 bg-white/80 px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                AI解説 · 初回比較
              </p>
              <p className="mt-1.5 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7">
                {renderRichText(narrative.vsFirst.trim())}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {clientId ? (
        <p className="mt-2 no-print">
          <Link
            href={`/clients/${encodeURIComponent(clientId)}/compare`}
            className="inline-flex min-h-11 items-center text-[13px] font-medium underline-offset-2 active:opacity-70 sm:min-h-0 sm:hover:underline sm:active:opacity-100"
            style={{ color: GOLD }}
          >
            詳しい前後比較を見る
          </Link>
        </p>
      ) : null}
    </section>
  );
}

function ResultContent({
  result: initialResult,
  images,
  graphs,
  isDemoLayout = false,
}: {
  result: AnalysisResult;
  images: string[];
  graphs: SoxaiGraphBundle;
  isDemoLayout?: boolean;
}) {
  const { success } = useToast();
  const [result, setResult] = useState(initialResult);
  const [previousComparison, setPreviousComparison] =
    useState<PreviousComparisonSummary | null>(null);
  const [firstComparison, setFirstComparison] =
    useState<PreviousComparisonSummary | null>(null);
  const [previousHomework, setPreviousHomework] =
    useState<PreviousHomeworkComparison | null>(null);
  const [followAlerts, setFollowAlerts] = useState<AiFollowAlert[]>([]);
  const [previousSleepScore, setPreviousSleepScore] = useState<number | null>(
    null,
  );
  const [previousMetrics, setPreviousMetrics] =
    useState<AnalysisMetrics | null>(null);

  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  useEffect(() => {
    if (result.contentStatus !== "pending") return;

    // リロード後も pending request があれば AI 生成を再開
    const pending = getPendingAnalysisRequest();
    if (pending) {
      void startProgressiveAnalysisBackground(
        result,
        loadAnalysisImages(),
      ).catch((backgroundError) => {
        console.error(
          "Background analysis resume failed:",
          backgroundError,
        );
      });
    } else {
      // リクエスト消失時は無限「生成中」を避ける
      const failed: AnalysisResult = {
        ...result,
        contentStatus: "error",
      };
      hydrateAnalysisSession(failed, { notify: true });
      setResult(failed);
    }

    return subscribeAnalysisSession((next) => {
      setResult(next);
      if (next.analysisId && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.get("analysisId") !== next.analysisId) {
          url.searchParams.set("analysisId", next.analysisId);
          url.searchParams.delete("pending");
          window.history.replaceState({}, "", url.toString());
        }
      }
    });
    // resume once per pending state; `result` identity changes on each hydrate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.contentStatus]);
  useEffect(() => {
    const clientId = result.clientId?.trim();
    if (!clientId) {
      setPreviousComparison(null);
      setFirstComparison(null);
      setPreviousHomework(null);
      setPreviousSleepScore(null);
      setPreviousMetrics(null);
      setFollowAlerts(
        buildAiFollowAlerts({
          analyses: [analysisResultToStoredShape(result)],
        }),
      );
      return;
    }

    let cancelled = false;

    void Promise.all([
      getClientById(clientId),
      getClientProfile(clientId).catch(() => null),
    ])
      .then(([client, profile]) => {
        if (cancelled) return;

        if (!client) {
          setPreviousComparison(null);
          setFirstComparison(null);
          setPreviousHomework(null);
          setPreviousSleepScore(null);
          setPreviousMetrics(null);
          setFollowAlerts(
            buildAiFollowAlerts({
              analyses: [analysisResultToStoredShape(result)],
            }),
          );
          return;
        }

        const previous = findPreviousAnalysis(
          client.analyses,
          result.analysisId,
        );
        const first = findFirstAnalysis(
          client.analyses,
          result.analysisId,
          previous,
        );
        const current =
          client.analyses.find((item) => item.id === result.analysisId) ??
          analysisResultToStoredShape(result);

        if (!previous) {
          setPreviousComparison(null);
          setPreviousHomework(null);
          setPreviousSleepScore(null);
          setPreviousMetrics(null);
        } else {
          setPreviousComparison(
            buildPreviousComparisonSummary(previous, current),
          );
          setPreviousHomework(buildPreviousHomeworkComparison(previous));
          const prevScore =
            typeof previous.wellnessScore === "number" &&
            Number.isFinite(previous.wellnessScore)
              ? previous.wellnessScore
              : typeof previous.result?.score === "number"
                ? previous.result.score
                : null;
          setPreviousSleepScore(prevScore);
          setPreviousMetrics(previous.metrics ?? previous.result?.metrics ?? null);
        }

        setFirstComparison(
          first ? buildPreviousComparisonSummary(first, current) : null,
        );

        // 最新分析として現在結果を先頭に揃える（未保存セッション対応）
        const analysesForAlerts = client.analyses.some(
          (item) => item.id === current.id,
        )
          ? client.analyses
          : [current, ...client.analyses];

        setFollowAlerts(
          buildAiFollowAlerts({
            analyses: analysesForAlerts,
            profile,
            tags: client.tags,
          }),
        );
      })
      .catch((error: unknown) => {
        console.error("Failed to load previous analysis:", error);
        if (!cancelled) {
          setPreviousComparison(null);
          setFirstComparison(null);
          setPreviousHomework(null);
          setPreviousSleepScore(null);
          setPreviousMetrics(null);
          setFollowAlerts(
            buildAiFollowAlerts({
              analyses: [analysisResultToStoredShape(result)],
            }),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [result]);

  // OCR→統合→確認で確定した単一ソース（Medical / Visual / PDF 共通）
  const confirmedMetrics = result.metrics;
  if (!confirmedMetrics) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4"
      >
        <p className="text-base text-slate-500">
          分析メトリクスが不足しています。最初からやり直してください。
        </p>
      </main>
    );
  }
  const graphBundle = result.graphs ?? graphs;
  const score = Math.max(0, Math.min(100, Math.round(result.score)));
  const recoveryIndex = computeRecoveryIndex({
    hrv: confirmedMetrics.hrv,
    restingHeartRate: confirmedMetrics.restingHeartRate,
  });
  const categoryScores = result.categoryScores;
  const aiPending = result.contentStatus === "pending";
  const aiFailed = result.contentStatus === "error";
  /** スコア確定後は AI 失敗時も印刷可能（確定メトリクスは表示済み） */
  const pdfReady = !aiPending;
  const categoryKeys = Object.keys(
    WELLNESS_CATEGORY_LABELS,
  ) as WellnessCategoryKey[];
  const goodPoints = takeItems(result.goodPoints, 4).map((item) =>
    clampLine(item, 80),
  );
  const improvements = takeItems(result.improvements, 5).map((item) => ({
    ...item,
    text: clampLine(item.text, 160),
    whyNow: item.whyNow ? clampLine(item.whyNow, 120) : undefined,
  }));
  const todaysRecommendations = takeItems(
    result.todaysRecommendations,
    3,
  ).map((item) => clampLine(item, 56));
  const nextComparisonPoints = takeItems(
    result.nextComparisonPoints,
    4,
  ).map((item) => clampLine(item, 80));
  const instructorSuggestions = takeItems(
    result.instructorSuggestions,
    9,
  ).map((item) => clampLine(item, 56));
  const summaryText = clampLine(result.summary || "", 240);
  const karteSummaryText = clampLine(result.karteSummary || "", 560);
  const profileRelationText = clampLine(
    clampSentences(result.profileRelation || result.lifestyleRelation || "", 6),
    320,
  );
  const scoreCommentText = clampLine(
    clampSentences(result.scoreComment || "", 5),
    240,
  );
  const cautionText = clampLine(result.caution ?? "", 120);
  const disclaimerText = clampLine(
    clampSentences(result.disclaimer ?? "", 2),
    120,
  );
  const visualPanels = buildVisualPanels(confirmedMetrics, graphBundle);
  /** PDF用：主要3パネルに絞り、ページ途中切れを防ぐ */
  const printDetailPanels = visualPanels.filter((panel) =>
    ["stages", "stress", "circadian"].includes(panel.id),
  );
  const lifestyleRows = buildLifestyleRows(result);
  const pendingLifestyle = (() => {
    const toSnapshot = (life: Record<string, unknown> | null | undefined) => {
      if (!life) return null;
      return {
        alcohol: typeof life.alcohol === "string" ? life.alcohol : undefined,
        alcoholDrank:
          typeof life.alcoholDrank === "string" ? life.alcoholDrank : undefined,
        caffeine: typeof life.caffeine === "string" ? life.caffeine : undefined,
        caffeineDone:
          typeof life.caffeineDone === "string" ? life.caffeineDone : undefined,
        bathing: typeof life.bathing === "string" ? life.bathing : undefined,
        yoga: typeof life.yoga === "string" ? life.yoga : undefined,
        yogaDone: typeof life.yogaDone === "string" ? life.yogaDone : undefined,
        pilates: typeof life.pilates === "string" ? life.pilates : undefined,
        pilatesDone:
          typeof life.pilatesDone === "string" ? life.pilatesDone : undefined,
        meals: typeof life.meals === "string" ? life.meals : undefined,
        otherExerciseDone:
          typeof life.otherExerciseDone === "string"
            ? life.otherExerciseDone
            : undefined,
        exercise: typeof life.exercise === "string" ? life.exercise : undefined,
        dinnerTime:
          typeof life.dinnerTime === "string" ? life.dinnerTime : undefined,
        stress: typeof life.stress === "string" ? life.stress : undefined,
      } satisfies LifestyleSnapshot;
    };
    try {
      if (isDemoLayout) return DEMO_LIFESTYLE_SNAPSHOT;
      return (
        toSnapshot(
          getPendingAnalysisRequest()?.lifestyle as
            | Record<string, unknown>
            | undefined,
        ) ??
        toSnapshot(
          getExtractionDraft()?.lifestyle as Record<string, unknown> | undefined,
        )
      );
    } catch {
      return isDemoLayout ? DEMO_LIFESTYLE_SNAPSHOT : null;
    }
  })();
  /** Visual Report は SCREEN01–05 まで（画面表示用） */
  const visualImages = images.slice(0, 5);
  const visualSlots = Math.max(visualImages.length, 1);
  const visualCols =
    visualSlots === 1
      ? "grid-cols-1"
      : visualSlots === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : visualSlots <= 4
          ? "grid-cols-1 min-[400px]:grid-cols-2"
          : "grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3";

  return (
    <main
      id="main-content"
      className="report-print-root min-h-screen overflow-x-hidden bg-[#f7f7f5] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] print:overflow-visible print:bg-white print:pt-0 print:pb-0 sm:py-12 sm:pb-12 md:py-16 md:pb-16"
    >
      <div className="report-sheet mx-auto max-w-[820px] px-4 print:max-w-none print:px-0 sm:px-6">
        <div className="no-print mb-6 space-y-4 sm:mb-8 sm:space-y-5">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
            <Link href="/" className="inline-flex min-h-11 shrink-0 items-center">
              <Image
                src="/swij-logo-horizontal.png"
                alt="Sleep Wellness Institute Japan"
                width={160}
                height={40}
                className="h-auto w-[110px] sm:w-[140px]"
              />
            </Link>
            <p
              className="text-[10px] font-semibold tracking-[0.22em] sm:text-xs sm:tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              AI ANALYSIS
            </p>
          </div>
          <AnalysisFlow current={4} />
          {isDemoLayout ? (
            <div className="rounded-2xl border border-[#8a6a2d]/30 bg-[#fbf9f4] px-4 py-3 text-[13px] leading-6 text-[#071426] sm:px-5">
              <p className="font-semibold" style={{ color: GOLD }}>
                レイアウト確認用ダミー表示
              </p>
              <p className="mt-1 text-slate-600">
                分析データがないため、テスト用のダミー結果を表示しています。実際のOCR・分析結果ではありません。
                強制表示は{" "}
                <a
                  href="/analysis/result?demo=1"
                  className="underline underline-offset-2"
                  style={{ color: NAVY }}
                >
                  /analysis/result?demo=1
                </a>
                でも開けます。
              </p>
            </div>
          ) : null}
        </div>

        {(aiPending || aiFailed) && (
          <div
            className={`no-print mb-4 rounded-2xl border px-4 py-3 text-[13px] leading-6 sm:mb-5 sm:px-5 ${
              aiFailed
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-[#315f68]/20 bg-[#f4f7f7] text-[#071426]"
            }`}
          >
            {aiFailed
              ? "Insight・宿題・コメントの生成に失敗しました。Sleep Wellness Score と確認済みデータは表示されています。入力画面から再実行できます。"
              : "Sleep Wellness Score を先に表示しています。Insight・宿題・コメントを生成中です…"}
          </div>
        )}

        {/* ===== Expert Report (PDF: 3 pages / 7-section reading flow) ===== */}
        <article className="report-page report-page-text overflow-hidden rounded-[28px] border border-slate-200/80 bg-white px-4 py-6 shadow-[0_24px_70px_-48px_rgba(7,20,38,.22)] print:overflow-visible print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none sm:px-9 sm:py-10 md:px-11 md:py-11">
          {/* —— PDF page 1: ①基本情報 → ②SOXAIデータ → ③AIカルテ —— */}
          <div className="report-print-page report-print-page-1">
            <header className="report-header">
              <div className="flex items-start justify-between gap-3 border-b border-[#071426]/12 pb-4 sm:gap-4 sm:pb-6">
                <div className="min-w-0">
                  <Image
                    src="/swij-logo-horizontal.png"
                    alt="Sleep Wellness Institute Japan"
                    width={220}
                    height={55}
                    className="report-logo h-auto w-[100px] object-contain sm:w-[148px]"
                    priority
                  />
                  <p
                    className="mt-3 text-[10px] font-semibold tracking-[0.22em] sm:mt-4"
                    style={{ color: GOLD }}
                  >
                    EXPERT REPORT
                  </p>
                  <h1
                    className="report-title mt-1.5 break-words text-[1.3rem] font-semibold leading-tight tracking-[-0.04em] sm:mt-2 sm:text-[1.9rem] sm:leading-normal"
                    style={{ color: NAVY }}
                  >
                    Sleep Wellness Expert Report
                  </h1>
                  <p className="mt-2 text-[13px] leading-5 text-slate-500 sm:text-[15px] sm:leading-6">
                    Sleep Wellness Institute Japan · 睡眠ウェルネス専門レポート
                  </p>
                </div>

                <div className="report-score-block flex shrink-0 gap-5 text-right sm:gap-7">
                  <div>
                    <p
                      className="text-[10px] font-semibold tracking-[0.08em] sm:text-[11px] sm:tracking-[0.12em]"
                      style={{ color: GOLD }}
                    >
                      Sleep Wellness Score
                    </p>
                    <p
                      className="report-score mt-1 text-[2.35rem] leading-none font-semibold tracking-[-0.06em] sm:text-[3.25rem]"
                      style={{ color: NAVY }}
                    >
                      {score}
                    </p>
                    <p className="mt-1 text-[11px] tracking-[0.12em] text-slate-400">
                      / 100
                    </p>
                    <p className="mt-2 max-w-[8.5rem] text-[9px] leading-3 text-slate-400 sm:max-w-[11rem] sm:text-[11px] sm:leading-4">
                      生活・環境・測定を総合した独自指標
                      <span className="block">（SOXAIスコアとは別）</span>
                    </p>
                  </div>
                  <div className="border-l border-[#071426]/10 pl-5 sm:pl-7">
                    <p
                      className="text-[10px] font-semibold tracking-[0.08em] sm:text-[11px] sm:tracking-[0.12em]"
                      style={{ color: GOLD }}
                    >
                      回復指数
                    </p>
                    {recoveryIndex.available ? (
                      <>
                        <p
                          className="mt-1 text-[2.35rem] leading-none font-semibold tracking-[-0.06em] sm:text-[3.25rem]"
                          style={{ color: recoveryIndex.accent }}
                        >
                          {recoveryIndex.score}
                        </p>
                        <p className="mt-1 text-[11px] tracking-[0.12em] text-slate-400">
                          / 100
                        </p>
                        <p
                          className="mt-2 text-[11px] font-semibold"
                          style={{ color: recoveryIndex.accent }}
                        >
                          {recoveryIndex.emoji} {recoveryIndex.label}
                        </p>
                      </>
                    ) : (
                      <>
                        <p
                          className="mt-2 text-[1.15rem] font-semibold leading-snug tracking-[-0.03em] sm:text-[1.35rem]"
                          style={{ color: NAVY }}
                        >
                          —
                        </p>
                        <p className="mt-2 max-w-[7.5rem] text-[9px] leading-3 text-slate-400 sm:max-w-[9rem] sm:text-[11px] sm:leading-4">
                          {recoveryIndex.message}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <div className="report-panel report-recovery mt-5 sm:mt-6">
              <RecoveryIndexCard
                value={recoveryIndex}
                hrv={confirmedMetrics.hrv}
                restingHeartRate={confirmedMetrics.restingHeartRate}
              />
            </div>

            <section className="report-panel report-basics mt-5 rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-4 py-4 sm:mt-6 sm:px-5">
              <SectionLabel title="① 基本情報" eyebrow="PROFILE" />
              <ReportLead>
                今回の測定に関するお客様情報です。年齢・性別がある場合は評価の参考に用います。
              </ReportLead>
              <div className="report-meta flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-slate-600 sm:gap-x-7 sm:text-base">
                <p>
                  <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                    NAME
                  </span>
                  <span className="font-medium" style={{ color: NAVY }}>
                    {result.clientName?.trim() || UNMEASURED}
                  </span>
                </p>
                <p>
                  <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                    DATE
                  </span>
                  <span className="font-medium" style={{ color: NAVY }}>
                    {formatDateLabel(result.measurementDate)}
                  </span>
                </p>
                <p>
                  <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                    AGE
                  </span>
                  <span className="font-medium" style={{ color: NAVY }}>
                    {result.age?.trim() ? `${result.age.trim()}歳` : UNMEASURED}
                  </span>
                </p>
                <p>
                  <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                    SEX
                  </span>
                  <span className="font-medium" style={{ color: NAVY }}>
                    {formatGenderLabel(result.gender) || UNMEASURED}
                  </span>
                </p>
              </div>
              {!hasAgeAndGender(result) && (
                <p className="no-print mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] leading-6 text-amber-900">
                  年齢・性別を考慮していない参考分析
                </p>
              )}
              {lifestyleRows.length > 0 ? (
                <dl className="report-lifestyle-grid mt-4 grid grid-cols-1 gap-2 border-t border-[#071426]/08 pt-4 sm:grid-cols-2">
                  {lifestyleRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex min-w-0 items-baseline justify-between gap-3 rounded-lg border border-[#071426]/08 bg-white px-3 py-2"
                    >
                      <dt className="shrink-0 text-[11px] font-medium tracking-[0.04em] text-slate-400">
                        {row.label}
                      </dt>
                      <dd
                        className="min-w-0 break-words text-right text-[13px] font-semibold tracking-[-0.02em]"
                        style={{ color: NAVY }}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {profileRelationText ? (
                <div className="report-lifestyle-note mt-3 border-t border-[#071426]/08 pt-3">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                    生活とのつながり
                  </p>
                  <div className="mt-1.5">
                    <FormattedAiText text={profileRelationText} />
                  </div>
                </div>
              ) : null}
            </section>

            <section className="report-panel report-soxai mt-5 rounded-xl border border-[#071426]/10 bg-white px-4 py-4 sm:mt-6 sm:px-5">
              <SectionLabel title="② SOXAIデータ" eyebrow="SOXAI" />
              <ReportLead>
                ウェアラブルで測定し、講師が確認した睡眠データです。数値は今回1日分の記録です。
              </ReportLead>

              <div
                className="report-sleep-stages rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-3.5 py-3.5 sm:px-4 sm:py-4"
                style={{ width: "100%", minWidth: 0, height: "auto", overflow: "visible" }}
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  SLEEP STAGES
                </p>
                <h3
                  className="mt-1 text-[14px] font-semibold tracking-[-0.02em] sm:text-[15px]"
                  style={{ color: NAVY }}
                >
                  睡眠ステージ（覚醒 / レム / ノンレム）
                </h3>
                {/* 画面用（印刷時は CSS で非表示） */}
                <div className="screen-only-sleep-stages">
                  <SleepStagesOverview
                    metrics={confirmedMetrics}
                    graph={graphBundle.stages}
                    variant="featured"
                  />
                </div>
                {/* PDF印刷専用 DOM（2列×3段・横長）。画面では非表示 */}
                <div className="print-only-sleep-stages mt-2">
                  <SleepStagesPrintBlock metrics={confirmedMetrics} />
                </div>
              </div>

              <div className="report-metrics report-soxai-metrics-grid mt-3 grid grid-cols-2 gap-2 sm:mt-3.5 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4">
                {MEDICAL_METRIC_ROWS.map(({ label, key }) => {
                  const evaluation = evaluateMetric(key, confirmedMetrics);
                  const guide = metricGuideline(key);
                  const valueText =
                    key === "sleepScore"
                      ? displayValue(confirmedMetrics.sleepScore)
                      : displayValue(confirmedMetrics[key]);
                  return (
                    <div
                      key={label}
                      className="report-metric min-w-0 rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-2.5 py-2.5 sm:px-3.5 sm:py-3.5"
                    >
                      <p className="text-[10px] font-medium tracking-[0.04em] text-slate-400 sm:text-[11px]">
                        {label}
                      </p>
                      <p
                        className="mt-1 break-words text-[0.88rem] font-semibold tracking-[-0.03em] sm:text-[1.02rem]"
                        style={{ color: NAVY }}
                      >
                        {valueText}
                      </p>
                      {evaluation ? (
                        <p
                          className="mt-1 text-[10px] leading-4 tracking-[0.04em] sm:text-[11px]"
                          style={{ color: GOLD }}
                        >
                          {evaluation.starsLabel}
                          <span className="ml-1.5 font-medium text-slate-500">
                            {evaluation.label}
                          </span>
                        </p>
                      ) : null}
                      {guide ? (
                        <p className="mt-1.5 text-[9px] leading-3.5 text-slate-400 sm:text-[10px] sm:leading-4">
                          一般的な目安
                          <br />
                          {guide}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {(() => {
                  const range = formatHrvRange(confirmedMetrics);
                  if (!range) return null;
                  const evaluation = evaluateMetric("hrvRange", confirmedMetrics);
                  return (
                    <div className="report-metric min-w-0 rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-2.5 py-2.5 sm:px-3.5 sm:py-3.5">
                      <p className="text-[10px] font-medium tracking-[0.04em] text-slate-400 sm:text-[11px]">
                        HRVレンジ
                      </p>
                      <p
                        className="mt-1 break-words text-[0.88rem] font-semibold tracking-[-0.03em] sm:text-[1.02rem]"
                        style={{ color: NAVY }}
                      >
                        {range}
                      </p>
                      {evaluation ? (
                        <p
                          className="mt-1 text-[10px] leading-4 tracking-[0.04em] sm:text-[11px]"
                          style={{ color: GOLD }}
                        >
                          {evaluation.starsLabel}
                          <span className="ml-1.5 font-medium text-slate-500">
                            {evaluation.label}
                          </span>
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-[9px] leading-3.5 text-slate-400 sm:text-[10px] sm:leading-4">
                        一般的な目安
                        <br />
                        {metricGuideline("hrv")}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </section>

            <section className="report-panel report-karte mt-5 rounded-xl border border-[#8a6a2d]/30 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-4 py-4 sm:mt-6 sm:px-5">
              <SectionLabel
                title="③ Sleep Wellness Insight"
                eyebrow="INSIGHT"
              />
              <ReportLead>
                睡眠データ・SOXAI・生活習慣を統合し、「最も重要な課題」「判断の根拠」「最も効果が高い改善」をまとめた記録です。認定講師がそのまま説明できる品質で作成しています。
              </ReportLead>
              {aiPending && !summaryText ? null : summaryText ? (
                <div className="report-assessment mb-3 rounded-lg border border-[#8a6a2d]/15 bg-white/70 px-3 py-2.5">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">
                    総評
                  </p>
                  <div className="report-summary mt-1">
                    <FormattedAiText text={summaryText} />
                  </div>
                </div>
              ) : null}
              <div className="report-summary mt-1">
                {aiPending ? (
                  <AiContentPendingPlaceholder label="Sleep Wellness Insight" />
                ) : karteSummaryText ? (
                  <FormattedKarteText text={karteSummaryText} />
                ) : (
                  <p className="text-[14px] leading-6 text-slate-400 sm:text-[15px] sm:leading-7">
                    {FORTHCOMING}
                  </p>
                )}
              </div>
              {result.clientId?.trim() ? (
                <Link
                  href={`/clients/${encodeURIComponent(result.clientId.trim())}`}
                  className="no-print mt-3 inline-flex text-[12px] font-medium transition hover:opacity-80"
                  style={{ color: GOLD }}
                >
                  Insight の時系列を見る
                </Link>
              ) : null}
            </section>
          </div>

          {/* —— PDF page 2: SOXAI詳細 → ④今日やる3つ → ⑤改善提案 —— */}
          <div className="report-print-page report-print-page-2 mt-8 border-t border-[#071426]/08 pt-8 print:mt-0 print:border-0 print:pt-0">
            <header className="report-page2-header mb-1 border-b border-[#071426]/10 pb-3">
              <p
                className="text-[10px] font-semibold tracking-[0.22em]"
                style={{ color: GOLD }}
              >
                ACTION PLAN
              </p>
              <h2
                className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em] sm:text-[1.2rem]"
                style={{ color: NAVY }}
              >
                今日からの整え方
              </h2>
              <p className="mt-1 text-[12px] leading-5 text-slate-500 sm:text-[13px]">
                データを踏まえた、すぐ実践できるアクションと改善の優先順位です。
              </p>
            </header>

            {printDetailPanels.length > 0 ? (
              <section className="report-panel report-soxai-detail mt-4 rounded-xl border border-[#071426]/10 bg-white px-4 py-4 sm:px-5">
                <SectionLabel
                  title="SOXAIデータ（詳細）"
                  eyebrow="BIO SIGNALS"
                />
                <ReportLead>
                  睡眠ステージ・ストレス・体内時計の動きです。②の数値とあわせてご覧ください。
                </ReportLead>

                {/* 睡眠ステージ6カードを1ブロックとして先に配置（固定高さ・absolute なし） */}
                {(() => {
                  const stagesPanel = printDetailPanels.find(
                    (panel) => panel.id === "stages",
                  );
                  if (!stagesPanel) return null;
                  return (
                    <div
                      className="report-detail-stages-block mt-2 rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-3 py-3"
                      style={{
                        display: "block",
                        width: "100%",
                        minWidth: 0,
                        height: "auto",
                        overflow: "visible",
                        position: "static",
                      }}
                    >
                      <p
                        className="text-[9px] font-semibold tracking-[0.18em]"
                        style={{ color: GOLD }}
                      >
                        {stagesPanel.subtitle}
                      </p>
                      <h3
                        className="mt-1 text-[13px] font-semibold tracking-[-0.02em]"
                        style={{ color: NAVY }}
                      >
                        {stagesPanel.title}
                      </h3>
                      <div className="screen-only-sleep-stages mt-1.5">
                        {stagesPanel.graph}
                      </div>
                      <div className="print-only-sleep-stages mt-2">
                        <SleepStagesPrintBlock metrics={confirmedMetrics} />
                      </div>
                    </div>
                  );
                })()}

                {/* ストレス・体内時計は睡眠ステージの下に通常フロー（absolute/負margin/transform 禁止） */}
                <div
                  className="report-detail-bio-row mt-2.5 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2"
                  style={{
                    display: "grid",
                    position: "static",
                    marginTop: "10px",
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  {printDetailPanels
                    .filter((panel) => panel.id !== "stages")
                    .map((panel) => (
                      <div
                        key={panel.id}
                        className="report-detail-panel min-w-0 rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-3 py-3"
                        style={{
                          position: "static",
                          height: "auto",
                          overflow: "visible",
                          minWidth: 0,
                        }}
                      >
                        <p
                          className="text-[9px] font-semibold tracking-[0.18em]"
                          style={{ color: GOLD }}
                        >
                          {panel.subtitle}
                        </p>
                        <h3
                          className="mt-1 text-[13px] font-semibold tracking-[-0.02em]"
                          style={{ color: NAVY }}
                        >
                          {panel.title}
                        </h3>
                        <div className="report-detail-chart mt-1.5">
                          {panel.graph}
                        </div>
                        {panel.values && panel.values.length > 0 ? (
                          <dl className="mt-2 space-y-1">
                            {panel.values.slice(0, 6).map((row) => (
                              <div
                                key={`${panel.id}-${row.label}`}
                                className="min-w-0"
                              >
                                <div className="flex min-w-0 items-baseline justify-between gap-2">
                                  <dt className="min-w-0 truncate text-[10px] text-slate-400">
                                    {row.label}
                                  </dt>
                                  <dd
                                    className="max-w-[55%] shrink-0 break-words text-right text-[11px] font-semibold tracking-[-0.02em]"
                                    style={{ color: NAVY }}
                                  >
                                    {row.value}
                                  </dd>
                                </div>
                                {row.evaluation ? (
                                  <p
                                    className="mt-0.5 text-right text-[9px] tracking-[0.04em]"
                                    style={{ color: GOLD }}
                                  >
                                    {row.evaluation}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </dl>
                        ) : null}
                        {panel.guide ? (
                          <p className="mt-2 text-[9px] leading-3.5 text-slate-400">
                            一般的な目安
                            <br />
                            {panel.guide}
                          </p>
                        ) : null}
                      </div>
                    ))}
                </div>
              </section>
            ) : null}

            <ClientWellnessReportSections
              result={result}
              lifestyle={pendingLifestyle}
              includeInstructorComment
            />

            <section className="report-panel report-today mt-4 rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-4 py-4 sm:px-5">
              <SectionLabel title="④ 今日やる3つ" eyebrow="TODAY" />
              <ReportLead>
                今夜〜明日中に取り組める、あなた専用の3つの行動です。いちばん上から順に進めてください。
              </ReportLead>
              <TodaysRecommendationsList items={todaysRecommendations} />
            </section>

            <section className="report-panel report-improvements mt-4 rounded-xl border border-[#071426]/10 px-4 py-4 sm:px-5">
              <SectionLabel title="⑤ 改善提案" eyebrow="GUIDANCE" />
              <ReportLead>
                まず良かった点を確認し、そのうえで効果が高い順に整えたいポイントを示しています。すべてを一度に変える必要はありません。
              </ReportLead>

              <div className="report-improve-block">
                <p
                  className="mb-2 text-[12px] font-semibold tracking-[-0.01em] sm:text-[13px]"
                  style={{ color: NAVY }}
                >
                  今回の睡眠で良かった点
                </p>
                {aiPending && goodPoints.length === 0 ? (
                  <AiContentPendingPlaceholder label="良かった点" />
                ) : (
                  <BulletList items={goodPoints} />
                )}
              </div>

              <div className="report-improve-block mt-4 border-t border-[#071426]/08 pt-4">
                <p
                  className="mb-2 text-[12px] font-semibold tracking-[-0.01em] sm:text-[13px]"
                  style={{ color: NAVY }}
                >
                  整えたいポイント（優先度順）
                </p>
                {aiPending && improvements.length === 0 ? (
                  <AiContentPendingPlaceholder label="改善ポイント" />
                ) : (
                  <ImprovementsList items={improvements} />
                )}
              </div>
            </section>

            <section className="report-wellness-radar mt-4 rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-4 py-4 sm:px-5">
              <SectionLabel
                title="Sleep Wellness Score（4領域）"
                eyebrow="WELLNESS SCORE"
              />
              <ReportLead>
                身体・心・生活・環境のバランスを示した独自スコアです。各領域の点数根拠もあわせて確認できます。
              </ReportLead>
              {aiPending ? (
                <div className="mt-1">
                  <AiContentPendingPlaceholder label="スコアコメント" />
                </div>
              ) : scoreCommentText ? (
                <div className="report-score-comment mt-1">
                  <FormattedAiText text={scoreCommentText} />
                </div>
              ) : null}
              <div className="report-radar-layout mt-4 flex w-full min-w-0 flex-col items-center gap-5 sm:mt-5 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
                <WellnessRadarChart scores={categoryScores} size={340} />
                <ul className="grid w-full max-w-[220px] grid-cols-2 gap-2.5 sm:gap-3">
                  {categoryKeys.map((key) => (
                    <li
                      key={key}
                      className="min-w-0 rounded-xl border border-[#071426]/10 bg-white px-2.5 py-2.5 sm:px-3 sm:py-3"
                    >
                      <p className="text-[10px] font-medium tracking-[0.04em] text-slate-400">
                        {WELLNESS_CATEGORY_LABELS[key]}
                      </p>
                      <p
                        className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.03em] sm:text-[1.2rem]"
                        style={{ color: NAVY }}
                      >
                        {categoryScores[key]}
                        <span className="ml-0.5 text-[11px] font-medium tracking-normal text-slate-400">
                          /100
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              {!aiPending && result.categoryScoreRationales ? (
                <ul className="mt-4 space-y-2.5 border-t border-[#071426]/08 pt-4">
                  {categoryKeys.map((key) => {
                    const rationale =
                      result.categoryScoreRationales?.[key]?.trim() ?? "";
                    if (!rationale) return null;
                    return (
                      <li
                        key={`rationale-${key}`}
                        className="rounded-lg border border-[#071426]/08 bg-white px-3 py-2.5"
                      >
                        <p
                          className="text-[12px] font-semibold tracking-[-0.01em]"
                          style={{ color: NAVY }}
                        >
                          {WELLNESS_CATEGORY_LABELS[key]}
                          <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                            {categoryScores[key]}/100 · なぜこの点数か
                          </span>
                        </p>
                        <p className="mt-1 text-[13px] leading-6 text-slate-600 sm:text-[14px]">
                          {renderRichText(rationale)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>

            {!aiPending && result.melatoninYogaPlan ? (
              <section className="report-panel mt-4 rounded-xl border border-[#8a6a2d]/25 bg-gradient-to-br from-[#fbf9f4] via-white to-[#f7f3ea] px-4 py-4 sm:px-5">
                <SectionLabel
                  title="メラトニンヨガ™連携"
                  eyebrow="MELATONIN YOGA"
                />
                <ReportLead>
                  Sleep Wellness Institute Japan 独自メソッド。今回の分析から推奨する Phase・呼吸法・入浴・朝の行動です。
                </ReportLead>
                <dl className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {(
                    [
                      ["推奨 Phase", result.melatoninYogaPlan.recommendedPhase],
                      ["推奨呼吸法", result.melatoninYogaPlan.breathing],
                      ["推奨入浴", result.melatoninYogaPlan.bathing],
                      ["朝の行動", result.melatoninYogaPlan.morningAction],
                    ] as const
                  )
                    .filter(([, value]) => value?.trim())
                    .map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-[#8a6a2d]/18 bg-white/80 px-3 py-2.5"
                      >
                        <dt
                          className="text-[11px] font-semibold tracking-[0.12em]"
                          style={{ color: GOLD }}
                        >
                          {label}
                        </dt>
                        <dd
                          className="mt-1 text-[13px] font-medium leading-6 tracking-[-0.01em] sm:text-[14px]"
                          style={{ color: NAVY }}
                        >
                          {value}
                        </dd>
                      </div>
                    ))}
                </dl>
              </section>
            ) : null}
          </div>

          {/* —— PDF page 3: ⑥AI宿題 → ⑦講師コメント —— */}
          <div className="report-print-page report-print-page-3 mt-8 border-t border-[#071426]/08 pt-8 print:mt-0 print:border-0 print:pt-0">
            <header className="report-page2-header mb-1 border-b border-[#071426]/10 pb-3">
              <p
                className="text-[10px] font-semibold tracking-[0.22em]"
                style={{ color: GOLD }}
              >
                FOLLOW-UP
              </p>
              <h2
                className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em] sm:text-[1.2rem]"
                style={{ color: NAVY }}
              >
                次回までの取り組み
              </h2>
            </header>

            <div className="report-homework">
              {aiPending ? (
                <section className="report-panel mt-4 rounded-xl border border-[#071426]/10 px-4 py-4 sm:px-5">
                  <SectionLabel title="⑥ AI宿題" eyebrow="HOMEWORK" />
                  <div className="mt-3">
                    <AiContentPendingPlaceholder label="AI宿題" />
                  </div>
                </section>
              ) : (
                <RecommendationsUntilNextCard
                  result={result}
                  title="⑥ AI宿題"
                  description="次回の分析までに取り組む宿題です（今日／今週／継続）。できたものからチェックを入れてください。"
                  onUpdated={(goals, achievement) =>
                    setResult((current) => ({
                      ...current,
                      recommendationsUntilNext: goals,
                      homeworkAchievement: achievement,
                    }))
                  }
                />
              )}
            </div>

            {aiPending ? (
              <section className="report-panel report-instructor-comment mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
                <div className="report-instructor-ai-suggestions rounded-lg border border-[#8a6a2d]/20 bg-[#fbf9f4] px-3.5 py-3.5 sm:px-4">
                  <SectionLabel
                    title="AIから講師への提案"
                    eyebrow="FOR INSTRUCTOR"
                  />
                  <div className="mt-3">
                    <AiContentPendingPlaceholder label="AIから講師への提案" />
                  </div>
                </div>
              </section>
            ) : (
              <InstructorCommentField
                suggestions={instructorSuggestions}
                counseling={result.instructorCounseling}
              />
            )}

            <section className="report-disclaimer mt-5 border-t border-[#071426]/12 pt-4 sm:mt-6">
              <h2
                className="text-sm font-semibold tracking-[-0.01em]"
                style={{ color: NAVY }}
              >
                注意事項／免責
              </h2>
              {cautionText ? (
                <p className="mt-2 text-[13px] leading-6 text-slate-500">
                  {cautionText}
                </p>
              ) : null}
              <p className="mt-1.5 text-[12px] leading-5 text-slate-400">
                {disclaimerText ||
                  "本レポートは医療行為・診断ではありません。体調に不安がある場合は医療機関にご相談ください。"}
              </p>
            </section>

            <footer className="report-powered mt-6 border-t border-[#071426]/10 pt-4 text-center sm:mt-7">
              <p className="text-[10px] font-semibold tracking-[0.28em] text-slate-400">
                Powered by
              </p>
              <p
                className="mt-1.5 text-[13px] font-semibold tracking-[0.04em] sm:text-sm"
                style={{ color: NAVY }}
              >
                Sleep Wellness Institute Japan
              </p>
            </footer>
          </div>

          {/* Screen-only supplements (not in 3-page PDF) */}
          <div className="no-print">
            {(previousComparison ||
              firstComparison ||
              result.comparisonNarrative?.vsPrevious ||
              result.comparisonNarrative?.vsFirst) ? (
              <PreviousComparisonSection
                summary={previousComparison}
                firstSummary={firstComparison}
                narrative={result.comparisonNarrative}
                clientId={result.clientId}
              />
            ) : null}

            {previousHomework ? (
              <PreviousHomeworkCard comparison={previousHomework} />
            ) : null}

            {followAlerts.length > 0 ? (
              <div className="mt-5 sm:mt-6">
                <AiFollowAlerts alerts={followAlerts} compact />
              </div>
            ) : null}

            <AnalysisAiIntelligenceSection
              result={result}
              previousSleepScore={previousSleepScore}
              previousMetrics={previousMetrics}
            />

            <section className="report-panel mt-5 rounded-xl border border-[#071426]/10 px-4 py-4 sm:mt-6 sm:px-5">
              <SectionLabel
                title="次回比較ポイント"
                eyebrow="NEXT CHECK"
              />
              <ReportLead>
                次回の分析で、前回と比べて見てほしい観点です。
              </ReportLead>
              <BulletList items={nextComparisonPoints} />
            </section>

            <InstituteBrandComment
              seed={`${result.analysisId ?? ""}|${result.measurementDate ?? ""}|${result.clientId ?? ""}`}
            />
          </div>
        </article>

        {/* ===== Visual Report (screen only; Expert PDF is 3 pages) ===== */}
        <article className="report-page report-page-visual no-print mt-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white px-4 py-6 shadow-[0_24px_70px_-48px_rgba(7,20,38,.22)] sm:mt-10 sm:px-9 sm:py-10 md:px-11 md:py-11">
          <header className="visual-header">
            <div className="flex items-start justify-between gap-3 border-b border-[#071426]/12 pb-4 sm:gap-4 sm:pb-5">
              <div className="min-w-0">
                <Image
                  src="/swij-logo-horizontal.png"
                  alt="Sleep Wellness Institute Japan"
                  width={220}
                  height={55}
                  className="report-logo h-auto w-[100px] object-contain sm:w-[148px]"
                />
                <h2
                  className="visual-title mt-3 break-words text-[1.2rem] font-semibold leading-tight tracking-[-0.04em] sm:mt-4 sm:text-[1.65rem] sm:leading-normal"
                  style={{ color: NAVY }}
                >
                  Sleep Wellness Visual Report
                </h2>
                <p className="visual-subtitle mt-2 text-sm leading-6 text-slate-500 sm:text-[15px]">
                  睡眠ステージ・生体指標の可視化
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  SLEEP SCORE
                </p>
                <p
                  className="mt-1.5 text-xl font-semibold tracking-[-0.04em] sm:mt-2 sm:text-2xl"
                  style={{ color: NAVY }}
                >
                  {displayValue(confirmedMetrics.sleepScore)}
                </p>
                <p className="mt-1 text-[11px] tracking-[0.12em] text-slate-400">
                  SOXAI
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <p>
                <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                  NAME
                </span>
                <span className="font-medium" style={{ color: NAVY }}>
                  {result.clientName?.trim() || UNMEASURED}
                </span>
              </p>
              <p>
                <span className="mr-2 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                  DATE
                </span>
                <span className="font-medium" style={{ color: NAVY }}>
                  {formatDateLabel(result.measurementDate)}
                </span>
              </p>
            </div>
          </header>

          <section className="visual-panels mt-5 grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
            {visualPanels.map((panel) => (
              <div
                key={panel.id}
                className={`visual-panel min-w-0 overflow-hidden rounded-xl border border-[#071426]/10 bg-[#fafaf8] px-3 py-3 sm:px-3.5 sm:py-4 ${
                  panel.id === "stages" ? "min-[400px]:col-span-2 sm:col-span-2" : ""
                }`}
              >
                <p
                  className="text-[9px] font-semibold tracking-[0.18em]"
                  style={{ color: GOLD }}
                >
                  {panel.subtitle}
                </p>
                <h3
                  className="mt-1 text-[13px] font-semibold tracking-[-0.02em] sm:text-sm"
                  style={{ color: NAVY }}
                >
                  {panel.title}
                  {panel.fromOcrGraph && (
                    <span className="ml-1.5 text-[9px] font-medium tracking-wide text-[#315f68]">
                      OCR
                    </span>
                  )}
                </h3>
                  {panel.graph}
                  {panel.values && panel.values.length > 0 && (
                    <dl className="mt-2.5 space-y-1.5">
                      {panel.values.map((row) => (
                        <div
                          key={`${panel.id}-${row.label}`}
                          className="min-w-0"
                        >
                          <div className="flex min-w-0 items-baseline justify-between gap-2">
                            <dt className="min-w-0 truncate text-[10px] text-slate-400 sm:text-[11px]">
                              {row.label}
                            </dt>
                            <dd
                              className="max-w-[55%] shrink-0 break-words text-right text-[12px] font-semibold tracking-[-0.02em] sm:text-[13px]"
                              style={{ color: NAVY }}
                            >
                              {row.value}
                            </dd>
                          </div>
                          {row.evaluation ? (
                            <p
                              className="mt-0.5 text-right text-[9px] tracking-[0.04em] sm:text-[10px]"
                              style={{ color: GOLD }}
                            >
                              {row.evaluation}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </dl>
                  )}
                  {panel.guide ? (
                    <p className="mt-2 text-[9px] leading-3.5 text-slate-400 sm:text-[10px] sm:leading-4">
                      一般的な目安
                      <br />
                      {panel.guide}
                    </p>
                  ) : null}
              </div>
            ))}
          </section>

          {visualImages.length > 0 ? (
            <div
              className={`visual-grid mt-5 grid gap-3 sm:mt-6 sm:gap-4 ${visualCols}`}
            >
              {visualImages.map((src, index) => (
                <figure
                  key={`visual-${index}`}
                  className="visual-cell overflow-hidden rounded-xl border border-[#071426]/10 bg-[#f4f4f2]"
                >
                  <div className="relative aspect-[3/4] w-full min-h-[180px] sm:min-h-[220px]">
                    <Image
                      src={src}
                      alt={`SOXAI測定画面 ${index + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="border-t border-[#071426]/08 px-3 py-1.5 text-center text-[11px] font-medium tracking-[0.08em] text-slate-400">
                    SCREEN {String(index + 1).padStart(2, "0")}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-[#fafaf8] px-5 py-10 text-center sm:mt-6">
              <p className="text-sm leading-7 text-slate-500 sm:text-[15px]">
                測定画面のプレビューは保存されていません。
                <br />
                上記パネルに抽出データが表示されています。
              </p>
            </div>
          )}

          <footer className="report-powered mt-6 border-t border-[#071426]/10 pt-4 text-center sm:mt-7">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-slate-400">
              Powered by
            </p>
            <p
              className="mt-1.5 text-[13px] font-semibold tracking-[0.04em] sm:text-sm"
              style={{ color: NAVY }}
            >
              Sleep Wellness Institute Japan
            </p>
          </footer>
        </article>

        <div className="no-print mt-7 sm:mt-10">
          <SessionEvidenceSurveyCard
            analysisId={result.analysisId}
            clientId={result.clientId}
          />
        </div>

        <div className="no-print mt-5 flex flex-col gap-2.5 pb-[calc(var(--sw-beta-chrome-offset)+1rem)] sm:mt-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3 sm:pb-[calc(var(--sw-beta-chrome-offset)+0.5rem)]">
          <button
            type="button"
            disabled={!pdfReady}
            onClick={() => {
              if (!pdfReady) return;
              const clientId = result.clientId?.trim();
              const analysisId = result.analysisId?.trim();
              if (clientId && analysisId) {
                void recordPdfDownload(
                  clientId,
                  analysisId,
                  "PDFダウンロード",
                );
              } else {
                const saved = loadLastSavedAnalysisRef();
                if (saved) {
                  void recordPdfDownload(
                    saved.clientId,
                    saved.analysisId,
                    "PDFダウンロード",
                  );
                }
              }
              success(
                aiFailed
                  ? "スコア確定レポートをPDF生成しました（AI本文は未生成）"
                  : "PDFを生成しました",
              );
              void fetch("/api/activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  category: "pdf",
                  action: "generate",
                  summary: "PDFレポートを生成しました",
                  targetType: "analysis",
                  targetId:
                    result.analysisId?.trim() ||
                    loadLastSavedAnalysisRef()?.analysisId ||
                    null,
                }),
              }).catch(() => {
                // best-effort
              });
              void fetch("/api/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "report_create",
                  resourceType: "report",
                  resourceId:
                    result.analysisId?.trim() ||
                    loadLastSavedAnalysisRef()?.analysisId ||
                    null,
                  summary: "レポートを作成しました",
                  payload: { format: "pdf" },
                }),
              }).catch(() => undefined);
              window.print();
            }}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition enabled:active:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:enabled:hover:opacity-90 sm:enabled:active:opacity-100"
            style={{ backgroundColor: NAVY }}
          >
            {aiPending
              ? "PDF準備中…"
              : aiFailed
                ? "PDFダウンロード（スコア版）"
                : "PDFダウンロード"}
          </button>

          <Link
            href="/clients"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-center text-base font-semibold transition active:bg-slate-50 sm:w-auto sm:hover:bg-slate-50 sm:active:bg-transparent"
            style={{ color: NAVY }}
          >
            クライアント一覧
          </Link>

          <Link
            href="/"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-center text-base font-semibold transition active:bg-slate-50 sm:w-auto sm:hover:bg-slate-50 sm:active:bg-transparent"
            style={{ color: NAVY }}
          >
            トップページへ戻る
          </Link>

          <Link
            href="/analysis/new"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-center text-base font-semibold transition active:bg-slate-50 sm:w-auto sm:hover:bg-slate-50 sm:active:bg-transparent"
            style={{ color: NAVY }}
          >
            新しい分析を作成
          </Link>
        </div>
      </div>
    </main>
  );
}
