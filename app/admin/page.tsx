"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminHqDashboardView, {
  AdminHqDashboardLoading,
} from "@/components/admin/AdminHqDashboard";
import AdminShell from "@/components/AdminShell";
import ExecutiveDashboard from "@/components/ExecutiveDashboard";
import HqOpsMetrics, {
  HqOpsMetricsLoading,
} from "@/components/ops/HqOpsMetrics";
import SectionCard from "@/components/ui/SectionCard";
import { GOLD } from "@/components/ui/tokens";
import type { AdminHqDashboard } from "@/lib/admin/types";
import { SWIJ_EYEBROW_HQ } from "@/lib/brand/swij-brand";
import type { HqOpsDashboard } from "@/lib/ops/types";

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminHqDashboard | null>(null);
  const [ops, setOps] = useState<HqOpsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [opsLoading, setOpsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          dashboard?: AdminHqDashboard;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setDashboard(json.dashboard ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));

    void fetch("/api/admin/ops?resource=hq", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          dashboard?: HqOpsDashboard;
        };
        if (response.ok) setOps(json.dashboard ?? null);
      })
      .finally(() => setOpsLoading(false));
  }, []);

  return (
    <AdminShell
      eyebrow={SWIJ_EYEBROW_HQ}
      title="SWIJ 本部ダッシュボード"
      description="全国認定講師・認定校・分析・改善・イベントを一元管理する Sleep Wellness Institute Japan 本部専用コンソールです。"
    >
      <div className="mb-10">
        <Link
          href="/analysis/new"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-[15px] font-semibold text-white shadow-[0_20px_60px_-48px_rgba(15,23,42,0.35)] transition hover:opacity-90 sm:w-auto sm:min-h-11 sm:px-8"
          style={{ backgroundColor: "#071426" }}
        >
          新しい睡眠分析
        </Link>
      </div>

      <div className="mb-10">
        {opsLoading ? (
          <HqOpsMetricsLoading />
        ) : ops ? (
          <HqOpsMetrics data={ops} />
        ) : null}
      </div>

      {loading ? (
        <AdminHqDashboardLoading />
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : dashboard ? (
        <AdminHqDashboardView data={dashboard} />
      ) : null}

      <section className="mt-12 border-t border-slate-200/80 pt-10">
        <p
          className="mb-4 text-[10px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          EXECUTIVE VIEW
        </p>
        <ExecutiveDashboard />
      </section>
    </AdminShell>
  );
}
