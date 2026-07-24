"use client";

import ClientPdfReportHistory from "@/components/ClientPdfReportHistory";
import SectionCard from "@/components/ui/SectionCard";
import EmptyState from "@/components/ui/EmptyState";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";

/** クライアント向けに分析詳細へ誘導する */
function clientReportHref(analysisId: string): string {
  return `/client/analyses/${encodeURIComponent(analysisId)}`;
}

export default function ClientReportsPage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  const analyses = bundle.data.client.analyses;

  return (
    <ClientPortalShell eyebrow="REPORT" title="Report">
      <SectionCard eyebrow="PDF" title="改善レポート">
        <p className="mb-4 text-[14px] leading-7 text-slate-600">
          認定講師が作成した改善レポートを閲覧できます。詳細画面から内容を確認・印刷（PDF）できます。
        </p>
        {analyses.length === 0 ? (
          <EmptyState
            compact
            illustration="history"
            title="レポートはまだありません"
            description="睡眠分析が完了すると、ここにレポート履歴が並びます。"
          />
        ) : (
          <ClientPdfReportHistory analyses={analyses} />
        )}
      </SectionCard>

      <SectionCard eyebrow="HISTORY" title="過去レポート">
        {analyses.length === 0 ? (
          <EmptyState
            compact
            illustration="history"
            title="過去レポートはありません"
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {analyses.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-[#071426]">
                    Sleep Report
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {item.analysisDate}
                  </p>
                </div>
                <a
                  href={clientReportHref(item.id)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[#8a6a2d]/30 bg-white px-4 text-[12px] font-semibold text-[#8a6a2d]"
                >
                  PDF閲覧
                </a>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </ClientPortalShell>
  );
}
