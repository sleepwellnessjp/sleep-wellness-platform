"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AcademyCertificateSheet from "@/components/AcademyCertificateSheet";
import InstructorNav from "@/components/InstructorNav";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import type { AcademyCredential } from "@/lib/academy/types";
import { loadAcademyDashboard } from "@/lib/repositories/academy-repository";

export default function AcademyCertificatePage() {
  const params = useParams();
  const credentialId = String(params.id ?? "");

  const [credential, setCredential] = useState<AcademyCredential | null>(null);
  const [displayName, setDisplayName] = useState("認定講師");
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadAcademyDashboard();
      const found = data.credentials.find((c) => c.id === credentialId) ?? null;
      setCredential(found);
      setDisplayName(data.displayName || "認定講師");
      setMissing(!found);
    } finally {
      setLoading(false);
    }
  }, [credentialId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="report-print-root min-h-screen bg-[#f7f7f5]">
      <div className="no-print">
        <InstructorNav eyebrow="ACADEMY" />
      </div>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              CERTIFICATE
            </p>
            <h1
              className="mt-2 text-2xl font-semibold tracking-[-0.04em]"
              style={{ color: NAVY }}
            >
              PDF認定証
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/academy?tab=certificates" variant="ghost" size="sm">
              戻る
            </Button>
            {credential && (
              <Button size="sm" onClick={handlePrint}>
                PDFダウンロード
              </Button>
            )}
          </div>
        </div>

        {loading && <SoftSkeleton variant="card" />}

        {!loading && missing && (
          <EmptyState
            title="認定証が見つかりません"
            description="マイ資格または認定証一覧から開き直してください。"
            primaryAction={{
              label: "一覧へ",
              href: "/academy?tab=certificates",
            }}
          />
        )}

        {!loading && credential && (
          <div className="report-sheet">
            <AcademyCertificateSheet
              credential={credential}
              holderName={displayName}
              className="report-page academy-certificate-page"
            />
          </div>
        )}
      </div>
    </main>
  );
}
