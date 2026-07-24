"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  COMMERCIAL_STATUS_LABELS,
  formatPlanYen,
} from "@/lib/subscription/constants";
import type {
  CommercialPlanDefinition,
  CommercialSubscriptionRecord,
} from "@/lib/subscription/types";

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<CommercialPlanDefinition[]>([]);
  const [subscriptions, setSubscriptions] = useState<
    CommercialSubscriptionRecord[]
  >([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/subscriptions", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          plans?: CommercialPlanDefinition[];
          subscriptions?: CommercialSubscriptionRecord[];
          note?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setPlans(json.plans ?? []);
        setSubscriptions(json.subscriptions ?? []);
        setNote(json.note ?? "");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell
      title="サブスクリプション"
      description="将来の課金に備えた Basic / Professional / Enterprise（モック画面）。"
    >
      {note ? (
        <p
          className="mb-5 rounded-2xl border border-[#8a6a2d]/25 bg-[#faf7f1] px-4 py-3 text-[13px] leading-6"
          style={{ color: NAVY }}
        >
          {note}
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
        <>
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
                <p className="mt-4 text-[1.35rem] font-semibold" style={{ color: NAVY }}>
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
                  <Button variant="secondary" disabled>
                    課金接続予定
                  </Button>
                </div>
              </SectionCard>
            ))}
          </div>

          <SectionCard
            className="mt-6"
            eyebrow="MOCK ROSTER"
            title="契約一覧（モック）"
          >
            {subscriptions.length === 0 ? (
              <p className="text-sm text-slate-500">契約データはありません。</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <p
                      className="text-[10px] font-semibold tracking-[0.18em]"
                      style={{ color: GOLD }}
                    >
                      {sub.planId.toUpperCase()}
                    </p>
                    <p className="mt-1 font-semibold" style={{ color: NAVY }}>
                      {sub.userDisplayName ?? sub.userEmail ?? sub.userId}
                    </p>
                    <p className="mt-1 text-[13px] text-slate-500">
                      {COMMERCIAL_STATUS_LABELS[sub.status]} ·{" "}
                      {sub.billingCycle === "yearly" ? "年額" : "月額"}
                      {sub.currentPeriodEnd
                        ? ` · 次回 ${sub.currentPeriodEnd}`
                        : ""}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      {sub.mockNote}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </AdminShell>
  );
}
