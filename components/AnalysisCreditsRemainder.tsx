"use client";

import { MONTHLY_CREDIT_ALLOWANCE } from "@/lib/platform/constants";
import type { PlatformAccessStatus } from "@/lib/platform/types";

type AnalysisCreditsRemainderProps = {
  access: PlatformAccessStatus | null;
  loading?: boolean;
};

export default function AnalysisCreditsRemainder({
  access,
  loading = false,
}: AnalysisCreditsRemainderProps) {
  if (loading || !access) return null;

  const isUnlimited =
    access.role === "super_admin" || access.role === "admin";

  return (
    <p className="mx-auto mb-4 max-w-xl text-center text-[13px] leading-6 text-slate-500 sm:mb-6">
      {isUnlimited ? (
        <>今月の分析回数: 制限なし</>
      ) : (
        <>
          今月の残り分析回数:{" "}
          <span className="font-medium text-slate-600">
            {access.remainingCredits}
          </span>{" "}
          / {MONTHLY_CREDIT_ALLOWANCE}
        </>
      )}
    </p>
  );
}
