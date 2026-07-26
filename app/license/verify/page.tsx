"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  formatJaDate,
  LICENSE_ISSUER_ORG,
  PUBLIC_LICENSE_STATUS_LABELS,
  resolveCertificationName,
} from "@/lib/instructor-license/constants";
import type {
  PublicLicenseStatusLabel,
  PublicLicenseVerification,
} from "@/lib/instructor-license/types";
import { DANGER, GOLD, NAVY, SUCCESS } from "@/components/ui/tokens";

function statusColor(status: PublicLicenseStatusLabel): string {
  switch (status) {
    case "active":
      return SUCCESS;
    case "expired":
      return DANGER;
    case "suspended":
    case "withdrawn":
    default:
      return "#64748b";
  }
}

function VerifyInner() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicLicenseVerification | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!code.trim()) {
        setError("確認コードが指定されていません");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/license/verify?code=${encodeURIComponent(code)}`,
          { cache: "no-store" },
        );
        const json = (await response.json()) as {
          verification?: PublicLicenseVerification;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error ?? "検証に失敗しました");
        }
        if (!cancelled) setResult(json.verification ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "検証に失敗しました");
          setResult(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const publicStatus = result?.publicStatus ?? "suspended";

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-12 pb-[calc(var(--sw-beta-chrome-offset)+2rem)] sm:px-6">
      <div className="mx-auto max-w-lg rounded-[28px] border border-[#d8b36a]/40 bg-white px-6 py-10 shadow-sm sm:px-10">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/swij-logo-horizontal.png"
            alt="Sleep Wellness Institute Japan"
            width={200}
            height={50}
            className="h-auto w-[160px]"
            priority
          />
          <p
            className="mt-6 text-[10px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            LICENSE VERIFICATION
          </p>
          <h1
            className="mt-3 text-2xl font-semibold tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            認定証の確認
          </h1>
        </div>

        {loading ? (
          <p className="mt-8 text-center text-[14px] text-slate-500">確認中…</p>
        ) : error ? (
          <div className="mt-8 space-y-4 text-center">
            <span
              className="inline-flex rounded-full px-4 py-1.5 text-[13px] font-semibold text-white"
              style={{ backgroundColor: DANGER }}
            >
              無効
            </span>
            <p className="text-[14px] text-slate-600">{error}</p>
          </div>
        ) : result ? (
          <div className="mt-8 space-y-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <span
                className="inline-flex rounded-full px-5 py-2 text-[15px] font-semibold text-white"
                style={{ backgroundColor: statusColor(publicStatus) }}
              >
                {PUBLIC_LICENSE_STATUS_LABELS[publicStatus]}
              </span>
              <p className="text-[12px] text-slate-500">
                {publicStatus === "active"
                  ? "この認定証は現在有効です"
                  : publicStatus === "expired"
                    ? "この認定証は有効期限を過ぎています"
                    : publicStatus === "withdrawn"
                      ? "この認定証は取消されています"
                      : "この認定証は停止中です"}
              </p>
            </div>

            <dl className="space-y-4 text-left">
              {[
                { label: "活動名", value: result.holderName },
                {
                  label: "認定資格名",
                  value: resolveCertificationName(result.certificationName),
                },
                { label: "認定番号", value: result.licenseNumber },
                { label: "認定日", value: formatJaDate(result.issuedAt) },
                { label: "有効期限", value: formatJaDate(result.expiresAt) },
                {
                  label: "状態",
                  value: PUBLIC_LICENSE_STATUS_LABELS[publicStatus],
                },
                {
                  label: "発行者",
                  value: result.issuerName || LICENSE_ISSUER_ORG,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200/80 bg-[#fafaf8] px-4 py-3"
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
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function LicenseVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f7f4ee] px-4 py-12">
          <p className="text-center text-[14px] text-slate-500">読み込み中…</p>
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
