"use client";

import { useEffect, useState, type ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, GOLD_LIGHT, NAVY, TEAL } from "@/components/ui/tokens";
import {
  AI_COUNSELING_HOMEWORK_CATEGORY_LABEL,
  generateAiCounselingAssistant,
  loadAiCounselingAssistantContext,
  type AiCounselingAssistant,
  type AiCounselingAssistantContext,
} from "@/lib/ai-counseling-assistant";

function InsightMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M20 11c.35 2.8 2.4 4.85 5.2 5.2-2.8.35-4.85 2.4-5.2 5.2-.35-2.8-2.4-4.85-5.2-5.2 2.8-.35 4.85-2.4 5.2-5.2Z"
        fill="currentColor"
      />
      <path
        d="M14 26.5h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

function AttentionMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3.8 21.2 20.2H2.8L12 3.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.2v5.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.1" r="0.95" fill="currentColor" />
    </svg>
  );
}

function AssistantBlock({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="break-inside-avoid rounded-[20px] border border-[#071426]/06 bg-white/85 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums text-white"
          style={{
            background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
          }}
        >
          {step}
        </span>
        <p
          className="text-[11px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          {title}
        </p>
      </div>
      <div className="mt-3 text-[14px] leading-7 text-slate-700 sm:text-[15px] sm:leading-8">
        {children}
      </div>
    </div>
  );
}

function SummaryList({
  items,
  tone,
}: {
  items: string[];
  tone: "improve" | "worsen" | "ongoing";
}) {
  const color =
    tone === "improve" ? TEAL : tone === "worsen" ? "#B45309" : GOLD;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span
            className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span className="font-medium" style={{ color: NAVY }}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type AiCounselingAssistantCardProps = {
  clientId: string;
  /** 事前取得済みコンテキスト（省略時は clientId からロード） */
  context?: AiCounselingAssistantContext | null;
  analysisHref?: string;
};

/**
 * AI Counseling Assistant — 認定講師向けカウンセリング準備カード。
 * 生成ロジックは lib/ai-counseling-assistant（ルールベース / 将来 LLM 差し替え可）。
 */
export default function AiCounselingAssistantCard({
  clientId,
  context: contextProp,
  analysisHref,
}: AiCounselingAssistantCardProps) {
  const [assistant, setAssistant] = useState<AiCounselingAssistant | null>(
    null,
  );
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const href =
    analysisHref ?? `/analysis/new?clientId=${encodeURIComponent(clientId)}`;

  useEffect(() => {
    let cancelled = false;
    setAssistant(null);
    setEmpty(false);
    setError(null);

    void (async () => {
      try {
        const ctx =
          contextProp === undefined
            ? await loadAiCounselingAssistantContext(clientId)
            : contextProp;

        if (!ctx || ctx.analyses.length === 0) {
          if (!cancelled) {
            setEmpty(true);
            setAssistant(null);
          }
          return;
        }

        const next = await generateAiCounselingAssistant(ctx);
        if (!cancelled) {
          setAssistant(next);
          setEmpty(false);
        }
      } catch (err: unknown) {
        console.error("[AiCounselingAssistantCard] generate failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "AI Counseling Assistant の生成に失敗しました。",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, contextProp, reloadKey]);

  if (error) {
    return (
      <ErrorState
        kind="ai"
        message={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        illustration="analysis"
        eyebrow="AI COUNSELING ASSISTANT"
        title="カウンセリング提案を表示できません"
        description="睡眠分析がまだないため、確認ポイント・宿題候補・リスクアラートを提案できません。初回分析後に自動で表示されます。"
        primaryAction={{ label: "睡眠分析を開始", href }}
      />
    );
  }

  if (!assistant) {
    return <SoftSkeleton variant="coach" />;
  }

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border border-[#8a6a2d]/30 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-6 shadow-[0_24px_70px_-48px_rgba(138,106,45,0.45)] sm:px-7 sm:py-8"
      aria-label="AI Counseling Assistant"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(216,179,106,0.85), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-35"
        style={{
          background:
            "radial-gradient(circle, rgba(216,179,106,0.35), transparent 70%)",
        }}
      />

      <div className="relative flex items-start gap-3 sm:gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_12px_28px_-16px_rgba(138,106,45,0.75)] sm:h-14 sm:w-14"
          style={{
            background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
          }}
          aria-hidden
        >
          <InsightMark className="h-7 w-7 text-white sm:h-8 sm:w-8" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            AI COUNSELING ASSISTANT
          </p>
          <h2
            className="mt-1.5 text-[1.2rem] font-semibold tracking-[-0.03em] sm:text-xl"
            style={{ color: NAVY }}
          >
            AI Counseling Assistant
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            睡眠データ・Journey・Homework・過去分析をもとに、次回カウンセリングの確認ポイントを提案します（診断ではありません）
          </p>
        </div>
      </div>

      {assistant.riskAlerts.length > 0 ? (
        <div
          className="relative mt-5 space-y-2.5 rounded-[20px] border border-[#8a6a2d]/22 bg-white/70 px-4 py-4 sm:mt-6 sm:px-5"
          aria-label="Risk Alerts"
        >
          <p
            className="text-[11px] font-semibold tracking-[0.16em]"
            style={{ color: GOLD }}
          >
            RISK ALERTS
          </p>
          <ul className="space-y-3">
            {assistant.riskAlerts.map((alert) => (
              <li key={alert.id} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "rgba(184, 146, 66, 0.12)",
                    color: "#b89242",
                  }}
                  aria-hidden
                >
                  <AttentionMark className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p
                    className="text-[14px] font-semibold tracking-[-0.02em] sm:text-[15px]"
                    style={{ color: NAVY }}
                  >
                    {alert.title}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
                    {alert.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="relative mt-5 grid gap-3 sm:mt-6 sm:gap-3.5">
        <AssistantBlock step="1" title="AI Summary">
          <div className="space-y-4">
            <div>
              <p
                className="text-[11px] font-semibold tracking-[0.12em] text-slate-400"
              >
                現在の睡眠状態
              </p>
              <p className="mt-1.5 whitespace-pre-wrap leading-7">
                {assistant.summary.currentState}
              </p>
            </div>
            <div>
              <p
                className="text-[11px] font-semibold tracking-[0.12em] text-slate-400"
              >
                前回から改善した点
              </p>
              <div className="mt-1.5">
                <SummaryList items={assistant.summary.improved} tone="improve" />
              </div>
            </div>
            <div>
              <p
                className="text-[11px] font-semibold tracking-[0.12em] text-slate-400"
              >
                悪化した点
              </p>
              <div className="mt-1.5">
                <SummaryList items={assistant.summary.worsened} tone="worsen" />
              </div>
            </div>
            <div>
              <p
                className="text-[11px] font-semibold tracking-[0.12em] text-slate-400"
              >
                継続している課題
              </p>
              <div className="mt-1.5">
                <SummaryList items={assistant.summary.ongoing} tone="ongoing" />
              </div>
            </div>
          </div>
        </AssistantBlock>

        <AssistantBlock step="2" title="AI Recommendations">
          <ol className="space-y-3">
            {assistant.recommendations.map((item) => (
              <li key={`${item.priority}-${item.title}`} className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-flex h-6 min-w-[3.25rem] shrink-0 items-center justify-center rounded-full border border-[#8a6a2d]/25 bg-[#faf7f1] px-2 text-[11px] font-semibold tabular-nums"
                  style={{ color: GOLD }}
                >
                  優先{item.priority}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="font-medium" style={{ color: NAVY }}>
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-6 text-slate-600 sm:text-[14px]">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </AssistantBlock>

        <AssistantBlock step="3" title="Suggested Homework">
          <ul className="space-y-3">
            {assistant.suggestedHomework.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5">
                <span
                  className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: GOLD }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="font-medium" style={{ color: NAVY }}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-5 text-slate-500 sm:text-[13px] sm:leading-6">
                    <span style={{ color: GOLD }}>
                      {AI_COUNSELING_HOMEWORK_CATEGORY_LABEL[item.category]}
                    </span>
                    {" · "}
                    {item.reason}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </AssistantBlock>
      </div>
    </section>
  );
}
