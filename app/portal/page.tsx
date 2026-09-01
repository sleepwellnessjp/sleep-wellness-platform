"use client";

import Link from "next/link";
import InstructorClientFacingProfileCard from "@/components/InstructorClientFacingProfileCard";
import InstructorNav from "@/components/InstructorNav";
import CreditPackRequestSection from "@/components/CreditPackRequestSection";
import PlatformStatusCard from "@/components/PlatformStatusCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import {
  CERTIFICATION_LABELS,
  MEMBERSHIP_STATUS_LABELS,
} from "@/lib/platform/constants";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

export default function InstructorPortalPage() {
  const { data, loading, error, refresh } = usePlatformMe();

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="PORTAL" />

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="max-w-2xl">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            INSTRUCTOR PORTAL
          </p>
          <h1
            className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            マイポータル
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-slate-600 sm:text-base">
            認定資格・クレジット・分析履歴を確認できます。
            継続教育・認定更新はアカデミーから進められます。
          </p>
        </header>

        {loading && (
          <div className="mt-10">
            <SoftSkeleton variant="card" />
            <div className="mt-4">
              <SoftSkeleton variant="card" />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8">
            <ErrorState message={error} onRetry={() => void refresh()} />
          </div>
        )}

        {data && (
          <div className="mt-8 space-y-6 sm:mt-10">
            <PlatformStatusCard data={data} />

            {data.profile.role === "instructor" && <CreditPackRequestSection />}

            <InstructorClientFacingProfileCard />

            <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 sm:px-7 sm:py-8">
              <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
                <h2
                  className="text-lg font-semibold tracking-[-0.03em]"
                  style={{ color: NAVY }}
                >
                  認定資格詳細
                </h2>
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  MEMBERSHIP
                </p>
              </div>

              {data.membership ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  <DetailRow
                    label="資格"
                    value={CERTIFICATION_LABELS[data.membership.certificationType]}
                  />
                  <DetailRow
                    label="状態"
                    value={MEMBERSHIP_STATUS_LABELS[data.membership.status]}
                  />
                  <DetailRow label="認定日" value={data.membership.certifiedAt ?? "—"} />
                  <DetailRow label="有効期限" value={data.membership.expiresAt ?? "—"} />
                </dl>
              ) : (
                <EmptyState
                  compact
                  illustration="generic"
                  title="認定資格が登録されていません"
                  description="認定情報が紐づくと、ここに詳細が表示されます。"
                />
              )}

              <div className="mt-5">
                <Link
                  href="/academy"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#8a6a2d]/30 bg-[#faf7f1] px-5 py-2.5 text-[13px] font-semibold"
                  style={{ color: GOLD }}
                >
                  アカデミーを開く
                </Link>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 sm:px-7 sm:py-8">
              <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
                <h2
                  className="text-lg font-semibold tracking-[-0.03em]"
                  style={{ color: NAVY }}
                >
                  分析履歴
                </h2>
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  HISTORY
                </p>
              </div>

              {data.recentAnalyses.length === 0 ? (
                <EmptyState
                  compact
                  illustration="history"
                  title="まだ分析履歴がありません"
                  description="分析を完了すると、ここに履歴が表示されます。"
                  primaryAction={{
                    label: "新しい分析を作成",
                    href: "/analysis/new",
                  }}
                />
              ) : (
                <ul className="space-y-3">
                  {data.recentAnalyses.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold" style={{ color: NAVY }}>
                          {item.clientName}
                        </p>
                        <p className="mt-1 text-[12px] text-slate-400">
                          {item.measurementDate ?? item.createdAt.slice(0, 10)}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          睡眠スコア{" "}
                          <strong style={{ color: NAVY }}>
                            {item.sleepScore ?? "—"}
                          </strong>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <span className="text-[12px] text-slate-400">
                          {item.creditsConsumed > 0
                            ? `-${item.creditsConsumed} cr`
                            : "保存済み"}
                        </span>
                        {item.analysisId ? (
                          <Link
                            href={`/analysis/result?analysisId=${encodeURIComponent(item.analysisId)}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
                            style={{ backgroundColor: NAVY }}
                          >
                            詳細を見る
                          </Link>
                        ) : item.clientId ? (
                          <Link
                            href={`/clients/${item.clientId}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-semibold"
                            style={{ color: NAVY }}
                          >
                            詳細を見る
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/analysis/new"
                className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-base font-semibold text-white"
                style={{ backgroundColor: NAVY }}
              >
                新しい睡眠分析
              </Link>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-base font-semibold text-slate-600"
              >
                更新
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-xl bg-[#fafaf8] px-4 py-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-[#071426]">{value}</dd>
    </div>
  );
}
