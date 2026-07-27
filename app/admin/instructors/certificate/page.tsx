"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import InstructorLicenseCertificateSheet from "@/components/InstructorLicenseCertificateSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  formatLegalNameDisplay,
  licenseVerificationUrl,
} from "@/lib/instructor-license/constants";
import type { AdminCertifiedInstructorListItem } from "@/lib/instructor-license/types";

function CertificateContent() {
  const searchParams = useSearchParams();
  const instructorId = searchParams.get("id")?.trim() ?? "";
  const [item, setItem] = useState<AdminCertifiedInstructorListItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!instructorId) {
        setLoading(false);
        setError("講師 ID が指定されていません");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/certified-instructors", {
          cache: "no-store",
        });
        const json = (await response.json()) as {
          instructors?: AdminCertifiedInstructorListItem[];
          error?: string;
        };
        if (response.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent(
            `/admin/instructors/certificate?id=${encodeURIComponent(instructorId)}`,
          )}`;
          return;
        }
        if (response.status === 403) {
          window.location.href = "/forbidden";
          return;
        }
        if (!response.ok) {
          throw new Error(json.error ?? "取得に失敗しました");
        }
        const found =
          (json.instructors ?? []).find(
            (row) => row.instructorId === instructorId,
          ) ?? null;
        if (!cancelled) {
          setItem(found);
          if (!found) setError("認定講師が見つかりません");
          else if (!found.license) setError("ライセンスが未発行です");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "取得に失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [instructorId]);

  const verificationUrl = useMemo(() => {
    const code = item?.license?.verificationCode?.trim() ?? "";
    return code ? licenseVerificationUrl(code) : "/license/verify";
  }, [item]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-[calc(var(--sw-beta-chrome-offset)+1rem)]">
      <Link
        href="/admin/instructors"
        className="inline-flex text-[13px] font-semibold text-[#315f68] hover:text-[#8a6a2d]"
      >
        ← 認定講師一覧へ戻る
      </Link>

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-900">
          {error}
        </p>
      ) : item?.license ? (
        <div className="space-y-3">
          <p className="text-[13px] text-slate-600">
            活動名：{item.activityName} ／ 本名：
            {formatLegalNameDisplay(item.legalName)}
          </p>
          <InstructorLicenseCertificateSheet
            legalName={item.legalName}
            license={item.license}
            verificationUrl={verificationUrl}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function AdminInstructorCertificatePage() {
  return (
    <AdminShell
      title="デジタル認定証"
      description="認定講師のデジタル認定証プレビュー（管理者専用）"
    >
      <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl w-full" />}>
        <CertificateContent />
      </Suspense>
    </AdminShell>
  );
}
