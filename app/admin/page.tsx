"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import ExecutiveDashboard from "@/components/ExecutiveDashboard";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { AdminDashboardStats } from "@/lib/admin/types";
import { homeModulesForRole } from "@/lib/os/navigation";

const CARDS: Array<{
  key: keyof AdminDashboardStats;
  label: string;
  format: (stats: AdminDashboardStats) => string;
}> = [
  {
    key: "instructorCount",
    label: "認定講師数",
    format: (s) => String(s.instructorCount),
  },
  {
    key: "clientCount",
    label: "登録クライアント数",
    format: (s) => String(s.clientCount),
  },
  {
    key: "totalAnalyses",
    label: "総分析件数",
    format: (s) => String(s.totalAnalyses),
  },
  {
    key: "analysesThisMonth",
    label: "今月の分析件数",
    format: (s) => String(s.analysesThisMonth),
  },
  {
    key: "averageSleepScore",
    label: "Sleep Wellness Score平均",
    format: (s) =>
      s.averageSleepScore != null ? s.averageSleepScore.toFixed(1) : "—",
  },
  {
    key: "newRegistrationsThisMonth",
    label: "今月の新規登録数",
    format: (s) => String(s.newRegistrationsThisMonth),
  },
  {
    key: "retentionRate",
    label: "継続率",
    format: (s) => (s.retentionRate != null ? `${s.retentionRate}%` : "—"),
  },
];

const OS_MODULES = homeModulesForRole("admin");

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const json = (await response.json()) as {
          stats?: AdminDashboardStats;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        setStats(json.stats ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell
      eyebrow="SLEEP WELLNESS OS · ADMIN"
      title="SWIJ Dashboard"
      description="Sleep Wellness OS の管理ホーム。Academy・Insights・Research・Community・System へ素早く移動できます。"
      actions={
        <Link
          href="/admin/instructors"
          className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white"
          style={{ backgroundColor: NAVY }}
        >
          認定講師を管理
        </Link>
      }
    >
      <section className="mb-10" id="executive">
        <ExecutiveDashboard />
      </section>

      <section className="mb-10">
        <p
          className="text-[10px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          OS MODULES
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OS_MODULES.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 transition hover:border-[#071426]/20"
            >
              <p
                className="text-[10px] font-semibold tracking-[0.2em]"
                style={{ color: GOLD }}
              >
                {module.eyebrow}
              </p>
              <p
                className="mt-3 text-lg font-semibold tracking-[-0.03em]"
                style={{ color: NAVY }}
              >
                {module.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {module.description}
              </p>
              <p
                className="mt-4 text-[12px] font-semibold"
                style={{ color: TEAL }}
              >
                開く →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-[28px]" />
          ))}
        </div>
      ) : error ? (
        <SectionCard title="読み込みエラー">
          <p className="text-sm text-slate-600">{error}</p>
        </SectionCard>
      ) : stats ? (
        <div>
          <p
            className="mb-4 text-[10px] font-semibold tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            OPERATIONS KPIs
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {CARDS.map((card) => (
              <article
                key={card.key}
                className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)]"
              >
                <p
                  className="text-[10px] font-semibold tracking-[0.2em]"
                  style={{ color: GOLD }}
                >
                  {card.label.toUpperCase()}
                </p>
                <p
                  className="mt-4 text-3xl font-semibold tracking-[-0.04em]"
                  style={{ color: NAVY }}
                >
                  {card.format(stats)}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
