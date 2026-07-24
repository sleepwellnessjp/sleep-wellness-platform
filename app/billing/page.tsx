"use client";

import { useEffect, useState } from "react";
import OsShell from "@/components/os/OsShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  COMMERCIAL_STATUS_LABELS,
  formatPlanYen,
} from "@/lib/subscription/constants";
import type {
  CommercialPlanDefinition,
  CommercialPlanId,
  CommercialSubscriptionRecord,
} from "@/lib/subscription/types";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import { normalizeOsRole, type OsRole } from "@/lib/os/roles";

export default function BillingPage() {
  const { data } = usePlatformMe();
  const role: OsRole = normalizeOsRole(data?.profile.role ?? "instructor");
  const { success, error: toastError } = useToast();

  const [plans, setPlans] = useState<CommercialPlanDefinition[]>([]);
  const [subscription, setSubscription] =
    useState<CommercialSubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/subscription", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          plans?: CommercialPlanDefinition[];
          subscription?: CommercialSubscriptionRecord | null;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setPlans(json.plans ?? []);
        setSubscription(json.subscription ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  const selectPlan = async (planId: CommercialPlanId) => {
    setBusy(true);
    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = (await response.json()) as {
        subscription?: CommercialSubscriptionRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "更新に失敗しました");
      setSubscription(json.subscription ?? null);
      success("プランを選択しました（モック・課金未接続）");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OsShell
      role={role}
      eyebrow="BILLING"
      contentClassName="mx-auto max-w-4xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14"
    >
      <header className="mb-8 sm:mb-10">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          SUBSCRIPTION
        </p>
        <h1
          className="mt-3 text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-[1.85rem]"
          style={{ color: NAVY }}
        >
          プラン
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-7 text-slate-500">
          Basic / Professional / Enterprise。現時点はモック画面のみです。
        </p>
      </header>

      {subscription ? (
        <p
          className="mb-5 rounded-2xl border border-[#8a6a2d]/25 bg-[#faf7f1] px-4 py-3 text-[13px] leading-6"
          style={{ color: NAVY }}
        >
          現在のプラン: {subscription.planId}（
          {COMMERCIAL_STATUS_LABELS[subscription.status]}）— {subscription.mockNote}
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <SectionCard
              key={plan.id}
              eyebrow={plan.highlighted ? "RECOMMENDED" : "PLAN"}
              title={plan.name}
            >
              <p className="text-[14px] leading-7 text-slate-600">
                {plan.tagline}
              </p>
              <p
                className="mt-4 text-[1.35rem] font-semibold"
                style={{ color: NAVY }}
              >
                {formatPlanYen(plan.monthlyPrice)}
                {plan.monthlyPrice > 0 ? (
                  <span className="ml-1 text-[13px] font-medium text-slate-500">
                    /月
                  </span>
                ) : null}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-[13px] leading-6 text-slate-600"
                  >
                    · {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Button
                  type="button"
                  variant={plan.highlighted ? "primary" : "secondary"}
                  disabled={busy}
                  onClick={() => void selectPlan(plan.id)}
                >
                  このプランを選ぶ（モック）
                </Button>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </OsShell>
  );
}
