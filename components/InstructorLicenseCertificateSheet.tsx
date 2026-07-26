"use client";

import Image from "next/image";
import { formatJaDate } from "@/lib/instructor-license/constants";
import { qrImageSrc } from "@/lib/license/qr";
import type { InstructorLicenseRecord } from "@/lib/instructor-license/types";
import { GOLD, NAVY } from "@/components/ui/tokens";

type Props = {
  license: InstructorLicenseRecord;
  activityName: string;
  verificationUrl: string;
  className?: string;
};

export default function InstructorLicenseCertificateSheet({
  license,
  activityName,
  verificationUrl,
  className = "",
}: Props) {
  const qrSrc = qrImageSrc(verificationUrl, 148);

  return (
    <article
      className={`license-certificate-sheet relative overflow-hidden rounded-[28px] border border-[#d8b36a]/50 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-6 py-10 sm:px-12 sm:py-14 ${className}`}
      style={{ color: NAVY }}
    >
      <div
        className="pointer-events-none absolute inset-4 rounded-[22px] border border-[#b89242]/35"
        aria-hidden
      />
      <div className="relative flex flex-col items-center text-center">
        <Image
          src="/swij-logo-horizontal.png"
          alt="Sleep Wellness Institute Japan"
          width={220}
          height={56}
          className="h-auto w-[160px] sm:w-[200px]"
          priority
        />
        <p
          className="mt-8 text-[10px] font-semibold tracking-[0.32em] sm:text-[11px]"
          style={{ color: GOLD }}
        >
          CERTIFIED INSTRUCTOR LICENSE
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          デジタル認定証
        </h1>
        <p className="mt-8 text-[13px] leading-7 text-slate-600 sm:text-[15px]">
          下記の者は、Sleep Wellness Institute Japan の
          <br className="sm:hidden" />
          所定の課程を修了しここに認定されたことを証します。
        </p>

        <p className="mt-10 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
          {activityName}
        </p>
        <div className="mt-2 h-px w-40 bg-[#d8b36a]/70" />

        <p className="mt-8 text-[11px] font-semibold tracking-[0.2em] text-slate-500">
          認定資格名
        </p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] sm:text-xl">
          {license.certificationName || license.certificationLevelLabel}
        </p>

        <dl className="mt-10 grid w-full max-w-lg gap-4 text-left sm:grid-cols-2">
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定番号
            </dt>
            <dd className="mt-1 break-all text-[14px] font-semibold tracking-[-0.02em]">
              {license.licenseNumber}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定レベル
            </dt>
            <dd className="mt-1 break-all text-[14px] font-semibold tracking-[-0.02em]">
              {license.certificationLevelLabel}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定日
            </dt>
            <dd className="mt-1 text-[14px] font-semibold tracking-[-0.02em]">
              {formatJaDate(license.issuedAt)}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              有効期限
            </dt>
            <dd className="mt-1 text-[14px] font-semibold tracking-[-0.02em]">
              {formatJaDate(license.expiresAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt="認定証確認用 QR"
            width={148}
            height={148}
            className="rounded-xl border border-slate-200 bg-white p-2"
          />
          <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-500">
            確認用 URL
          </p>
          <p className="max-w-md break-all font-mono text-[11px] leading-5 text-slate-600">
            {verificationUrl}
          </p>
        </div>

        <p className="mt-10 text-[12px] leading-6 text-slate-500">
          発行者
          <br />
          <span className="font-semibold text-slate-700">
            {license.issuerName}
          </span>
        </p>
      </div>
    </article>
  );
}
