"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlatformAccessStatus } from "@/lib/platform/types";

const NAVY = "#071426";

type AnalysisAccessBannerProps = {
  /** 親で取得済みの場合は再 fetch しない */
  access?: PlatformAccessStatus | null;
  loading?: boolean;
};

export default function AnalysisAccessBanner({
  access: externalAccess,
  loading: externalLoading,
}: AnalysisAccessBannerProps = {}) {
  const [fetchedAccess, setFetchedAccess] = useState<PlatformAccessStatus | null>(
    null,
  );
  const [fetchLoading, setFetchLoading] = useState(externalAccess === undefined);

  useEffect(() => {
    if (externalAccess !== undefined) return;
    void fetch("/api/platform/analysis-access", { cache: "no-store" })
      .then((response) => response.json())
      .then((json: PlatformAccessStatus) => setFetchedAccess(json))
      .catch(() => setFetchedAccess(null))
      .finally(() => setFetchLoading(false));
  }, [externalAccess]);

  const loading =
    externalAccess !== undefined ? (externalLoading ?? false) : fetchLoading;
  const access = externalAccess !== undefined ? externalAccess : fetchedAccess;

  if (loading || !access || access.allowed) return null;

  const isCreditsBlocked = access.reason === "credits";

  return (
    <div className="mb-5 rounded-[24px] border border-[#a33a3a]/25 bg-[#a33a3a]/06 px-4 py-4 sm:mb-6 sm:px-6">
      <p className="text-[11px] font-semibold tracking-[0.22em] text-[#a33a3a]">
        ANALYSIS BLOCKED
      </p>
      <p className="mt-2 break-words text-[14px] font-semibold leading-6 text-[#071426] sm:text-base sm:leading-7">
        {access.message}
      </p>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:gap-2">
        {isCreditsBlocked ? (
          <Link
            href="/portal#credit-pack-request"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition active:opacity-90 sm:w-auto"
            style={{ backgroundColor: NAVY }}
          >
            追加パックを申請する
          </Link>
        ) : (
          <Link
            href="/portal"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition active:opacity-90 sm:w-auto"
            style={{ backgroundColor: NAVY }}
          >
            マイポータルを確認
          </Link>
        )}
        <Link
          href="/dashboard"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition active:bg-slate-50 sm:w-auto"
        >
          ダッシュボードへ
        </Link>
      </div>
    </div>
  );
}
