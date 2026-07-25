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

export default function ClientReportsPage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();

  if (loading) return <ClientPortalLoading />;
  if (needsLogin) return <ClientPortalLoginGate />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  const analyses = bundle.data.client.analyses;

  const handleShare = async (report: {
    analysisId: string;
    title: string;
  }) => {
    const url = `${window.location.origin}/client/analyses/${encodeURIComponent(report.analysisId)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: report.title, url });
        return;
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  };

  return (
    <ClientPortalShell eyebrow="REPORT" title="Report">
      <SectionCard eyebrow="PDF" title="改善レポート履歴">
        <p className="mb-4 text-[14px] leading-7 text-slate-600">
          認定講師が作成した改善レポートを確認・印刷（PDF）できます。
        </p>
        {analyses.length === 0 ? (
          <EmptyState
            compact
            illustration="history"
            title="レポートはまだありません"
            description="睡眠分析が完了すると、ここにレポート履歴が並びます。"
          />
        ) : (
          <ClientPdfReportHistory
            analyses={analyses}
            onShare={(report) => {
              void handleShare(report);
            }}
          />
        )}
      </SectionCard>
    </ClientPortalShell>
  );
}
