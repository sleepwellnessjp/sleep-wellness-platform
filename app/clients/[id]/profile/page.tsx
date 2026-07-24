"use client";

import ClientProfileWizard, {
  PROFILE_STEPS,
} from "@/components/client-profile/ClientProfileWizard";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ClientProfileEditInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = typeof params.id === "string" ? params.id : "";
  const stepParam = searchParams.get("step");

  const initialStep = (() => {
    if (!stepParam) return 0;
    const byId = PROFILE_STEPS.findIndex((item) => item.id === stepParam);
    if (byId >= 0) return byId;
    const asNumber = Number(stepParam);
    if (
      Number.isFinite(asNumber) &&
      asNumber >= 0 &&
      asNumber < PROFILE_STEPS.length
    ) {
      return Math.floor(asNumber);
    }
    return 0;
  })();

  if (!clientId) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <p className="text-sm text-slate-400">クライアントIDが不正です</p>
      </main>
    );
  }

  return <ClientProfileWizard clientId={clientId} initialStep={initialStep} />;
}

export default function ClientProfileEditPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f7f5] px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <p className="text-sm text-slate-400">読み込み中...</p>
        </main>
      }
    >
      <ClientProfileEditInner />
    </Suspense>
  );
}
