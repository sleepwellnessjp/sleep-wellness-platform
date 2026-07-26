"use client";

import Image from "next/image";
import {
  formatJaDate,
  LICENSE_ISSUER_FOUNDER_NAME,
  LICENSE_ISSUER_FOUNDER_TITLE,
  LICENSE_ISSUER_ORG,
  resolveCertificationName,
} from "@/lib/instructor-license/constants";
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
  const qrSrc = qrImageSrc(verificationUrl, 140);
  const certificationName = resolveCertificationName(license.certificationName);

  return (
    <article
      className={`license-certificate-sheet relative overflow-hidden rounded-[28px] border border-[#d8b36a]/55 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-7 py-12 sm:px-14 sm:py-16 ${className}`}
      style={{ color: NAVY }}
    >
      <div
        className="license-cert-frame pointer-events-none absolute inset-5 rounded-[22px] border border-[#b89242]/40 sm:inset-6"
        aria-hidden
      />
      <div className="relative flex flex-col items-center px-1 text-center sm:px-2">
        <Image
          src="/swij-logo-horizontal.png"
          alt="Sleep Wellness Institute Japan"
          width={220}
          height={56}
          className="h-auto w-[148px] sm:w-[188px]"
          priority
        />
        <p
          className="mt-9 text-[10px] font-semibold tracking-[0.36em] sm:mt-10 sm:text-[11px]"
          style={{ color: GOLD }}
        >
          CERTIFIED INSTRUCTOR LICENSE
        </p>
        <h1 className="mt-5 text-[1.65rem] font-semibold leading-snug tracking-[-0.04em] sm:text-[2rem]">
          デジタル認定証
        </h1>
        <p className="mt-8 max-w-md text-[13px] leading-8 text-slate-600 sm:mt-9 sm:text-[14px] sm:leading-8">
          下記の者は、Sleep Wellness Institute Japan の
          <br className="hidden sm:block" />
          所定の課程を修了しここに認定されたことを証します。
        </p>

        <p className="mt-11 text-[1.35rem] font-semibold tracking-[-0.03em] sm:mt-12 sm:text-[1.65rem]">
          {activityName}
        </p>
        <div className="mt-3 h-px w-36 bg-[#d8b36a]/75 sm:w-44" />

        <p className="mt-9 text-[10px] font-semibold tracking-[0.22em] text-slate-500 sm:mt-10">
          認定資格名
        </p>
        <p className="mt-2.5 text-[1.05rem] font-semibold leading-snug tracking-[-0.03em] sm:text-[1.25rem]">
          {certificationName}
        </p>

        <dl className="mt-11 grid w-full max-w-lg gap-3.5 text-left sm:mt-12 sm:grid-cols-2 sm:gap-4">
          <div className="rounded-2xl bg-white/75 px-4 py-3.5">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定番号
            </dt>
            <dd className="mt-1.5 break-all text-[14px] font-semibold leading-6 tracking-[-0.02em]">
              {license.licenseNumber}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/75 px-4 py-3.5">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定レベル
            </dt>
            <dd className="mt-1.5 break-all text-[14px] font-semibold leading-6 tracking-[-0.02em]">
              {license.certificationLevelLabel}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/75 px-4 py-3.5">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              認定日
            </dt>
            <dd className="mt-1.5 text-[14px] font-semibold leading-6 tracking-[-0.02em]">
              {formatJaDate(license.issuedAt)}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/75 px-4 py-3.5">
            <dt className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              有効期限
            </dt>
            <dd className="mt-1.5 text-[14px] font-semibold leading-6 tracking-[-0.02em]">
              {formatJaDate(license.expiresAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-11 flex flex-col items-center gap-3.5 sm:mt-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt="認定証確認用 QR"
            width={140}
            height={140}
            className="rounded-xl border border-slate-200 bg-white p-2.5"
          />
          <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
            確認用 URL
          </p>
          <p className="max-w-md break-all font-mono text-[10px] leading-5 text-slate-600 sm:text-[11px]">
            {verificationUrl}
          </p>
        </div>

        <div className="mt-12 space-y-1.5 text-[12px] leading-7 text-slate-500 sm:mt-14">
          <p>発行者</p>
          <p className="text-[14px] font-semibold tracking-[-0.02em] text-slate-800">
            {LICENSE_ISSUER_ORG}
          </p>
          <p className="pt-2 text-[11px] font-semibold tracking-[0.16em] text-slate-500">
            {LICENSE_ISSUER_FOUNDER_TITLE}
          </p>
          <p className="text-[14px] font-semibold tracking-[-0.02em] text-slate-800">
            {LICENSE_ISSUER_FOUNDER_NAME}
          </p>
        </div>
      </div>
    </article>
  );
}
