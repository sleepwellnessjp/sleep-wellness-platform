"use client";

import { useEffect, useState } from "react";
import InstructorLicenseCertificateSheet from "@/components/InstructorLicenseCertificateSheet";
import OsShell from "@/components/os/OsShell";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY, SUCCESS, DANGER, TEAL } from "@/components/ui/tokens";
import {
  formatJaDate,
  INSTRUCTOR_LICENSE_STATUS_LABELS,
  INSTRUCTOR_RENEWAL_STATUS_LABELS,
} from "@/lib/instructor-license/constants";
import type { MyInstructorLicenseView } from "@/lib/instructor-license/types";
import { usePlatformMe } from "@/lib/platform/use-platform-me";
import { normalizeOsRole, type OsRole } from "@/lib/os/roles";

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return SUCCESS;
    case "expiring":
      return TEAL;
    case "pending":
      return GOLD;
    case "expired":
      return DANGER;
    case "suspended":
      return "#64748b";
    default:
      return "#64748b";
  }
}

export default function LicensePage() {
  const { data, loading: profileLoading } = usePlatformMe();
  const role: OsRole = normalizeOsRole(data?.profile.role ?? "instructor");

  const [view, setView] = useState<MyInstructorLicenseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<{
    path?: string | null;
    filter?: Record<string, unknown> | null;
    uid?: string | null;
    category?: string | null;
    code?: string | null;
    supabaseMessage?: string | null;
    details?: string | null;
    hint?: string | null;
    status?: number;
  } | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setDiagnostic(null);
    try {
      const response = await fetch("/api/license", { cache: "no-store" });
      const json = (await response.json()) as {
        view?: MyInstructorLicenseView;
        error?: string;
        errorType?: string;
        path?: string;
        filter?: Record<string, unknown> | null;
        uid?: string | null;
        category?:
          | "not_registered"
          | "rls"
          | "query"
          | "column_mismatch"
          | null;
        code?: string | null;
        supabaseMessage?: string | null;
        details?: string | null;
        hint?: string | null;
      };
      if (!response.ok) {
        const nextDiagnostic = {
          path: json.path ?? "/api/license",
          filter: json.filter ?? null,
          uid: json.uid ?? data?.profile.id ?? null,
          category: json.category ?? null,
          code: json.code ?? null,
          supabaseMessage: json.supabaseMessage ?? null,
          details: json.details ?? null,
          hint: json.hint ?? null,
          status: response.status,
        };
        console.error("[license] fetch failed", {
          ...nextDiagnostic,
          error: json.error,
          errorType: json.errorType,
        });
        if (json.errorType === "not_found") {
          setView({
            license: null,
            activityName: data?.profile.displayName || data?.profile.email || "",
            legalName: "",
            email: data?.profile.email || "",
            daysUntilExpiry: null,
            isExpiringSoon: false,
            renewalCondition: "",
            verificationUrl: null,
            licensePendingSetup: false,
            notCertifiedInstructor: true,
          });
          setError(null);
          setDiagnostic(null);
          return;
        }
        setDiagnostic(nextDiagnostic);
        throw new Error(
          json.error ?? "認定講師情報を取得できませんでした",
        );
      }
      setView(json.view ?? null);
    } catch (err) {
      console.error("[license] load error", {
        path: "/api/license → public.certified_instructors / public.instructor_licenses",
        uid: data?.profile.id ?? null,
        err,
      });
      setError(
        err instanceof Error
          ? err.message
          : "認定講師情報を取得できませんでした",
      );
      setView(null);
    } finally {
      setLoading(false);
    }
  };

  // 認証（platform me）の読み込み完了後に取得する
  useEffect(() => {
    if (profileLoading) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auth settled gate
  }, [profileLoading, data?.profile.id]);

  const onRequestRenewal = async () => {
    setRenewing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_renewal" }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "更新申請に失敗しました");
      setMessage("更新申請を受け付けました。事務局の審査をお待ちください。");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新申請に失敗しました");
    } finally {
      setRenewing(false);
    }
  };

  const license = view?.license ?? null;
  const canRequestRenewal =
    !!license &&
    license.status !== "suspended" &&
    license.renewalStatus !== "requested";

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
          認定情報・継続教育・デジタル認定証・更新申請を確認できます。
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
          {diagnostic ? (
            <dl className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3 text-[12px] text-slate-600">
              <div>
                <dt className="font-semibold text-slate-500">診断情報</dt>
                <dd className="mt-1 break-all font-mono leading-5">
                  {[
                    diagnostic.category
                      ? `category=${diagnostic.category}`
                      : null,
                    diagnostic.status ? `http=${diagnostic.status}` : null,
                    diagnostic.path ? `path=${diagnostic.path}` : null,
                    diagnostic.uid ? `uid=${diagnostic.uid}` : null,
                    diagnostic.code ? `code=${diagnostic.code}` : null,
                    diagnostic.supabaseMessage
                      ? `supabase=${diagnostic.supabaseMessage}`
                      : null,
                    diagnostic.details
                      ? `details=${diagnostic.details}`
                      : null,
                    diagnostic.hint ? `hint=${diagnostic.hint}` : null,
                    diagnostic.filter
                      ? `filter=${JSON.stringify(diagnostic.filter)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </dd>
              </div>
            </dl>
          ) : null}
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={() => void load()}>
              再読み込み
            </Button>
          </div>
        </SectionCard>
      ) : !view || view.notCertifiedInstructor ? (
        <div className="no-print">
          <EmptyState
            title="ライセンス情報はまだ登録されていません"
            description="ライセンス確認は認定講師のみ利用できます。事務局へお問い合わせください。"
          />
        </div>
      ) : view.licensePendingSetup || !license ? (
        <div className="no-print">
          <EmptyState
            title="ライセンス情報はまだ登録されていません"
            description="認定講師レコードは確認できましたが、ライセンス情報が未登録です。事務局へお問い合わせください。"
          />
        </div>
      ) : (
        <LicenseReadyView
          view={view}
          license={license}
          message={message}
          renewing={renewing}
          canRequestRenewal={canRequestRenewal}
          onRequestRenewal={onRequestRenewal}
        />
      )}
    </OsShell>
  );
}

function LicenseReadyView({
  view,
  license,
  message,
  renewing,
  canRequestRenewal,
  onRequestRenewal,
}: {
  view: MyInstructorLicenseView;
  license: NonNullable<MyInstructorLicenseView["license"]>;
  message: string | null;
  renewing: boolean;
  canRequestRenewal: boolean;
  onRequestRenewal: () => void;
}) {
  return (
        <div className="w-full space-y-5 sm:space-y-6">
          {view.isExpiringSoon ? (
            <div
              className="no-print rounded-2xl border px-4 py-3 text-[14px] font-semibold"
              style={{
                borderColor: `${TEAL}55`,
                backgroundColor: `${TEAL}12`,
                color: NAVY,
              }}
            >
              更新期限が近づいています
            </div>
          ) : null}

          {message ? (
            <p className="no-print text-[14px]" style={{ color: GOLD }}>
              {message}
            </p>
          ) : null}

          <SectionCard
            className="no-print"
            eyebrow="LICENSE"
            title="認定ライセンス"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex rounded-full px-3 py-1 text-[12px] font-semibold text-white"
                style={{ backgroundColor: statusColor(license.status) }}
              >
                {INSTRUCTOR_LICENSE_STATUS_LABELS[license.status]}
              </span>
              <span className="text-[13px] font-semibold" style={{ color: NAVY }}>
                {license.certificationLevelLabel}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { label: "活動名", value: view.activityName || "—" },
                { label: "本名", value: view.legalName || "—" },
                {
                  label: "認定レベル",
                  value: license.certificationLevelLabel,
                },
                {
                  label: "認定資格名",
                  value:
                    license.certificationName ||
                    license.certificationLevelLabel,
                },
                { label: "認定番号", value: license.licenseNumber },
                { label: "認定日", value: formatJaDate(license.issuedAt) },
                { label: "有効期限", value: formatJaDate(license.expiresAt) },
                {
                  label: "ライセンス状態",
                  value: INSTRUCTOR_LICENSE_STATUS_LABELS[license.status],
                },
                {
                  label: "更新までの残り日数",
                  value:
                    view.daysUntilExpiry === null
                      ? "—"
                      : view.daysUntilExpiry >= 0
                        ? `${view.daysUntilExpiry} 日`
                        : `${Math.abs(view.daysUntilExpiry)} 日超過`,
                },
                {
                  label: "継続教育の必要時間",
                  value: `${license.requiredEducationHours} 時間`,
                },
                {
                  label: "継続教育の修了時間",
                  value: `${license.completedEducationHours} 時間`,
                },
                {
                  label: "更新申請状況",
                  value:
                    INSTRUCTOR_RENEWAL_STATUS_LABELS[license.renewalStatus],
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
              <div className="rounded-2xl border border-slate-200/80 bg-[#fafaf8] px-4 py-3.5 sm:col-span-2">
                <dt className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                  更新条件
                </dt>
                <dd
                  className="mt-1 text-[15px] font-semibold leading-6"
                  style={{ color: NAVY }}
                >
                  {view.renewalCondition}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={onRequestRenewal}
                disabled={!canRequestRenewal || renewing}
              >
                {license.renewalStatus === "requested"
                  ? "更新申請済み"
                  : renewing
                    ? "申請中…"
                    : "更新申請"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.print()}
              >
                デジタル認定証を印刷
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            className="no-print"
            eyebrow="CERTIFICATE"
            title="デジタル認定証"
          >
            <p className="text-[14px] leading-6 text-slate-600">
              下の認定証を画面で確認するか、印刷 / PDF 保存できます。
            </p>
            {view.verificationUrl ? (
              <p className="mt-3 break-all text-[12px] text-slate-500">
                確認用 URL: {view.verificationUrl}
              </p>
            ) : null}
          </SectionCard>

          {view.verificationUrl ? (
            <div className="report-print-root pt-2">
              <InstructorLicenseCertificateSheet
                license={license}
                activityName={view.activityName}
                verificationUrl={view.verificationUrl}
              />
            </div>
          ) : null}
        </div>
  );
}
