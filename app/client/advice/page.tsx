"use client";

import Link from "next/link";
import {
  ClientDailyAdviceCard,
  ClientDailyBreathingCard,
  ClientDailyYogaCard,
} from "@/components/ClientDailyWellnessSections";
import { ClientHomeAiComment } from "@/components/ClientHomeStatusPanels";
import SectionCard from "@/components/ui/SectionCard";
import EmptyState from "@/components/ui/EmptyState";
import { GOLD, NAVY } from "@/components/ui/tokens";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import { buildTodaysAdviceItems } from "@/lib/client-portal/helpers";
import { CLIENT_PORTAL_ROUTES } from "@/lib/client-portal/constants";
import { pickDailyAdvice } from "@/lib/client-daily-content";
import type { AnalysisResult } from "@/lib/analysis-session";

export default function ClientAdvicePage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  const latest = bundle.data.client.analyses[0] ?? null;
  const result: AnalysisResult | null = latest?.result
    ? {
        ...latest.result,
        analysisId: latest.result.analysisId?.trim() || latest.id,
      }
    : null;

  const adviceItems = buildTodaysAdviceItems(
    result?.todaysRecommendations ?? [],
    result?.goodPoints ?? [],
    (result?.improvements ?? []).map((item) =>
      typeof item === "string" ? item : item.text,
    ),
  );

  const fallback = pickDailyAdvice(result);
  const displayItems =
    adviceItems.length > 0
      ? adviceItems
      : [
          fallback,
          "深睡眠が改善しています",
          "HRVが低いため回復を優先してください",
        ].filter(Boolean);

  return (
    <ClientPortalShell eyebrow="TODAY'S ADVICE" title="Today's Advice">
      <SectionCard eyebrow="SLEEP COACH" title="今朝の Sleep Coach">
        <p className="text-[14px] leading-7 text-slate-600">
          睡眠状態・コンディション・おすすめ行動・メラトニンヨガ™・励ましメッセージは
          Sleep Coach でまとめて確認できます。
        </p>
        <Link
          href={CLIENT_PORTAL_ROUTES.coach}
          className="mt-3 inline-flex text-[13px] font-semibold"
          style={{ color: GOLD }}
        >
          Sleep Coach を開く →
        </Link>
      </SectionCard>

      <SectionCard eyebrow="AI" title="AIによる今日のアドバイス">
        {displayItems.length === 0 ? (
          <EmptyState
            compact
            illustration="generic"
            title="アドバイスはまだありません"
            description="分析結果が揃うと、AIアドバイスが表示されます。"
          />
        ) : (
          <ul className="space-y-3">
            {displayItems.slice(0, 6).map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[#8a6a2d]/18 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-4 py-3.5 text-[14px] leading-7 text-slate-700"
              >
                <span className="mr-2 font-semibold" style={{ color: NAVY }}>
                  ・
                </span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard eyebrow="DAILY" title="今日の睡眠ウェルネスアドバイス">
        <ClientDailyAdviceCard result={result} />
      </SectionCard>

      <SectionCard eyebrow="AI COMMENT" title="今日のAIコメント">
        <ClientHomeAiComment result={result} />
      </SectionCard>

      <SectionCard eyebrow="YOGA" title="メラトニンヨガ™">
        <ClientDailyYogaCard />
      </SectionCard>

      <SectionCard eyebrow="BREATH" title="今日の呼吸法">
        <ClientDailyBreathingCard />
      </SectionCard>
    </ClientPortalShell>
  );
}
