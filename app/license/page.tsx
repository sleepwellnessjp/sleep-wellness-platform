"use client";

import { useEffect, useMemo, useState } from "react";
import LicenseCertificateSheet from "@/components/LicenseCertificateSheet";
import OsShell from "@/components/os/OsShell";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SUCCESS, DANGER, TEAL } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import {
  CERTIFICATION_LEVEL_LABELS,
  formatJaDate,
  formatYen,
  LICENSE_HISTORY_ACTION_LABELS,
  LICENSE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from "@/lib/license/constants";
import type { MyLicenseBundle } from "@/lib/license/types";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import { normalizeOsRole, type OsRole } from "@/lib/os/roles";

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return SUCCESS;
    case "renewal_pending":
      return TEAL;
    case "expired":
      return DANGER;
    case "suspended":
      return "#64748b";
    default:
      return "#64748b";
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LicensePage() {
  const { isDemoMode } = useAuth();
  const { data, loading: profileLoading } = usePlatformMe();
  const role: OsRole = normalizeOsRole(data?.profile.role ?? "instructor");

  const [bundle, setBundle] = useState<MyLicenseBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/license", { cache: "no-store" });
        const json = (await response.json()) as {
          bundle?: MyLicenseBundle;
          error?: string;
        };
        if (!response.ok) throw new Error(json.error ?? "取得に失敗しました");
        if (!cancelled) setBundle(json.bundle ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "取得に失敗しました");
          setBundle(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const remainingHours = useMemo(() => {
    const ce = bundle?.continuingEducation;
    if (!ce) return null;
    return Math.max(0, ce.requiredHours - ce.hoursCompleted);
  }, [bundle?.continuingEducation]);

  const onPrintCertificate = () => {
    window.print();
  };

  return (
    <OsShell
      role={role}
      contentClassName="mx-auto max-w-3xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10 md:px-8 md:py-12 lg:py-14"
    >
      <header className="mb-8 no-print sm:mb-10">
        <p
          className="text-[11px] font-semibold tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          MY LICENSE
        </p>
        <h1
          className="mt-3 break-words text-[1.65rem] font-semibold tracking-[-0.05em] sm:text-4xl"
          style={{ color: NAVY }}
        >
          ライセンス
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-7 text-slate-600 sm:text-[15px]">
          認定レベル・サブスクリプション・デジタル認定証・継続教育を確認できます。
          {isDemoMode ? "（デモデータ）" : ""}
        </p>
      </header>

      {loading || profileLoading ? (
        <div className="space-y-4 no-print">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ) : error ? (
        <SectionCard className="no-print" title="読み込みエラー">
          <p className="text-[14px] text-slate-600">{error}</p>
        </SectionCard>
      ) : !bundle?.license ? (
        <div className="no-print">
          <EmptyState
            title="ライセンスがまだありません"
            description="本部から認定ライセンスが発行されると、こちらに表示されます。"
          />
        </div>
      ) : (
        <div className="w-full space-y-5 sm:space-y-6">
          <SectionCard
            className="no-print"
            eyebrow="LICENSE"
            title="My License"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-white"
                style={{ backgroundColor: statusColor(bundle.license.status) }}
              >
                {LICENSE_STATUS_LABELS[bundle.license.status]}
              </span>
              <span className="text-[13px] font-semibold" style={{ color: NAVY }}>
                {
                  CERTIFICATION_LEVEL_LABELS[
                    bundle.license.certificationLevel
                  ]
                }
              </span>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                {
                  label: "現在の認定レベル",
                  value:
                    CERTIFICATION_LEVEL_LABELS[
                      bundle.license.certificationLevel
                    ],
                },
                {
                  label: "ライセンス番号",
                  value: bundle.license.licenseNumber,
                },
                {
                  label: "認定日",
                  value: formatJaDate(bundle.license.certifiedAt),
                },
                {
                  label: "有効期限",
                  value: formatJaDate(bundle.license.expiresAt),
                },
                {
                  label: "更新期限までの日数",
                  value:
                    bundle.daysUntilExpiry === null
                      ? "—"
                      : bundle.daysUntilExpiry >= 0
                        ? `${bundle.daysUntilExpiry} 日`
                        : `${Math.abs(bundle.daysUntilExpiry)} 日超過`,
                },
                {
                  label: "ライセンス状態",
                  value: LICENSE_STATUS_LABELS[bundle.license.status],
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/80 bg-[#fafaf8] px-4 py-3.5"
                >
                  <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                    {item.label}
                  </dt>
                  <dd
                    className="mt-1 break-all text-[15px] font-semibold"
                    style={{ color: NAVY }}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <p
                className="text-[13px] font-semibold"
                style={{ color: NAVY }}
              >
                更新履歴
              </p>
              {bundle.license.statusHistory.length === 0 ? (
                <p className="mt-2 text-[13px] text-slate-500">
                  更新履歴はまだありません。
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {[...bundle.license.statusHistory]
                    .reverse()
                    .map((entry, index) => (
                      <li
                        key={`${entry.at}-${index}`}
                        className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p
                            className="text-[14px] font-semibold"
                            style={{ color: NAVY }}
                          >
                            {LICENSE_HISTORY_ACTION_LABELS[entry.action] ??
                              entry.action}
                          </p>
                          <p className="text-[12px] text-slate-500">
                            {formatDateTime(entry.at)}
                          </p>
                        </div>
                        {entry.note ? (
                          <p className="mt-1 text-[13px] text-slate-600">
                            {entry.note}
                          </p>
                        ) : null}
                        {entry.fromStatus || entry.toStatus ? (
                          <p className="mt-0.5 text-[12px] text-slate-400">
                            {entry.fromStatus
                              ? LICENSE_STATUS_LABELS[entry.fromStatus]
                              : "—"}
                            {" → "}
                            {entry.toStatus
                              ? LICENSE_STATUS_LABELS[entry.toStatus]
                              : "—"}
                          </p>
                        ) : null}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </SectionCard>

          <SectionCard
            className="no-print"
            eyebrow="SUBSCRIPTION"
            title="Subscription"
          >
            {bundle.subscription ? (
              <>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      label: "現在のプラン",
                      value:
                        CERTIFICATION_LEVEL_LABELS[bundle.subscription.plan],
                    },
                    {
                      label: "状態",
                      value:
                        SUBSCRIPTION_STATUS_LABELS[bundle.subscription.status],
                    },
                    {
                      label: "月額",
                      value: formatYen(bundle.subscription.monthlyAmount),
                    },
                    {
                      label: "年額",
                      value: formatYen(bundle.subscription.yearlyAmount),
                    },
                    {
                      label: "請求サイクル",
                      value:
                        bundle.subscription.billingCycle === "yearly"
                          ? "年額"
                          : "月額",
                    },
                    {
                      label: "次回更新日",
                      value: formatJaDate(bundle.subscription.nextRenewalAt),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-200/80 bg-[#fafaf8] px-4 py-3.5"
                    >
                      <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                        {item.label}
                      </dt>
                      <dd
                        className="mt-1 text-[15px] font-semibold"
                        style={{ color: NAVY }}
                      >
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6">
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: NAVY }}
                  >
                    支払履歴
                  </p>
                  {bundle.paymentHistory.length === 0 ? (
                    <p className="mt-2 text-[13px] text-slate-500">
                      支払履歴はまだありません。
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {bundle.paymentHistory.map((pay) => (
                        <li
                          key={pay.id}
                          className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p
                              className="text-[14px] font-semibold"
                              style={{ color: NAVY }}
                            >
                              {formatYen(pay.amount)}
                            </p>
                            <p className="text-[12px] text-slate-500">
                              {PAYMENT_STATUS_LABELS[pay.status]} ·{" "}
                              {formatDateTime(pay.paidAt)}
                            </p>
                          </div>
                          <p className="mt-1 text-[13px] text-slate-600">
                            {pay.description || "—"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-400">
                            {pay.method || "—"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[14px] text-slate-600">
                サブスクリプション情報はありません。
              </p>
            )}
          </SectionCard>

          <SectionCard
            className="no-print"
            eyebrow="CERTIFICATE"
            title="Digital Certificate"
          >
            {bundle.certificate ? (
              <div className="space-y-4">
                <p className="text-[14px] leading-6 text-slate-600">
                  認定証の表示・印刷（PDF 相当）・QR / 認定番号を確認できます。
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={onPrintCertificate}>
                    PDF / 印刷
                  </Button>
                </div>
                <p className="text-[12px] text-slate-500">
                  認定番号:{" "}
                  <span className="font-semibold text-slate-700">
                    {bundle.certificate.certificateNumber}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-[14px] text-slate-600">
                認定証はまだ発行されていません。
              </p>
            )}
          </SectionCard>

          <SectionCard
            className="no-print"
            eyebrow="CONTINUING EDUCATION"
            title="Continuing Education"
          >
            {bundle.continuingEducation ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "受講時間",
                    value: `${bundle.continuingEducation.hoursCompleted} 時間`,
                  },
                  {
                    label: "取得単位",
                    value: `${bundle.continuingEducation.creditsEarned} 単位`,
                  },
                  {
                    label: "更新条件",
                    value: bundle.continuingEducation.renewalRequirement,
                  },
                  {
                    label: "残り必要時間",
                    value:
                      remainingHours === null
                        ? "—"
                        : `${remainingHours} 時間`,
                  },
                  {
                    label: "対象期間",
                    value: `${formatJaDate(bundle.continuingEducation.periodStart)} 〜 ${formatJaDate(bundle.continuingEducation.periodEnd)}`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border border-slate-200/80 bg-[#fafaf8] px-4 py-3.5 ${
                      item.label === "更新条件" || item.label === "対象期間"
                        ? "sm:col-span-2"
                        : ""
                    }`}
                  >
                    <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                      {item.label}
                    </dt>
                    <dd
                      className="mt-1 text-[15px] font-semibold leading-6"
                      style={{ color: NAVY }}
                    >
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-[14px] text-slate-600">
                継続教育の記録はまだありません。
              </p>
            )}
          </SectionCard>

          {bundle.certificate ? (
            <div className="report-print-root pt-2">
              <LicenseCertificateSheet
                license={bundle.license}
                certificate={bundle.certificate}
              />
            </div>
          ) : null}
        </div>
      )}
    </OsShell>
  );
}
