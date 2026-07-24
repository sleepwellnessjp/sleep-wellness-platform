"use client";

import { useEffect, useState } from "react";
import BetaAgreementGate from "@/components/beta/BetaAgreementGate";
import OnboardingGuide from "@/components/OnboardingGuide";
import { resolveBetaAgreementAccepted } from "@/lib/first-visit";

/**
 * Version 2.7 — 認定講師向け Beta Agreement → Onboarding
 * Agreement 完了後にのみ Onboarding を有効化する。
 */
export default function InstructorBetaLaunchChrome({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  // SSR では同意状態不明のため false。マウント後に同期する。
  const [agreementDone, setAgreementDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const accepted = await resolveBetaAgreementAccepted();
      if (!cancelled) setAgreementDone(accepted);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <BetaAgreementGate
        enabled
        onAccepted={() => setAgreementDone(true)}
      />
      <OnboardingGuide enabled={agreementDone} />
    </>
  );
}
